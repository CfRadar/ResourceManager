"""Unit tests for Pydantic V2 schemas and contracts."""

import pytest
from pydantic import ValidationError

from schemas import (
    AlternativesRequest,
    AlternativesResponse,
    HealthResponse,
    IncidentSummaryRequest,
    IncidentSummaryResponse,
    MatchNeedRequest,
    MatchNeedResponse,
    MatchType,
    ParsedItem,
    ParseNeedRequest,
    ParseNeedResponse,
    PolicySummaryResponse,
    ReindexResponse,
    ResourceMatch,
)


def test_health_response():
    """Verify HealthResponse contract retains expected keys."""
    res = HealthResponse()
    data = res.model_dump()
    assert data["ok"] is True
    assert data["service"] == "UviAge"
    assert data["model_loaded"] is False
    assert data["database"] == "not_configured"


def test_parse_need_request_validation():
    """Verify ParseNeedRequest requires at least 5 characters."""
    valid = ParseNeedRequest(text="Need a 3D printer for prototyping")
    assert valid.text == "Need a 3D printer for prototyping"

    with pytest.raises(ValidationError):
        ParseNeedRequest(text="3D")


def test_parse_need_response_confidence_bounds():
    """Verify confidence must be strictly between 0.0 and 1.0."""
    item = ParsedItem(
        need="Laser Cutter",
        categories=["fabrication"],
        capabilities=["CO2", "100W"],
    )
    res = ParseNeedResponse(
        items=[item],
        confidence=0.85,
        access_mode_preference="IN_PERSON",
        duration_hours=4,
    )
    assert res.confidence == 0.85
    assert len(res.items) == 1

    # Greater than 1.0 must fail
    with pytest.raises(ValidationError):
        ParseNeedResponse(items=[], confidence=1.5)

    # Less than 0.0 must fail
    with pytest.raises(ValidationError):
        ParseNeedResponse(items=[], confidence=-0.1)


def test_match_type_enum():
    """Verify MatchType accepts only defined enum values."""
    assert MatchType.AVAILABLE_LISTING == "AVAILABLE_LISTING"
    assert MatchType.POTENTIAL_NEEDS_VERIFICATION == "POTENTIAL_NEEDS_VERIFICATION"
    assert MatchType.NOT_CURRENTLY_AVAILABLE == "NOT_CURRENTLY_AVAILABLE"

    match = ResourceMatch(
        for_need="3D printer",
        resource_id="res_101",
        score=0.92,
        match_type=MatchType.AVAILABLE_LISTING,
        reasons=["Direct capability match on FDM"],
    )
    assert match.match_type == MatchType.AVAILABLE_LISTING

    with pytest.raises(ValidationError):
        ResourceMatch(
            for_need="3D printer",
            resource_id="res_101",
            score=0.92,
            match_type="INVALID_TYPE",  # type: ignore
        )


def test_resource_match_score_bounds():
    """Verify ResourceMatch score must be between 0.0 and 1.0."""
    with pytest.raises(ValidationError):
        ResourceMatch(
            for_need="3D printer",
            resource_id="res_101",
            score=1.05,
            match_type=MatchType.AVAILABLE_LISTING,
        )


def test_match_need_request_camel_case_input():
    """Verify MatchNeedRequest parses both snake_case and camelCase payloads."""
    req_camel = MatchNeedRequest.model_validate(
        {
            "text": "CNC milling machine",
            "visibleResourceIds": ["res_001", "res_002"],
            "userContext": {"userGroup": "RESEARCHER"},
        }
    )
    assert req_camel.visible_resource_ids == ["res_001", "res_002"]
    assert req_camel.user_context == {"userGroup": "RESEARCHER"}

    req_snake = MatchNeedRequest(
        text="CNC milling machine",
        visible_resource_ids=["res_003"],
    )
    assert req_snake.visible_resource_ids == ["res_003"]


def test_match_need_response_disclaimer():
    """Verify standard disclaimer is included in MatchNeedResponse."""
    res = MatchNeedResponse(
        parsed_need={"items": []},
        matches=[],
        source="AI_EMBEDDING",
    )
    assert (
        res.disclaimer
        == "Suggestions only. Eligibility and approval are decided separately by facility staff."
    )
    assert res.source == "AI_EMBEDDING"

    # Test camelCase serialization
    dumped = res.model_dump(by_alias=True)
    assert "parsedNeed" in dumped
    assert "unmatchedNeeds" in dumped


def test_incident_summary_contracts():
    """Verify IncidentSummaryRequest and IncidentSummaryResponse contracts."""
    req = IncidentSummaryRequest.model_validate({"incidentId": "inc_901"})
    assert req.incident_id == "inc_901"

    res = IncidentSummaryResponse(
        summary="Equipment showed nozzle obstruction during check-out.",
        facts_from_records=["Check-in clean report at 09:00", "Nozzle fault flagged at 14:00"],
        unverified_claims=["User claims spool was wet"],
        missing_info=["Maintenance log entry for prior week"],
        sources=["report_001", "photo_002"],
    )
    assert res.ok is True
    assert (
        res.disclaimer
        == "Draft summary for coordinator review. Does not assign fault or liability."
    )
    dumped = res.model_dump(by_alias=True)
    assert "factsFromRecords" in dumped
    assert "unverifiedClaims" in dumped
    assert "missingInfo" in dumped


def test_alternatives_and_policy_schemas():
    """Verify alternatives, policy summary, and reindex schemas."""
    alt = AlternativesResponse(
        resource_id="res_01",
        alternatives=[{"id": "res_02", "name": "Polymer 3D Printer"}],
        nearby_slots=[{"start": "2026-10-30T10:00:00Z"}],
    )
    dumped_alt = alt.model_dump(by_alias=True)
    assert "nearbySlots" in dumped_alt

    policy = PolicySummaryResponse(
        resource_id="res_01",
        summary_bullets=["Must complete induction", "Max 4 hours per slot"],
    )
    dumped_pol = policy.model_dump(by_alias=True)
    assert "summaryBullets" in dumped_pol

    reindex = ReindexResponse(indexed_count=42)
    dumped_reindex = reindex.model_dump(by_alias=True)
    assert dumped_reindex["indexedCount"] == 42
    assert dumped_reindex["ok"] is True

