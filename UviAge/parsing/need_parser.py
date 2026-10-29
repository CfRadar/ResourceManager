"""Structured natural language research need extractor.

Spec §6.1 & Step 03: Converts unstructured research text into structured equipment
requirements conforming to ParseNeedResponse.
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple

from schemas import ParsedItem, ParseNeedResponse

# Standard laboratory categories taxonomy
TAXONOMY_CATEGORIES = {
    "3D Printing": [
        "3d print", "3d printer", "printing", "to print", "print small", "print components",
        "fdm", "sla", "sls", "dlp", "additive manufacturing", "additive",
        "filament", "pla", "petg", "resin", "stereolithography", "layer height"
    ],
    "Laser Cutting": [
        "laser cut", "laser cutter", "laser engraving", "co2 laser", "fiber laser",
        "acrylic", "engrave", "laser"
    ],
    "Microscopy": [
        "microscop", "sem", "tem", "afm", "electron microscope", "magnification",
        "surface fracture", "imaging", "optical microscope", "confocal"
    ],
    "CNC Machining": [
        "cnc", "milling", "lathe", "machining", "5-axis", "3-axis", "subtractive", "router"
    ],
    "Spectroscopy": [
        "spectroscop", "ftir", "raman", "uv-vis", "mass spec", "nmr", "xrd"
    ],
    "Thermal Analysis": [
        "dsc", "tga", "calorimet", "thermal", "dta", "furnace", "autoclave"
    ],
    "Electronics": [
        "oscilloscope", "soldering", "pcb", "multimeter", "circuit", "function generator",
        "microcontroller", "cleanroom"
    ],
    "Materials Testing": [
        "tensile", "compression", "hardness", "universal testing machine", "fatigue",
        "instron", "rheometer", "fracture testing"
    ],
    "Meeting Space": [
        "conference room", "meeting room", "projector", "whiteboard", "presentation"
    ],
}

# Technical capability mapping
CAPABILITY_PATTERNS = {
    "biocompatible": [r"\bbiocompatib\w*"],
    "high-resolution": [r"\bhigh[- ]resolution\b", r"\bhigh precision\b", r"\bprecision\b", r"\bmicron\b", r"\bµm\b", r"\bnm\b"],
    "high-magnification": [r"\bhigh[- ]magnification\b", r"\bmagnification\b", r"\b\d+x\b"],
    "SEM": [r"\bsem\b", r"\bscanning electron\b"],
    "TEM": [r"\btem\b", r"\btransmission electron\b"],
    "FDM": [r"\bfdm\b", r"\bfused deposition\b"],
    "SLA": [r"\bsla\b", r"\bstereolithography\b"],
    "SLS": [r"\bsls\b", r"\bselective laser sintering\b"],
    "CO2_LASER": [r"\bco2 laser\b", r"\blaser cutter\b"],
    "5-axis": [r"\b5[- ]axis\b"],
    "3-axis": [r"\b3[- ]axis\b"],
    "PLA": [r"\bpla\b"],
    "PETG": [r"\bpetg\b"],
    "vacuum": [r"\bvacuum\b"],
    "cleanroom": [r"\bcleanroom\b", r"\bclean room\b"],
    "cryogenic": [r"\bcryo\w*\b", r"\bliquid nitrogen\b"],
}

# Dimensional and technical regex patterns
REGEX_PATTERNS = {
    "layerHeight": r"(\d+(?:\.\d+)?)\s*(?:micron|um|µm)\s*(?:layer|layer height)?",
    "wavelength": r"(\d+(?:\.\d+)?)\s*(?:nm)\b",
    "power": r"(\d+(?:\.\d+)?)\s*(?:W|kW|watt)\b",
    "force": r"(\d+(?:\.\d+)?)\s*(?:kN|N|MPa)\b",
    "voltage": r"(\d+(?:\.\d+)?)\s*(?:kV|V|mV)\b",
    "frequency": r"(\d+(?:\.\d+)?)\s*(?:rpm|Hz|kHz|MHz|GHz)\b",
    "temperature": r"(\d+(?:\.\d+)?)\s*(?:°C|deg C|C|K)\b",
    "thickness": r"(\d+(?:\.\d+)?)\s*(?:mm|cm)\s*(?:thick|thickness)?",
}


class NeedParser:
    """Extracts structured equipment, capabilities, and constraints from freeform text."""

    def __init__(self) -> None:
        pass

    def extract_specs(self, text: str) -> Dict[str, Any]:
        """Extracts numerical technical specifications matching common physical units."""
        specs: Dict[str, Any] = {}
        for spec_key, pattern in REGEX_PATTERNS.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                val_str = match.group(1)
                try:
                    specs[spec_key] = float(val_str) if "." in val_str else int(val_str)
                except ValueError:
                    specs[spec_key] = val_str
        return specs

    def extract_capabilities(self, text: str) -> List[str]:
        """Identifies specific technical capability tags from text."""
        detected: Set[str] = set()
        for cap_name, patterns in CAPABILITY_PATTERNS.items():
            for pat in patterns:
                if re.search(pat, text, re.IGNORECASE):
                    detected.add(cap_name)
                    break
        return sorted(list(detected))

    def extract_categories(self, text: str) -> List[str]:
        """Matches laboratory taxonomy categories against text."""
        text_lower = text.lower()
        matched: List[str] = []
        for cat, keywords in TAXONOMY_CATEGORIES.items():
            if any(kw in text_lower for kw in keywords):
                matched.append(cat)
        return matched

    def extract_access_mode(self, text: str) -> Tuple[Optional[str], bool]:
        """Detects access mode preferences and whether operator service is acceptable."""
        text_lower = text.lower()

        if any(term in text_lower for term in ["send sample", "mail sample", "ship sample"]):
            return "SEND_SAMPLE", True

        if any(term in text_lower for term in ["operator", "technician", "staff service", "do it for me", "assisted"]):
            return "STAFF_OPERATED", True

        if any(term in text_lower for term in ["independent", "myself", "hands-on", "self-operated", "unsupervised"]):
            return "IN_PERSON", False

        return "IN_PERSON", False

    def extract_duration(self, text: str) -> Optional[int]:
        """Extracts requested duration in hours."""
        hour_match = re.search(r"(\d+)\s*(?:hour|hours|hr|hrs)\b", text, re.IGNORECASE)
        if hour_match:
            return int(hour_match.group(1))

        day_match = re.search(r"(\d+)\s*(?:day|days)\b", text, re.IGNORECASE)
        if day_match:
            return int(day_match.group(1)) * 8

        if re.search(r"\bhalf[- ]day\b", text, re.IGNORECASE):
            return 4

        return None

    def extract_budget(self, text: str) -> Optional[float]:
        """Extracts stated monetary budget if present."""
        budget_match = re.search(
            r"(?:\$|usd\s*|budget(?:\s*of|\s*:)?\s*\$?\s*)(\d+(?:\.\d+)?)",
            text,
            re.IGNORECASE,
        )
        if budget_match:
            try:
                return float(budget_match.group(1))
            except ValueError:
                return None
        return None

    def extract_location(self, text: str) -> Optional[str]:
        """Extracts geographic location preferences if explicitly named."""
        for loc in ["Bangalore", "Hyderabad", "Mumbai", "Delhi", "Pune", "Chennai"]:
            if re.search(rf"\b{loc}\b", text, re.IGNORECASE):
                return loc
        return None

    def parse(self, text: str) -> ParseNeedResponse:
        """Parses natural language research need into structured ParseNeedResponse."""
        if not text or len(text.strip()) < 3:
            return ParseNeedResponse(
                ok=True,
                items=[],
                access_mode_preference=None,
                duration_hours=None,
                confidence=0.1,
            )

        categories = self.extract_categories(text)
        capabilities = self.extract_capabilities(text)
        specs = self.extract_specs(text)
        access_mode, staff_ok = self.extract_access_mode(text)
        duration = self.extract_duration(text)
        budget = self.extract_budget(text)
        location = self.extract_location(text)

        items: List[ParsedItem] = []

        if categories:
            for cat in categories:
                cat_caps = [c for c in capabilities if c in ["biocompatible", "high-resolution"] or c in TAXONOMY_CATEGORIES.get(cat, []) or (cat == "3D Printing" and c in ["FDM", "SLA", "SLS", "PLA", "PETG"]) or (cat == "Microscopy" and c in ["SEM", "TEM", "high-magnification"]) or (cat == "Laser Cutting" and c in ["CO2_LASER"])]
                if not cat_caps:
                    cat_caps = capabilities

                items.append(
                    ParsedItem(
                        need=f"Need for {cat} equipment",
                        categories=[cat],
                        capabilities=cat_caps,
                        specs=specs if specs else None,
                    )
                )
        else:
            items.append(
                ParsedItem(
                    need=text.strip()[:80],
                    categories=["General Laboratory"],
                    capabilities=capabilities,
                    specs=specs if specs else None,
                )
            )

        density = len(categories) * 0.25 + len(capabilities) * 0.15 + (0.2 if specs else 0.0)
        confidence = min(0.95, max(0.50, round(density, 2)))

        return ParseNeedResponse(
            ok=True,
            items=items,
            access_mode_preference=access_mode,
            duration_hours=duration,
            location_preference=location,
            budget=budget,
            staff_service_ok=staff_ok,
            confidence=confidence,
        )


def parse_need_text(text: str) -> ParseNeedResponse:
    """Convenience functional wrapper for natural language need parsing."""
    parser = NeedParser()
    return parser.parse(text)
