"""Comprehensive tests for natural language need parsing (Step 03)."""

from fastapi.testclient import TestClient

from config import get_settings
from main import app
from parsing import need_parser
from parsing.need_parser import NeedParser, parse_need_text
from incidents import summarizer
from schemas import ParseNeedResponse

client = TestClient(app)
settings = get_settings()

VALID_HEADERS = {"X-Internal-Key": settings.INTERNAL_API_KEY}


def test_parser_stubs_import():
    """Verify parsing stubs can be imported cleanly."""
    assert hasattr(need_parser, "NeedParser")
    assert hasattr(need_parser, "parse_need_text")


def test_incident_summarizer_stubs_import():
    """Verify incident summarizer stubs can be imported cleanly."""
    assert hasattr(summarizer, "IncidentSummarizer")
    assert hasattr(summarizer, "draft_incident_summary")


def test_micro_robotics_prompt_extraction():
    """Test standard multi-need prompt extraction (3D printer + SEM microscope)."""
    prompt = (
        "I'm working on a micro-robotics thesis. I need to print small biocompatible "
        "gear components with high precision (around 50 micron layer height), "
        "and also need to inspect surface fractures under high magnification."
    )
    result = parse_need_text(prompt)

    assert isinstance(result, ParseNeedResponse)
    assert result.ok is True
    assert len(result.items) >= 2

    categories = [cat for item in result.items for cat in item.categories]
    assert "3D Printing" in categories
    assert "Microscopy" in categories

    all_caps = [cap for item in result.items for cap in item.capabilities]
    assert "biocompatible" in all_caps or "high-resolution" in all_caps

    # Verify extracted specs
    specs = {}
    for item in result.items:
        if item.specs:
            specs.update(item.specs)
    assert specs.get("layerHeight") == 50


def test_regex_unit_extractions():
    """Test dimensional, power, and mechanical unit regex extractors."""
    parser = NeedParser()

    specs1 = parser.extract_specs("Needs 100 kN tensile force testing with 10mm thickness sample.")
    assert specs1.get("force") == 100
    assert specs1.get("thickness") == 10

    specs2 = parser.extract_specs("60W laser cutter with 800 nm wavelength inspection.")
    assert specs2.get("power") == 60
    assert specs2.get("wavelength") == 800

    specs3 = parser.extract_specs("Spindle speed of 12000 rpm at 220V.")
    assert specs3.get("frequency") == 12000
    assert specs3.get("voltage") == 220


def test_access_mode_detection():
    """Test detection of self-service vs staff operator assistance."""
    parser = NeedParser()

    mode1, staff_ok1 = parser.extract_access_mode("I need an experienced technician or operator to run this sample.")
    assert mode1 == "STAFF_OPERATED"
    assert staff_ok1 is True

    mode2, staff_ok2 = parser.extract_access_mode("I can operate the equipment independently myself.")
    assert mode2 == "IN_PERSON"
    assert staff_ok2 is False

    mode3, staff_ok3 = parser.extract_access_mode("I want to send sample by courier for analysis.")
    assert mode3 == "SEND_SAMPLE"
    assert staff_ok3 is True


def test_duration_and_budget_extraction():
    """Test duration hours and monetary budget parsing."""
    parser = NeedParser()

    duration1 = parser.extract_duration("Need microscope access for 4 hours.")
    assert duration1 == 4

    duration2 = parser.extract_duration("Testing will require 2 days.")
    assert duration2 == 16

    budget1 = parser.extract_budget("We have a research budget of $500.")
    assert budget1 == 500.0

    budget2 = parser.extract_budget("Project budget: 250 USD.")
    assert budget2 == 250.0


def test_location_extraction():
    """Test geographic preference extraction."""
    parser = NeedParser()

    loc = parser.extract_location("Prefer facilities located in Bangalore or nearby.")
    assert loc == "Bangalore"


def test_fallback_on_unrecognized_text():
    """Verify safe fallback response for text without known taxonomy keywords."""
    prompt = "I need specialized custom hardware for quantum annealing analysis."
    result = parse_need_text(prompt)

    assert isinstance(result, ParseNeedResponse)
    assert result.ok is True
    assert len(result.items) >= 1
    assert result.items[0].categories == ["General Laboratory"]
    assert result.confidence >= 0.5


def test_endpoint_parse_need_success():
    """HTTP integration test for POST /ai/parse-need with valid authorization."""
    payload = {
        "text": "Need FDM 3D printer for 6 hours in Bangalore with $200 budget."
    }
    response = client.post("/ai/parse-need", json=payload, headers=VALID_HEADERS)
    assert response.status_code == 200

    data = response.json()
    assert data["ok"] is True
    assert len(data["items"]) >= 1
    assert data["durationHours"] == 6
    assert data["budget"] == 200.0
    assert data["locationPreference"] == "Bangalore"


def test_endpoint_parse_need_unauthenticated():
    """HTTP integration test: Missing or invalid X-Internal-Key returns 403."""
    payload = {"text": "Need 3D printer"}
    response = client.post("/ai/parse-need", json=payload)
    assert response.status_code == 403


def test_endpoint_parse_need_validation_error():
    """HTTP integration test: Text shorter than min_length=5 returns 422."""
    payload = {"text": "hi"}
    response = client.post("/ai/parse-need", json=payload, headers=VALID_HEADERS)
    assert response.status_code == 422
