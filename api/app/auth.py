import logging
from dataclasses import dataclass
from functools import lru_cache

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

log = logging.getLogger("aura.auth")
_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    id: str
    # The raw access token, forwarded to Supabase so RLS sees this user.
    token: str


class _Rejected(Exception):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@lru_cache(maxsize=1)
def _jwks_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{settings.supabase_issuer}/.well-known/jwks.json", cache_keys=True)


def _verify_locally(token: str) -> str:
    """Asymmetric tokens (ES256/RS256) are checked against the project's public keys — no network per request."""
    try:
        key = _jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(token, key.key, algorithms=["ES256", "RS256"], audience="authenticated",
                            issuer=settings.supabase_issuer)
    except jwt.ExpiredSignatureError:
        raise _Rejected("session_expired") from None
    sub = claims.get("sub")
    if not isinstance(sub, str):
        raise _Rejected("invalid_token")
    return sub


def _verify_with_supabase(token: str) -> str:
    """
    Fallback for tokens signed with the legacy shared secret (HS256), or a key not
    yet in the JWKS: Supabase Auth itself confirms the session.
    """
    try:
        res = httpx.get(
            f"{settings.supabase_issuer}/user",
            headers={"apikey": settings.supabase_publishable_key, "Authorization": f"Bearer {token}"},
            timeout=10,
        )
    except httpx.HTTPError:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="auth_unreachable") from None
    if res.status_code in (401, 403):
        raise _Rejected("session_expired")
    if res.status_code != 200:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="auth_unreachable")
    user_id = res.json().get("id")
    if not isinstance(user_id, str):
        raise _Rejected("invalid_token")
    return user_id


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail=detail, headers={"WWW-Authenticate": "Bearer"})


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> CurrentUser:
    """Sync on purpose: JWKS and Auth calls block, so FastAPI runs this in its threadpool."""
    if creds is None:
        raise _unauthorized("not_signed_in")
    token = creds.credentials
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError:
        raise _unauthorized("invalid_token") from None
    alg, kid = header.get("alg"), header.get("kid")

    try:
        if alg in ("ES256", "RS256") and kid:
            try:
                user_id = _verify_locally(token)
            except (jwt.PyJWKClientError, jwt.InvalidSignatureError):
                # Key not in the JWKS yet (e.g. mid-rotation): let Supabase decide.
                user_id = _verify_with_supabase(token)
        else:
            user_id = _verify_with_supabase(token)
    except _Rejected as r:
        log.warning("token rejected: %s (alg=%s kid=%s)", r.code, alg, kid)
        raise _unauthorized(r.code) from None
    except jwt.PyJWTError as e:
        log.warning("token rejected: %s (alg=%s kid=%s)", type(e).__name__, alg, kid)
        raise _unauthorized("invalid_token") from None

    return CurrentUser(id=user_id, token=token)
