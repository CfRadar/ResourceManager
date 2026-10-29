"""Configuration settings for UviAge AI Service using pydantic-settings."""

from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    INTERNAL_API_KEY: str = "dev-secret-internal-key"
    ALLOWED_ORIGINS: str = "http://localhost:5000"
    DATABASE_URL: Optional[str] = None
    MODEL_NAME: str = "all-MiniLM-L6-v2"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origins_list(self) -> List[str]:
        """Return ALLOWED_ORIGINS parsed as a list of strings."""
        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()

