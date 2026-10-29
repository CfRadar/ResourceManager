"""Comprehensive unit and integration tests for AI matching, vector indexing, and fallback.

Verifies Spec §4.24, §6.2, §6.3:
- Strict visibleResourceIds security boundary enforcement
- Domain synonym BM25 fallback search
- Explainable, non-hallucinated reason and caveat generation
- MatchType classification
- Endpoints POST /ai/match-need and POST /ai/reindex
"""

import pytest
from httpx import ASGITransport, AsyncClient

from config import get_settings
from main import app
from matching.embedder import VectorIndexer, build_searchable_document, is_ready
from matching.fallback import BM25FallbackMatcher, tokenize
from matching.rerank import build_reasons, determine_match_type, filter_by_visibility, rerank_candidates
import repository
from schemas import MatchType

settings = get_settings()


SAMPLE_FIXTURE_RESOURCES = [
    {
        "id": "res_001",
        "name": "Prusa i3 MK3S+ 3D Printer",
        "category": "fabrication",
        "description": "High-precision FDM desktop 3D printer with heated bed and auto-leveling probe.",
        "specs": {
            "technology": "FDM",
            "buildVolume": "250x210x210mm",
            "layerResolution": "0.05-0.35mm",
        },
        "capabilities": ["FDM", "PLA", "PETG", "3D-printing", "rapid-prototyping"],
        "visibility": "PUBLIC",
        "risk_level": "LOW",
        "status": "ACTIVE",
        "policy_data": {
            "requiredTrainings": ["train_3d_basics"],
            "requiresStaffSupervision": False,
        },
    },
    {
        "id": "res_002",
        "name": "Epilog Fusion Pro 48 CO2 Laser Cutter",
        "category": "fabrication",
        "description": "120W CO2 laser cutting and engraving machine for acrylic and sheet materials.",
        "specs": {
            "laserPower": "120W",
            "bedSize": "1219x914mm",
        },
        "capabilities": ["laser-cutting", "engraving", "acrylic", "rapid-prototyping"],
        "visibility": "PUBLIC",
        "risk_level": "MEDIUM",
        "status": "ACTIVE",
        "policy_data": {
            "requiredTrainings": ["train_laser_safety"],
            "requiresStaffSupervision": True,
        },
    },
    {
        "id": "res_003",
        "name": "Keysight DSOX1204G Digital Storage Oscilloscope",
        "category": "test-equipment",
        "description": "4-channel 200 MHz digital oscilloscope with built-in WaveGen.",
        "specs": {
            "bandwidth": "200MHz",
            "channels": 4,
        },
        "capabilities": ["oscilloscope", "waveform-analysis", "signal-integrity", "electronics"],
        "visibility": "PUBLIC",
        "risk_level": "LOW",
        "status": "ACTIVE",
        "policy_data": {
            "requiredTrainings": [],
            "requiresStaffSupervision": False,
        },
    },
    {
        "id": "res_inactive",
        "name": "Decommissioned Microscope",
        "category": "microscopy",
        "status": "INACTIVE",
        "capabilities": ["microscope"],
        "policy_data": {},
    },
]


def test_searchable_document_builder():
    """Verify Searchable Document concatenates fields properly per Spec §6.3."""
    doc = build_searchable_document(SAMPLE_FIXTURE_RESOURCES[0])
    assert "Prusa i3" in doc
    assert "fabrication" in doc
    assert "FDM" in doc
    assert "250x210x210mm" in doc


def test_bm25_synonym_tokenization():
    """Verify laboratory domain synonyms are expanded correctly."""
    tokens = tokenize("Need a scope for electronic signal integrity")
    assert "scope" in tokens
    assert "oscilloscope" in tokens

    additive_tokens = tokenize("Looking for additive rapid prototyping")
    assert "additive" in additive_tokens
    assert "fdm" in additive_tokens


def test_bm25_fallback_search():
    """Verify BM25 searches accurately match resources with domain queries."""
    matcher = BM25FallbackMatcher()
    count = matcher.index(SAMPLE_FIXTURE_RESOURCES)
    assert count == 4

    # Test "additive manufacturing" finds Prusa 3D printer
    results = matcher.search("additive manufacturing and rapid prototyping")
    assert len(results) > 0
    top_id, top_score = results[0]
    assert top_id == "res_001"
    assert top_score > 0.0

    # Test "laser" finds Epilog Laser Cutter
    results_laser = matcher.search("cut acrylic sheet with CO2 laser")
    assert len(results_laser) > 0
    assert results_laser[0][0] == "res_002"

    # Test "scope" finds Keysight Oscilloscope
    results_scope = matcher.search("oscilloscope channel measurement")
    assert len(results_scope) > 0
    assert results_scope[0][0] == "res_003"


def test_strict_visibility_boundary_filter():
    """Security Test (Spec §6.2): Intersect candidate matches with visibleResourceIds.

    Never leak or return resource IDs not provided by Express.
    """
    candidates = [("res_001", 0.95), ("res_002", 0.85), ("res_003", 0.75)]
    visible_set = {"res_002"}

    filtered = filter_by_visibility(candidates, visible_set)
    assert len(filtered) == 1
    assert filtered[0][0] == "res_002"

    # Empty visible set must return empty list
    empty_filtered = filter_by_visibility(candidates, set())
    assert empty_filtered == []


