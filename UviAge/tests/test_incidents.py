"""Comprehensive tests for incident dossier summarization engine and endpoint.

Spec §4.16 & §6.5 (Step 07):
- Objective fact extraction from booking and condition reports
- Unverified claim extraction from party statements
- Source attribution tracking
- Neutrality assertion: zero fault/liability terms
- HTTP endpoint integration (200, 403, 404, 422)
"""

import pytest
from httpx import ASGITransport, AsyncClient

from config import get_settings
from incidents.summarizer import (
    FORBIDDEN_FAULT_TERMS,
    IncidentSummarizer,
    draft_incident_summary,
    sanitize_neutral,
)
from main import app
import repository

settings = get_settings()


SAMPLE_INCIDENT_CONTEXT = {
    "id": "inc_001",
    "booking_id": "bk_501",
    "reporter_id": "usr_mgr_01",
    "type": "DAMAGE",
    "description": "Extruder nozzle clogged and hotend heater cartridge wire frayed during evening booking session.",
    "severity_by_reporter": "MEDIUM",
    "status": "REPORTED",
    "occurred_at": "2026-10-28T19:30:00Z",
    "booking": {
        "id": "bk_501",
        "resource_id": "res_001",
        "resource_name": "Prusa i3 MK3S+ 3D Printer",
        "user_id": "usr_req_02",
        "start_at": "2026-10-28T17:00:00Z",
        "end_at": "2026-10-28T21:00:00Z",
        "status": "CHECKED_OUT",
    },
    "condition_reports": [
        {
            "id": "cr_001",
            "kind": "BEFORE",
            "rating": 5,
            "notes": "Machine clean, nozzle clear, bed cleaned with IPA. Pre-flight self-test passed.",
            "accessories": [
                {"name": "Smooth PEI sheet", "quantity": 1, "condition": "EXCELLENT"},
                {"name": "Nozzle wrench", "quantity": 1, "condition": "GOOD"},
            ],
            "photo_ids": ["photo_pre_001"],
            "geo_status": "WITHIN",
            "submitted_at": "2026-10-28T16:55:00Z",
        },
        {
            "id": "cr_002",
            "kind": "AFTER",
            "rating": 2,
            "notes": "Filament jammed in PTFE tube. User reports heating error occurred at layer 42.",
            "accessories": [
                {"name": "Smooth PEI sheet", "quantity": 1, "condition": "SCRATCHED"},
                {"name": "Nozzle wrench", "quantity": 1, "condition": "GOOD"},
            ],
            "photo_ids": ["photo_post_001", "photo_post_002"],
            "geo_status": "WITHIN",
            "submitted_at": "2026-10-28T20:45:00Z",
        },
    ],
    "notes": [
        {
            "id": "note_01",
            "author": "usr_mgr_01",
            "role": "MANAGER",
            "text": "Inspected hotend block. Filament appears to be third-party carbon fiber composite not approved on default policy.",
            "created_at": "2026-10-28T21:10:00Z",
        },
        {
            "id": "note_02",
            "author": "usr_req_02",
            "role": "REQUESTER",
            "text": "Filament was standard PETG from institutional maker store. Temperature was set to 230C as per instructions.",
            "created_at": "2026-10-28T21:40:00Z",
        },
    ],
}


def test_summarizer_unit_logic():
    """Verify objective dossier synthesis extracts facts, claims, and sources without bias."""
    res = draft_incident_summary(SAMPLE_INCIDENT_CONTEXT)

    assert res["ok"] is True
    assert "summary" in res
    assert "factsFromRecords" in res
    assert "unverifiedClaims" in res
    assert "sources" in res
    assert "disclaimer" in res

    # 1. Facts from Records
    facts = res["factsFromRecords"]
    assert any("Prusa i3 MK3S+" in f for f in facts)
    assert any("rated 5/5" in f for f in facts)
    assert any("rated 2/5" in f for f in facts)
    assert any("Smooth PEI sheet" in f and "SCRATCHED" in f for f in facts)

    # 2. Unverified Claims
    claims = res["unverifiedClaims"]
    assert any("usr_mgr_01" in c for c in claims)
    assert any("usr_req_02" in c for c in claims)
    assert any("PETG" in c for c in claims)

    # 3. Source Attribution
    sources = set(res["sources"])
    assert "inc_001" in sources
    assert "bk_501" in sources
    assert "cr_001" in sources
    assert "cr_002" in sources
    assert "photo_post_001" in sources

    # 4. Strict Neutrality / No Blame Rule (Spec §6.5)
    summary_text = res["summary"]
    match = FORBIDDEN_FAULT_TERMS.search(summary_text)
    assert match is None, f"Forbidden fault term found in summary: {match.group(0)}"


