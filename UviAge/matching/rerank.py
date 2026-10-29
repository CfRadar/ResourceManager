"""Multi-factor re-ranking, visibility security gating, and explainable reason generation.

Implements the 4-stage matching pipeline, strict visibleResourceIds intersection,
and non-hallucinatory reason synthesis per Step 05 blueprint and Spec §6.2.
"""

from typing import Any, Dict, List, Optional, Set, Tuple
from schemas import MatchType, ResourceMatch


def filter_by_visibility(
    ranked_candidates: List[Tuple[str, float]],
    visible_ids: Set[str],
) -> List[Tuple[str, float]]:
    """Strictly enforces caller-authorized resource visibility boundaries (Spec §6.2).

    The AI service must NEVER return an ID outside visible_resource_ids.
    """
    if not visible_ids:
        return []
    return [(res_id, score) for res_id, score in ranked_candidates if res_id in visible_ids]


def build_reasons(
    resource: Dict[str, Any],
    need_categories: List[str],
    need_capabilities: List[str],
    need_specs: Optional[Dict[str, Any]] = None,
) -> Tuple[List[str], List[str], List[str]]:
    """Extract non-hallucinated explanations, matched fields, and operational caveats.

    Every reason and caveat is derived directly from database and policy attributes.
    """
    reasons: List[str] = []
    matched_fields: Set[str] = set()
    caveats: List[str] = set() if False else []  # preserve ordering

    # 1. Category Overlap
    res_category = str(resource.get("category") or "").strip().lower()
    for cat in need_categories:
        cat_lower = cat.lower()
        if cat_lower and (cat_lower in res_category or res_category in cat_lower):
            reasons.append(f"Category match: {resource.get('category')}")
            matched_fields.add("category")
            break

    # 2. Capability Overlap
    res_caps = [str(c).lower() for c in (resource.get("capabilities") or [])]
    matched_caps = []
    for cap in need_capabilities:
        cap_clean = cap.strip().lower()
        if not cap_clean:
            continue
        # Direct or substring match in capabilities list
        if any(cap_clean in rc or rc in cap_clean for rc in res_caps):
            matched_caps.append(cap)

    if matched_caps:
        reasons.append(f"Matching capabilities: {', '.join(matched_caps[:4])}")
        matched_fields.add("capabilities")

    # 3. Specification Overlap
    if need_specs:
        res_specs = resource.get("specs") or {}
        matched_specs = []
        for k, v in need_specs.items():
            if k in res_specs:
                matched_specs.append(f"{k} ({res_specs[k]})")
        if matched_specs:
            reasons.append(f"Specification match: {', '.join(matched_specs[:3])}")
            matched_fields.add("specs")

    # 4. Description / Keyword contextual match fallback
    if not reasons and resource.get("description"):
        reasons.append(f"Description and technical profile match for {resource.get('name')}")
        matched_fields.add("description")

    # 5. Policy Caveats & Prerequisites
    policy = resource.get("policy_data") or {}
    trainings = policy.get("requiredTrainings") or policy.get("requiredTrainingIds") or []
    if trainings:
        caveats.append(f"Prerequisite training required: {len(trainings)} module(s)")

    if policy.get("requiresStaffSupervision"):
        caveats.append("Staff supervision required during operation")

    if resource.get("risk_level") in ("HIGH", "CRITICAL"):
        caveats.append(f"Elevated risk level ({resource.get('risk_level')}): additional safety compliance applies")

    adv_days = policy.get("advanceBookingDays")
    if adv_days and adv_days > 7:
        caveats.append(f"Requires at least {adv_days} days advance booking")

    return reasons, sorted(list(matched_fields)), caveats


def determine_match_type(
    resource: Dict[str, Any],
    score: float,
) -> MatchType:
    """Classify match availability and verification status."""
    status = str(resource.get("status") or "").upper()
    if status != "ACTIVE":
        return MatchType.NOT_CURRENTLY_AVAILABLE

    policy = resource.get("policy_data") or {}
    if policy.get("requiresStaffSupervision") or score < 0.65:
        return MatchType.POTENTIAL_NEEDS_VERIFICATION

    return MatchType.AVAILABLE_LISTING


class MatchReranker:
    """Multi-factor candidate ranker enforcing caller-authorized visibility."""

    def __init__(self) -> None:
        pass

    def rerank(
        self,
        candidates: List[Tuple[str, float]],
        resources_by_id: Dict[str, Dict[str, Any]],
        visible_resource_ids: Set[str],
        for_need: str,
        categories: List[str],
        capabilities: List[str],
        specs: Optional[Dict[str, Any]] = None,
        top_k: int = 5,
    ) -> List[ResourceMatch]:
        """Filters, scores, and re-ranks candidate resources into explainable matches."""
        # Stage 2: Hard Security Filter
        visible_candidates = filter_by_visibility(candidates, visible_resource_ids)
        if not visible_candidates:
            return []

        scored_matches: List[Tuple[float, ResourceMatch]] = []

        for res_id, base_similarity in visible_candidates:
            res = resources_by_id.get(res_id)
            if not res:
                continue

            # Compute multi-factor boosted score
            reasons, matched_fields, caveats = build_reasons(
                resource=res,
                need_categories=categories,
                need_capabilities=capabilities,
                need_specs=specs,
            )

            # Boost factor based on field overlaps
            boost = 0.0
            if "category" in matched_fields:
                boost += 0.15
            if "capabilities" in matched_fields:
                boost += 0.20
            if "specs" in matched_fields:
                boost += 0.10

            final_score = min(1.0, max(0.1, round(base_similarity * 0.70 + boost, 4)))
            match_type = determine_match_type(res, final_score)

            # Ensure at least one explanation reason exists
            if not reasons:
                reasons = [f"Semantic match ({int(final_score * 100)}%) with resource catalog"]
                matched_fields = ["description"]

            match_obj = ResourceMatch(
                for_need=for_need,
                resource_id=res_id,
                score=final_score,
                match_type=match_type,
                reasons=reasons,
                matched_fields=matched_fields,
                caveats=caveats,
            )
            scored_matches.append((final_score, match_obj))

        # Sort descending by final multi-factor score
        scored_matches.sort(key=lambda x: x[0], reverse=True)
        return [match for _, match in scored_matches[:top_k]]


# Module singleton instance
match_reranker = MatchReranker()


def rerank_candidates(
    candidates: List[Tuple[str, float]],
    resources_by_id: Dict[str, Dict[str, Any]],
    visible_resource_ids: Set[str],
    for_need: str,
    categories: List[str],
    capabilities: List[str],
    specs: Optional[Dict[str, Any]] = None,
    top_k: int = 5,
) -> List[ResourceMatch]:
    """Helper function to execute multi-factor candidate reranking."""
    return match_reranker.rerank(
        candidates=candidates,
        resources_by_id=resources_by_id,
        visible_resource_ids=visible_resource_ids,
        for_need=for_need,
        categories=categories,
        capabilities=capabilities,
        specs=specs,
        top_k=top_k,
    )