def test_explainable_reasons_and_caveats():
    """Verify match reasons are derived directly from actual attributes without hallucination."""
    res_prusa = SAMPLE_FIXTURE_RESOURCES[0]
    reasons, matched_fields, caveats = build_reasons(
        resource=res_prusa,
        need_categories=["3D Printing", "Fabrication"],
        need_capabilities=["FDM", "PLA"],
        need_specs={"technology": "FDM"},
    )

    assert "category" in matched_fields
    assert "capabilities" in matched_fields
    assert any("Category match" in r for r in reasons)
    assert any("Matching capabilities" in r for r in reasons)
    # Check training requirement caveat
    assert any("Prerequisite training required" in c for c in caveats)

    # Check staff supervision caveat for laser
    res_laser = SAMPLE_FIXTURE_RESOURCES[1]
    _, _, laser_caveats = build_reasons(
        resource=res_laser,
        need_categories=["Laser Cutting"],
        need_capabilities=["laser-cutting"],
    )
    assert any("Staff supervision required" in c for c in laser_caveats)


def test_match_type_classification():
    """Verify MatchType distinguishes active direct listings, staff-verified, and inactive."""
    # Active, unsupervised, high score -> AVAILABLE_LISTING
    mt_avail = determine_match_type(SAMPLE_FIXTURE_RESOURCES[0], score=0.88)
    assert mt_avail == MatchType.AVAILABLE_LISTING

    # Requires staff supervision -> POTENTIAL_NEEDS_VERIFICATION
    mt_staff = determine_match_type(SAMPLE_FIXTURE_RESOURCES[1], score=0.85)
    assert mt_staff == MatchType.POTENTIAL_NEEDS_VERIFICATION

    # Inactive resource -> NOT_CURRENTLY_AVAILABLE
    mt_inactive = determine_match_type(SAMPLE_FIXTURE_RESOURCES[3], score=0.90)
    assert mt_inactive == MatchType.NOT_CURRENTLY_AVAILABLE


def test_rerank_candidates_end_to_end():
    """Verify rerank_candidates produces properly structured ResourceMatch objects."""
    candidates = [("res_001", 0.80), ("res_002", 0.70)]
    resources_by_id = {r["id"]: r for r in SAMPLE_FIXTURE_RESOURCES}
    visible_ids = {"res_001", "res_002"}

    matches = rerank_candidates(
        candidates=candidates,
        resources_by_id=resources_by_id,
        visible_resource_ids=visible_ids,
        for_need="3D printing rapid prototype",
        categories=["Fabrication"],
        capabilities=["FDM", "rapid-prototyping"],
        specs=None,
        top_k=2,
    )

    assert len(matches) == 2
    top = matches[0]
    assert top.resource_id == "res_001"
    assert top.score >= 0.5
    assert len(top.reasons) > 0
    assert len(top.matched_fields) > 0


# ==============================================================================
# HTTP Endpoint Integration Tests
# ==============================================================================


@pytest.mark.anyio
async def test_match_need_endpoint_success():
    """POST /ai/match-need returns top matches within caller visibility bounds."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        payload = {
            "text": "I need to 3D print a prototype using FDM with PLA material",
            "visibleResourceIds": ["res_001", "res_002", "res_003"],
        }
        res = await client.post(
            "/ai/match-need",
            json=payload,
            headers={"X-Internal-Key": settings.INTERNAL_API_KEY},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert "matches" in data
        assert len(data["matches"]) > 0

        # Verify first match is the 3D printer
        first = data["matches"][0]
        assert first["resourceId"] == "res_001"
        assert first["matchType"] in ["AVAILABLE_LISTING", "POTENTIAL_NEEDS_VERIFICATION"]
        assert len(first["reasons"]) > 0
        assert "source" in data
        assert data["source"] in ["KEYWORD_FALLBACK", "AI_EMBEDDING"]


@pytest.mark.anyio
async def test_match_need_endpoint_strict_boundary():
    """POST /ai/match-need must not return resources excluded from visibleResourceIds."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Prompt explicitly mentions 3D printing, but caller ONLY authorizes res_003 (oscilloscope)
        payload = {
            "text": "Need FDM 3D printer",
            "visibleResourceIds": ["res_003"],
        }
        res = await client.post(
            "/ai/match-need",
            json=payload,
            headers={"X-Internal-Key": settings.INTERNAL_API_KEY},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        # res_001 MUST NOT be present
        for match in data["matches"]:
            assert match["resourceId"] != "res_001"
            assert match["resourceId"] == "res_003"


@pytest.mark.anyio
async def test_match_need_empty_visible_ids():
    """POST /ai/match-need with empty visible list returns empty matches safely."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        payload = {
            "text": "Need laser cutter",
            "visibleResourceIds": [],
        }
        res = await client.post(
            "/ai/match-need",
            json=payload,
            headers={"X-Internal-Key": settings.INTERNAL_API_KEY},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert data["matches"] == []
        assert len(data["unmatchedNeeds"]) > 0


@pytest.mark.anyio
async def test_match_need_auth_and_validation():
    """POST /ai/match-need enforces X-Internal-Key and schema validation."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Missing auth header -> 403 Forbidden
        res_no_auth = await client.post(
            "/ai/match-need",
            json={"text": "3D printer", "visibleResourceIds": ["res_001"]},
        )
        assert res_no_auth.status_code == 403

        # Missing required visibleResourceIds field -> 422 Unprocessable Entity
        res_bad_body = await client.post(
            "/ai/match-need",
            json={"text": "3D printer"},
            headers={"X-Internal-Key": settings.INTERNAL_API_KEY},
        )
        assert res_bad_body.status_code == 422


@pytest.mark.anyio
async def test_reindex_endpoint():
    """POST /ai/reindex updates in-memory search indexes."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post(
            "/ai/reindex",
            headers={"X-Internal-Key": settings.INTERNAL_API_KEY},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert "indexed_count" in data
        assert data["indexed_count"] >= 1
        assert "model_ready" in data
