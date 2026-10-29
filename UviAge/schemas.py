"""Pydantic V2 schemas and API contracts for UviAge AI Service.

Defines strict request/response models according to Section 6.2 of the
backend API specification and Step 01 blueprint.
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class BaseSchema(BaseModel):
    """Base schema supporting both snake_case and camelCase serialization/deserialization."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )


# ==============================================================================
# Health Check Contract
# ==============================================================================


class HealthResponse(BaseSchema):
    """Health check response schema (retains exact snake_case keys for health probe compatibility)."""

    model_config = ConfigDict(populate_by_name=True)

    ok: bool = True
    service: str = "UviAge"
    status: str = "healthy"
    model_loaded: bool = False
    database: Union[str, bool] = "not_configured"


# ==============================================================================
# 1. Natural Language Need Parsing (/ai/parse-need)
# ==============================================================================


class ParseNeedRequest(BaseSchema):
    """Request schema for free-text research need extraction."""

    text: str = Field(
        ...,
        min_length=5,
        description="Free text description of researcher's need",
    )


class ParsedItem(BaseSchema):
    """Individual parsed requirement or equipment extracted from text."""

    need: str = Field(..., description="Identified equipment or capability need")
    categories: List[str] = Field(
        default_factory=list,
        description="Taxonomy categories matched",
    )
    capabilities: List[str] = Field(
        default_factory=list,
        description="Specific technical capabilities (e.g. FDM, PLA, 5-axis)",
    )
    specs: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Numerical or qualitative constraints",
    )


class ParseNeedResponse(BaseSchema):
    """Structured response extracted from natural language research need."""

    ok: bool = True
    items: List[ParsedItem] = Field(default_factory=list)
    access_mode_preference: Optional[str] = Field(
        default=None,
        alias="accessModePreference",
        description="IN_PERSON, STAFF_OPERATED, or SEND_SAMPLE",
    )
    duration_hours: Optional[int] = Field(
        default=None,
        alias="durationHours",
        description="Requested duration in hours",
    )
    location_preference: Optional[str] = Field(
        default=None,
        alias="locationPreference",
        description="Geographic or institution preference",
    )
    budget: Optional[float] = Field(
        default=None,
        description="Budget ceiling if specified",
    )
    staff_service_ok: bool = Field(
        default=False,
        alias="staffServiceOk",
        description="Whether operator-assisted service is acceptable",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0",
    )


# ==============================================================================
# 2. Resource Matching (/ai/match-need)
# ==============================================================================


class MatchType(str, Enum):
    """Resource match classification."""

    AVAILABLE_LISTING = "AVAILABLE_LISTING"
    POTENTIAL_NEEDS_VERIFICATION = "POTENTIAL_NEEDS_VERIFICATION"
    NOT_CURRENTLY_AVAILABLE = "NOT_CURRENTLY_AVAILABLE"


class UserContext(BaseSchema):
    """Forwarded requester context for filtering and relevance scoring."""

    user_group: Optional[str] = Field(default=None, alias="userGroup")
    institution_ids: List[str] = Field(default_factory=list, alias="institutionIds")
    lat: Optional[float] = None
    lng: Optional[float] = None


class MatchNeedRequest(BaseSchema):
    """Request schema for capability matching.

    Security rule: Express passes the list of resource IDs the user is authorized to see.
    The AI service must NEVER return an ID outside visible_resource_ids.
    """

    text: str = Field(..., min_length=1, description="Raw need description or parsed query")
    visible_resource_ids: List[str] = Field(
        ...,
        alias="visibleResourceIds",
        description="List of IDs authorized by Express for this user. The AI must never return an ID outside this list.",
    )
    user_context: Optional[Dict[str, Any]] = Field(default=None, alias="userContext")