def test_sanitize_neutral_removes_fault_terms():
    """Verify sanitize_neutral neutralizes accusations and legal liability language."""
    accusatory_text = "The user was completely negligent, careless, and at fault for the broken tool."
    sanitized = sanitize_neutral(accusatory_text)
    assert "negligent" not in sanitized.lower()
    assert "careless" not in sanitized.lower()
    assert "at fault" not in sanitized.lower()


def test_missing_info_gap_detection():
    """Verify missing condition reports and photos are flagged as evidentiary gaps."""
    # Context with no AFTER report
    incomplete_context = {
        "id": "inc_gap_01",
        "booking": {"resource_name": "Haas CNC Mill"},
        "condition_reports": [
            {"kind": "BEFORE", "rating": 5, "photo_ids": []}
        ],
        "notes": [],
    }
    summarizer = IncidentSummarizer()
    res = summarizer.summarize(incomplete_context)
    missing = res["missingInfo"]
    assert any("Post-use (AFTER) condition report" in m for m in missing)


# ==============================================================================
# HTTP Endpoint Integration Tests
# ==============================================================================


@pytest.mark.anyio
async def test_http_incident_summary_success():
    """POST /ai/incident-summary returns 200 and structured draft for existing incident."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post(
            "/ai/incident-summary",
            json={"incidentId": "inc_001"},
            headers={"X-Internal-Key": settings.INTERNAL_API_KEY},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert len(data["factsFromRecords"]) > 0
        assert len(data["unverifiedClaims"]) > 0
        assert len(data["sources"]) > 0
        assert "Does not assign fault or liability" in data["disclaimer"]


@pytest.mark.anyio
async def test_http_incident_summary_inline_payload():
    """POST /ai/incident-summary accepts inline incident and notes objects."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        payload = {
            "incident": {
                "id": "inc_inline_99",
                "type": "CONTAMINATION",
                "severity_by_reporter": "HIGH",
                "occurred_at": "2026-10-29T10:00:00Z",
                "description": "Chemical residue found in ultrasonic bath.",
            },
            "notes": [
                {
                    "author": "usr_coord_01",
                    "role": "COORDINATOR",
                    "text": "Solvent odor detected during morning walkthrough.",
                }
            ],
        }
        res = await client.post(
            "/ai/incident-summary",
            json=payload,
            headers={"X-Internal-Key": settings.INTERNAL_API_KEY},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert "CONTAMINATION" in data["summary"]
        assert any("usr_coord_01" in c for c in data["unverifiedClaims"])


@pytest.mark.anyio
async def test_http_incident_summary_404_not_found():
    """POST /ai/incident-summary returns 404 for unknown incident ID."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post(
            "/ai/incident-summary",
            json={"incidentId": "inc_nonexistent_999"},
            headers={"X-Internal-Key": settings.INTERNAL_API_KEY},
        )
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()


@pytest.mark.anyio
async def test_http_incident_summary_auth_and_validation():
    """POST /ai/incident-summary enforces authentication and schema validation."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Missing header -> 403 Forbidden
        res_no_auth = await client.post(
            "/ai/incident-summary",
            json={"incidentId": "inc_001"},
        )
        assert res_no_auth.status_code == 403

        # Missing both incidentId and incident object -> 422 Unprocessable Entity
        res_bad_body = await client.post(
            "/ai/incident-summary",
            json={},
            headers={"X-Internal-Key": settings.INTERNAL_API_KEY},
        )
        assert res_bad_body.status_code == 422

