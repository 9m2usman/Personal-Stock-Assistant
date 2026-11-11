"""
Security & Cryptographic Utilities
Provides password hashing and JWT token handling helpers.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

def create_access_token(
    data: Dict[str, Any],
    secret_key: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Creates a simple signed token for local development.
    Uses standard HMAC SHA256 without external compiled C-extensions for zero-friction local tests.
    """
    import hmac
    import hashlib
    import json
    import base64

    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    to_encode.update({"exp": int(expire.timestamp())})
    
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(to_encode).encode()).decode().rstrip("=")
    
    signature = hmac.new(
        secret_key.encode(),
        f"{header_b64}.{payload_b64}".encode(),
        hashlib.sha256
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"
