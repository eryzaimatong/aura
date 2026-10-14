from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    id: str
    # The raw access token, forwarded to Supabase so RLS sees this user.
    token: str


@lru_cache(maxsize=1)
def _jwks_client() -> jwt.PyJWKClient:
    # Supabase signs access tokens with asymmetric keys (ES256) published here.
    return jwt.PyJWKClient(f"{settings.supabase_issuer}/.well-known/jwks.json", cache_keys=True)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail=detail, headers={"WWW-Authenticate": "Bearer"})


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> CurrentUser:
    """Sync on purpose: the JWKS fetch is blocking, so FastAPI runs this in its threadpool."""
    if creds is None:
        raise _unauthorized("not_signed_in")
    token = creds.credentials
    try:
        key = _jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=settings.supabase_issuer,
        )
    except jwt.ExpiredSignatureError:
        raise _unauthorized("session_expired") from None
    except (jwt.PyJWTError, jwt.PyJWKClientError):
        raise _unauthorized("invalid_token") from None

    sub = claims.get("sub")
    if not isinstance(sub, str):
        raise _unauthorized("invalid_token")
    return CurrentUser(id=sub, token=token)
