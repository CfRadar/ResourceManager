import os
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="UviAge AI Service",
    description="Python AI backend service for Resource Manager",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "dev-secret-internal-key")


@app.get("/")
def root():
    return {
        "ok": True,
        "service": "UviAge",
        "message": "UviAge AI service is running",
        "docs": "/docs",
    }


@app.get("/ai/health")
def health():
    return {
        "ok": True,
        "service": "UviAge",
        "status": "healthy",
        "model_status": "ready",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
