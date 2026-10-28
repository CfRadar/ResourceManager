# Step 01: Pydantic Schemas & API Contracts

This guide defines strict Pydantic V2 schemas for requests and responses according to Section 6.2 of the specification.

---

## 1. Schema Definitions (`schemas.py`)

### 1.1 Need Parsing (`/ai/parse-need`)

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class ParseNeedRequest(BaseModel):
    text: str = Field(..., min_length=5, description="Free text description of researcher's need")

class ParsedItem(BaseModel):
    need: str
    categories: List[str]
    capabilities: List[str]
    specs: Optional[dict] = None

class ParseNeedResponse(BaseModel):
    ok: bool = True
    items: List[ParsedItem]
    accessModePreference: Optional[str] = None
    durationHours: Optional[int] = None
    locationPreference: Optional[str] = None
    budget: Optional[float] = None
    staffServiceOk: bool = False
    confidence: float = Field(..., ge=0.0, le=1.0)
```

### 1.2 Resource Matching (`/ai/match-need`)

```python
from enum import Enum

class MatchType(str, Enum):
    AVAILABLE_LISTING = "AVAILABLE_LISTING"
    POTENTIAL_NEEDS_VERIFICATION = "POTENTIAL_NEEDS_VERIFICATION"
    NOT_CURRENTLY_AVAILABLE = "NOT_CURRENTLY_AVAILABLE"

class MatchNeedRequest(BaseModel):
    text: str
    visibleResourceIds: List[str] = Field(
        ...,
        description="List of IDs authorized by Express for this user. The AI must never return an ID outside this list."
    )
    userContext: Optional[dict] = None

class ResourceMatch(BaseModel):
    forNeed: str
    resourceId: str
    score: float = Field(..., ge=0.0, le=1.0)
    matchType: MatchType
    reasons: List[str]
    matchedFields: List[str]
    caveats: List[str] = []

class MatchNeedResponse(BaseModel):
    ok: bool = True
    parsedNeed: dict
    matches: List[ResourceMatch]
    unmatchedNeeds: List[str] = []
    source: str = Field(..., description="'AI_EMBEDDING' or 'KEYWORD_FALLBACK'")
    disclaimer: str = "Suggestions only. Eligibility and approval are decided separately by facility staff."
```

### 1.3 Incident Dossier Summary (`/ai/incident-summary`)

```python
class IncidentSummaryRequest(BaseModel):
    incidentId: str

class IncidentSummaryResponse(BaseModel):
    ok: bool = True
    summary: str
    factsFromRecords: List[str]
    unverifiedClaims: List[str]
    missingInfo: List[str]
    sources: List[str]
    disclaimer: str = "Draft summary for coordinator review. Does not assign fault or liability."
```

---

## 2. Implementation Checklist

- [ ] Implement models in `schemas.py`.
- [ ] Add field validations for range checks (e.g. `confidence` between `0.0` and `1.0`).
- [ ] Ensure all responses include standard disclaimer strings.
