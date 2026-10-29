"""UviAge FastAPI application entrypoint."""

from contextlib import asynccontextmanager
from typing import Any, Dict, List, Set
from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import verify_internal_key
from config import get_settings
from matching import embedder, fallback
from matching.rerank import rerank_candidates
from parsing.need_parser import parse_need_text
import repository
from schemas import (
    MatchNeedRequest,
    MatchNeedResponse,
    ParseNeedRequest,
    ParseNeedResponse,
    ResourceMatch,
)

settings = get_settings()


def reindex_internal() -> int:
    """Index all active resources from repository into fallback and vector matchers."""
    active_resources = repository.get_all_active_resources()
    count = fallback.fallback_matcher.index(active_resources)
    if embedder.vector_indexer.is_ready():
        embedder.vector_indexer.index_resources(active_resources)
    return count


# Eager initialization on import ensuring indexes are populated in all test and production environments
try:
    reindex_internal()
except Exception:
    pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context: initialize in-memory indexes on startup."""
    reindex_internal()
    yield


app = FastAPI(
    title="UviAge",
    description="Python AI Service for Resource Manager",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration restricted strictly to allowed origins (Express backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Root metadata endpoint."""
    return {
        "ok": True,
        "service": "UviAge",
        "message": "UviAge AI service is running",
        "docs": "/docs",
    }


@app.get("/ai/health")
async def health_check():
    """Unauthenticated healthcheck endpoint for container orchestration and status probes."""
    return {
        "ok": True,
        "service": "UviAge",
        "status": "healthy",
        "model_loaded": embedder.is_ready(),
        "database": repository.ping(),
    }


# Router for all operational AI endpoints protected by X-Internal-Key header
ai_router = APIRouter(prefix="/ai", dependencies=[Depends(verify_internal_key)])


@ai_router.get("/protected-test")
async def protected_test():
    """Protected test route to verify internal header authentication."""
    return {
        "ok": True,
        "service": "UviAge",
        "message": "Access granted to protected AI endpoint",
    }


@ai_router.post("/parse-need", response_model=ParseNeedResponse)
async def parse_need_endpoint(payload: ParseNeedRequest) -> ParseNeedResponse:
    """Parses natural language research need into structured equipment requirements.

    Spec §4.24 & §6.1 (Step 03).
    """
    return parse_need_text(payload.text)


@ai_router.post("/match-need", response_model=MatchNeedResponse)
async def match_need_endpoint(payload: MatchNeedRequest) -> MatchNeedResponse:
    """Matches user research need against visible laboratory resources.

    Spec §4.24, §6.2, & §6.3 (Steps 04, 05, and 06).
    Enforces strict visibleResourceIds boundary and returns non-hallucinated explanations.
    """
    # Ensure indexes are populated if empty
    if fallback.fallback_matcher.total_docs == 0:
        reindex_internal()

    parsed = parse_need_text(payload.text)
    visible_ids: Set[str] = set(payload.visible_resource_ids)

    # Security check: If no visible resources were authorized, return empty matches
    if not visible_ids:
        return MatchNeedResponse(
            ok=True,
            parsed_need=parsed.model_dump(by_alias=True),
            matches=[],
            unmatched_needs=[item.need for item in parsed.items],
            source="KEYWORD_FALLBACK",
        )

    # Determine inference engine: neural embedding vs deterministic keyword fallback
    use_neural = (
        embedder.vector_indexer.is_ready()
        and embedder.vector_indexer.embeddings is not None
    )

    if use_neural:
        raw_candidates = embedder.vector_indexer.query(payload.text, top_k=20)
        source = "AI_EMBEDDING"
    else:
        raw_candidates = fallback.fallback_matcher.search(payload.text, top_k=20)
        source = "KEYWORD_FALLBACK"

    # Filter candidates by caller-authorized visibility
    visible_candidates = [
        (res_id, score) for res_id, score in raw_candidates if res_id in visible_ids
    ]

    # If top-level query yielded no visible matches, try querying each extracted item need
    if not visible_candidates:
        for item in parsed.items:
            sub_cands = (
                embedder.vector_indexer.query(item.need, top_k=10)
                if use_neural
                else fallback.fallback_matcher.search(item.need, top_k=10)
            )
            for cid, score in sub_cands:
                if cid in visible_ids and not any(c[0] == cid for c in visible_candidates):
                    visible_candidates.append((cid, score))

    if not visible_candidates:
        return MatchNeedResponse(
            ok=True,
            parsed_need=parsed.model_dump(by_alias=True),
            matches=[],
            unmatched_needs=[item.need for item in parsed.items],
            source=source,
        )

    # Fetch resource details for visible candidate IDs only
    candidate_ids = [cid for cid, _ in visible_candidates]
    fetched_resources = repository.get_resources_by_ids(candidate_ids)
    resources_by_id: Dict[str, Dict[str, Any]] = {r["id"]: r for r in fetched_resources}

    all_matches: List[ResourceMatch] = []
    seen_res_ids: Set[str] = set()

    # Re-rank matches per extracted need requirement
    for item in parsed.items:
        item_matches = rerank_candidates(
            candidates=visible_candidates,
            resources_by_id=resources_by_id,
            visible_resource_ids=visible_ids,
            for_need=item.need,
            categories=item.categories,
            capabilities=item.capabilities,
            specs=item.specs,
            top_k=5,
        )
        for match in item_matches:
            if match.resource_id not in seen_res_ids:
                seen_res_ids.add(match.resource_id)
                all_matches.append(match)

    # If no item-specific match was generated, synthesize from top candidate
    if not all_matches and visible_candidates:
        fallback_matches = rerank_candidates(
            candidates=visible_candidates,
            resources_by_id=resources_by_id,
            visible_resource_ids=visible_ids,
            for_need=payload.text,
            categories=[],
            capabilities=[],
            specs=None,
            top_k=5,
        )
        all_matches.extend(fallback_matches)

    matched_for_needs = {m.for_need for m in all_matches}
    unmatched_needs = [
        item.need for item in parsed.items if item.need not in matched_for_needs
    ]

    return MatchNeedResponse(
        ok=True,
        parsed_need=parsed.model_dump(by_alias=True),
        matches=all_matches,
        unmatched_needs=unmatched_needs,
        source=source,
    )


@ai_router.post("/reindex")
async def reindex_endpoint():
    """Rebuilds in-memory BM25 and vector search indexes from repository.

    Spec §6.3: Index Rebuild Endpoint.
    """
    count = reindex_internal()
    return {
        "ok": True,
        "indexed_count": count,
        "model_ready": embedder.vector_indexer.is_ready(),
    }


app.include_router(ai_router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
