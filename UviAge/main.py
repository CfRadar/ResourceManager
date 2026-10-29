"""UviAge FastAPI application entrypoint."""

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import verify_internal_key
from config import get_settings
from matching import embedder
from parsing.need_parser import parse_need_text
import repository
from schemas import ParseNeedRequest, ParseNeedResponse

settings = get_settings()

app = FastAPI(
    title="UviAge",
    description="Python AI Service for Resource Manager",
    version="0.1.0",
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


app.include_router(ai_router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
