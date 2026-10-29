"""Deterministic keyword and BM25 fallback search engine.

Provides zero-token, offline fallback matching when neural embeddings or
cloud inference are unavailable or timeout (>4s), per Step 06 blueprint and Spec §6.3.
Equipped with laboratory domain synonym dictionary and pure-Python BM25Okapi implementation.
"""

import math
import re
from typing import Any, Dict, List, Optional, Set, Tuple

# Domain-specific engineering and scientific equivalence mapping
SYNONYM_DICT: Dict[str, List[str]] = {
    # Fabrication & Additive / Subtractive
    "3d print": ["additive manufacturing", "fdm", "sla", "sls", "stereolithography", "rapid prototyping", "3d printing"],
    "3d printer": ["additive manufacturing", "fdm", "sla", "sls", "stereolithography", "rapid prototyping", "3d printing"],
    "additive": ["3d print", "3d printing", "fdm", "sla", "rapid prototyping"],
    "laser": ["laser cutter", "laser cutting", "engraver", "co2 laser", "fiber laser"],
    "laser cutter": ["co2 laser", "laser cutting", "engraver", "fabrication"],
    "cnc": ["milling", "router", "lathe", "subtractive manufacturing", "machining", "vertical mill"],
    "machining": ["cnc", "milling", "lathe", "router", "subtractive"],
    "mill": ["cnc", "milling machine", "vertical mill", "machining"],

    # Characterization & Microscopy
    "sem": ["scanning electron microscope", "electron microscopy", "edx", "high magnification", "microscopy"],
    "tem": ["transmission electron microscope", "electron microscopy", "microscopy"],
    "afm": ["atomic force microscope", "surface topography", "nanoscale", "microscopy"],
    "microscope": ["microscopy", "optical microscope", "sem", "tem", "confocal", "magnification"],
    "microscopy": ["microscope", "optical", "sem", "tem", "imaging", "magnification"],
    "scope": ["oscilloscope", "microscope", "digital storage oscilloscope"],
    "oscilloscope": ["scope", "waveform analysis", "signal integrity", "digital oscilloscope"],
    "spectrometer": ["ftir", "raman", "uv-vis", "mass spec", "gc-ms", "spectroscopy"],
    "spectroscopy": ["spectrometer", "ftir", "raman", "uv-vis", "mass spectrometry"],

    # Electronics & Testing
    "soldering": ["surface mount", "rework station", "smd", "through-hole", "soldering station"],
    "electronics": ["oscilloscope", "soldering", "multimeter", "wavegen", "function generator", "power supply"],
    "multimeter": ["dmm", "voltmeter", "current measurement", "resistance"],

    # Biological, Thermal & Cleanroom
    "autoclave": ["sterilization", "steam sterilizer", "biohazard"],
    "cleanroom": ["iso class", "hepa", "particulate", "laminar flow"],
    "thermal": ["dsc", "tga", "calorimeter", "furnace", "environmental chamber"],
}

WORD_SPLIT_REGEX = re.compile(r"[^\w\s-]")


def tokenize(text: str, expand_synonyms: bool = True) -> List[str]:
    """Tokenize and normalize text, expanding domain synonyms where applicable."""
    cleaned = WORD_SPLIT_REGEX.sub(" ", text.lower()).replace("-", " ")
    tokens = [w for w in cleaned.split() if len(w) > 1]

    if not expand_synonyms:
        return tokens

    expanded: List[str] = list(tokens)
    lower_text = text.lower()

    # Match multi-word synonym keys first
    for key, syns in SYNONYM_DICT.items():
        if " " in key and key in lower_text:
            for s in syns:
                expanded.extend(s.split())

    # Match single-word synonym keys
    for tok in tokens:
        if tok in SYNONYM_DICT:
            for s in SYNONYM_DICT[tok]:
                expanded.extend(s.split())

    return expanded