class ResourceMatch(BaseSchema):
    """Individual resource recommendation item."""

    for_need: str = Field(..., alias="forNeed", description="The specific need item this matches")
    resource_id: str = Field(..., alias="resourceId", description="Matching resource identifier")
    score: float = Field(..., ge=0.0, le=1.0, description="Match score between 0.0 and 1.0")
    match_type: MatchType = Field(..., alias="matchType")
    reasons: List[str] = Field(default_factory=list, description="Human-readable match explanations")
    matched_fields: List[str] = Field(
        default_factory=list,
        alias="matchedFields",
        description="Fields contributing to the match",
    )
    caveats: List[str] = Field(
        default_factory=list,
        description="Prerequisites or restrictions (e.g. training required)",
    )


class MatchNeedResponse(BaseSchema):
    """Top-ranked recommendations and explainable match results."""

    ok: bool = True
    parsed_need: Dict[str, Any] = Field(default_factory=dict, alias="parsedNeed")
    matches: List[ResourceMatch] = Field(default_factory=list)
    unmatched_needs: List[str] = Field(default_factory=list, alias="unmatchedNeeds")
    source: str = Field(
        ...,
        description="'AI_EMBEDDING' or 'KEYWORD_FALLBACK'",
    )
    disclaimer: str = (
        "Suggestions only. Eligibility and approval are decided separately by facility staff."
    )


# ==============================================================================
# 3. Incident Dossier Summary (/ai/incident-summary)
# ==============================================================================


class IncidentSummaryRequest(BaseSchema):
    """Request schema for drafting an objective incident dossier summary."""

    incident_id: str = Field(..., alias="incidentId", description="Incident ID to summarize")


class IncidentSummaryResponse(BaseSchema):
    """Objective summary and factual breakdown of an incident dossier."""

    ok: bool = True
    summary: str = Field(..., description="Objective non-accusatory factual summary")
    facts_from_records: List[str] = Field(
        default_factory=list,
        alias="factsFromRecords",
        description="Verified facts supported by condition reports and check-in records",
    )
    unverified_claims: List[str] = Field(
        default_factory=list,
        alias="unverifiedClaims",
        description="Disputed or subjective statements",
    )
    missing_info: List[str] = Field(
        default_factory=list,
        alias="missingInfo",
        description="Gaps in the evidentiary record",
    )
    sources: List[str] = Field(
        default_factory=list,
        description="Referenced report and photo identifiers",
    )
    disclaimer: str = (
        "Draft summary for coordinator review. Does not assign fault or liability."
    )


# ==============================================================================
# 4. Alternatives, Policy Summary & Reindex Contracts (Spec §6.2)
# ==============================================================================


class AlternativesRequest(BaseSchema):
    """Request schema for finding alternatives to unavailable resources/slots."""

    resource_id: str = Field(..., alias="resourceId")
    desired_start: Optional[str] = Field(default=None, alias="desiredStart")
    desired_end: Optional[str] = Field(default=None, alias="desiredEnd")


class AlternativesResponse(BaseSchema):
    """Response containing similar alternative resources or nearby slots."""

    ok: bool = True
    resource_id: str = Field(..., alias="resourceId")
    alternatives: List[Dict[str, Any]] = Field(default_factory=list)
    nearby_slots: List[Dict[str, Any]] = Field(default_factory=list, alias="nearbySlots")


class PolicySummaryRequest(BaseSchema):
    """Request schema for plain-language resource policy summary."""

    resource_id: str = Field(..., alias="resourceId")


class PolicySummaryResponse(BaseSchema):
    """Plain-language bullet point policy summary."""

    ok: bool = True
    resource_id: str = Field(..., alias="resourceId")
    summary_bullets: List[str] = Field(
        default_factory=list,
        alias="summaryBullets",
        description="Key policy rules translated into plain language",
    )


class ReindexRequest(BaseSchema):
    """Request schema to trigger index update for modified listings."""

    resource_ids: Optional[List[str]] = Field(
        default=None,
        alias="resourceIds",
        description="Specific IDs to reindex; None reindexes all active listings",
    )


class ReindexResponse(BaseSchema):
    """Status response following vector reindexing."""

    ok: bool = True
    indexed_count: int = Field(default=0, alias="indexedCount")
    message: str = "Reindexing complete"
