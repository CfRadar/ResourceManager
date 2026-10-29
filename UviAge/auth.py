"""Authentication and internal service verification for UviAge."""

import os
import secrets
from typing import Optional
from fastapi import Header, HTTPException, status
from config import get_settings


async def verify_internal_key(
    x_internal_key: Optional[str] = Header(None, alias="X-Internal-Key"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
) -> dict:
    """Validate incoming X-Internal-Key header against configured internal secret.

    Uses constant-time comparison (secrets.compare_digest) to prevent timing attacks.
    Returns HTTP 403 Forbidden if the header is missing or does not match.
    """
    settings = get_settings()
    expected_key = settings.INTERNAL_API_KEY or os.getenv(
        "INTERNAL_API_KEY", "dev-secret-internal-key"
    )

    if not x_internal_key or not secrets.compare_digest(x_internal_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Internal-Key header",
        )
    return {"user_id": x_user_id}