class BM25FallbackMatcher:
    """Zero-dependency BM25Okapi deterministic search engine for laboratory equipment."""

    def __init__(self, k1: float = 1.5, b: float = 0.75) -> None:
        self.k1 = k1
        self.b = b
        self.corpus_ids: List[str] = []
        self.doc_lengths: List[int] = []
        self.avg_doc_len: float = 0.0
        self.doc_freqs: Dict[str, int] = {}
        self.term_freqs: List[Dict[str, int]] = []
        self.idf: Dict[str, float] = {}
        self.total_docs: int = 0

    def index(self, resources: List[Dict[str, Any]]) -> int:
        """Tokenize resources and compute BM25 document frequencies and IDFs."""
        self.corpus_ids = [r["id"] for r in resources if "id" in r]
        self.total_docs = len(self.corpus_ids)
        self.doc_lengths = []
        self.doc_freqs = {}
        self.term_freqs = []
        self.idf = {}

        if self.total_docs == 0:
            self.avg_doc_len = 0.0
            return 0

        total_tokens = 0
        for r in resources:
            if "id" not in r:
                continue
            # Build representative text corpus
            name = r.get("name") or ""
            cat = r.get("category") or ""
            desc = r.get("description") or ""
            caps = " ".join(r.get("capabilities") or [])
            specs = " ".join([f"{k} {v}" for k, v in (r.get("specs") or {}).items()])
            combined = f"{name} {cat} {desc} {caps} {specs}"

            tokens = tokenize(combined, expand_synonyms=True)
            doc_len = len(tokens)
            self.doc_lengths.append(doc_len)
            total_tokens += doc_len

            # Calculate term frequencies for this doc
            tf: Dict[str, int] = {}
            seen_in_doc: Set[str] = set()
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
                seen_in_doc.add(t)
            self.term_freqs.append(tf)

            for term in seen_in_doc:
                self.doc_freqs[term] = self.doc_freqs.get(term, 0) + 1

        self.avg_doc_len = total_tokens / self.total_docs if self.total_docs > 0 else 0.0

        # Calculate standard Okapi BM25 inverse document frequencies
        for term, freq in self.doc_freqs.items():
            self.idf[term] = math.log((self.total_docs - freq + 0.5) / (freq + 0.5) + 1.0)

        return self.total_docs

    def search(self, query: str, top_k: int = 10) -> List[Tuple[str, float]]:
        """Score all indexed resources against query tokens using BM25Okapi."""
        if self.total_docs == 0:
            return []

        query_tokens = tokenize(query, expand_synonyms=True)
        if not query_tokens:
            return []

        scores: List[float] = [0.0] * self.total_docs

        for q in query_tokens:
            if q not in self.idf:
                continue
            q_idf = self.idf[q]

            for idx in range(self.total_docs):
                tf = self.term_freqs[idx].get(q, 0)
                if tf <= 0:
                    continue
                doc_len = self.doc_lengths[idx]
                denom = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / self.avg_doc_len))
                term_score = q_idf * ((tf * (self.k1 + 1.0)) / denom)
                scores[idx] += term_score

        # Pair scores with resource IDs and filter out zero scores
        candidates = [
            (self.corpus_ids[i], scores[i])
            for i in range(self.total_docs)
            if scores[i] > 0.0
        ]

        if not candidates:
            return []

        # Normalize scores to 0.0 - 1.0 range based on top score
        candidates.sort(key=lambda x: x[1], reverse=True)
        max_score = candidates[0][1]
        normalized = [
            (cid, min(1.0, round(score / max_score, 4)) if max_score > 0 else 0.5)
            for cid, score in candidates[:top_k]
        ]
        return normalized


# Global singleton instance for fallback matching
fallback_matcher = BM25FallbackMatcher()


def keyword_search(
    query: str,
    corpus: List[Dict[str, Any]],
    top_k: int = 5,
) -> List[Tuple[str, float]]:
    """Ad-hoc keyword search over a provided corpus."""
    matcher = BM25FallbackMatcher()
    matcher.index(corpus)
    return matcher.search(query, top_k=top_k)
