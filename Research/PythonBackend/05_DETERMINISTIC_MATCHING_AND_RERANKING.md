# Step 05: Matching Pipeline, Re-ranking & Explainable Reasons

This guide details `/ai/match-need`, enforcing caller-authorized visibility constraints, multi-factor scoring, and explainable reason generation.

---

## 1. The 4-Stage Matching Pipeline

```
User Query + visibleResourceIds
          │
          ▼
1. Semantic Similarity Search (Cosine similarity)
          │
          ▼
2. Hard Security Filter: Intersect with visibleResourceIds (No ID leaks!)
          │
          ▼
3. Deterministic Re-ranking: Category match, active status, training prerequisites
          │
          ▼
4. Explainable Reasons Generator: Extract matched fields, caveats, matchType
```

---

## 2. Security: Strict `visibleResourceIds` Enforcement

> **Section 6.2 Rule:** Express provides `visibleResourceIds` (the exact set of resource IDs the user is allowed to discover).
> The AI service must **never** return an ID that was not provided in this array.

```python
def filter_by_visibility(ranked_candidates: list[tuple[str, float]], visible_ids: set[str]) -> list[tuple[str, float]]:
    return [(res_id, score) for res_id, score in ranked_candidates if res_id in visible_ids]
```

---

## 3. Match Types & Explainable Reasons (`matching/rerank.py`)

Every candidate is evaluated to produce transparent, auditable feedback:

### 3.1 `matchType` Assignment
- `AVAILABLE_LISTING`: Verified resource with open slots matching needed capabilities.
- `POTENTIAL_NEEDS_VERIFICATION`: Capability matches partially or policy requires custom staff review.
- `NOT_CURRENTLY_AVAILABLE`: Capability matches, but resource is blacked out or fully booked.

### 3.2 Generating `reasons[]` and `matchedFields[]`
Reasons must be extracted directly from actual database fields (never hallucinated):
```python
def build_reasons(resource: dict, parsed_need: dict) -> tuple[list[str], list[str], list[str]]:
    reasons = []
    matched_fields = []
    caveats = []
    
    # Check category match
    if resource.get("category") in parsed_need.get("categories", []):
        reasons.append(f"Category match: {resource['category']}")
        matched_fields.append("category")
        
    # Check capability overlap
    resource_caps = set(c.lower() for c in resource.get("capabilities", []))
    for need_cap in parsed_need.get("capabilities", []):
        if need_cap.lower() in resource_caps:
            reasons.append(f"Matching capability: {need_cap}")
            matched_fields.append("capabilities")
            
    # Check training prerequisites
    policy = resource.get("policy_data") or {}
    required_trainings = policy.get("requiredTrainingIds", [])
    if required_trainings:
        caveats.append(f"Prerequisite training required: {len(required_trainings)} module(s)")
        
    return reasons, list(set(matched_fields)), caveats
```

---

## 4. Implementation Checklist

- [ ] Implement re-ranking module in `matching/rerank.py`.
- [ ] Ensure non-hallucinatory reason generator tests pass.
- [ ] Enforce visibility intersection check.
