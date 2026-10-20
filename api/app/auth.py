import hashlib
import logging
import threading
import time
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


# Tokens Supabase Auth has confirmed, so a burst of API calls costs one round trip, not one each.
# 60 s at most and never past the token's own expiry. (Locally verified tokens are trusted until
# expiry anyway, so this adds no new window.)
_CONFIRMED_TTL_S = 60.0
_CONFIRMED_MAX = 5000
_confirmed: dict[str, tuple[str, float]] = {}
_confirmed_lock = threading.Lock()


def _token_key(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()  # never keep raw tokens in memory longer than needed


def _remember(token: str, user_id: str) -> None:
    try:
        exp = jwt.decode(token, options={"verify_signature": False}).get("exp")
    except jwt.PyJWTError:
        return
    if not isinstance(exp, (int, float)):
        return
    ttl = min(_CONFIRMED_TTL_S, exp - time.time())
    if ttl <= 0:
        return
    with _confirmed_lock:
        if len(_confirmed) >= _CONFIRMED_MAX:
            _confirmed.clear()
        _confirmed[_token_key(token)] = (user_id, time.monotonic() + ttl)


def _recall(token: str) -> str | None:
    with _confirmed_lock:
        hit = _confirmed.get(_token_key(token))
    if hit and time.monotonic() < hit[1]:
        return hit[0]
    return None


def _verify_with_supabase(token: str) -> str:
    """
    Fallback for tokens signed with the legacy shared secret (HS256), or a key not
    yet in the JWKS: Supabase Auth itself confirms the session.
    """
    cached = _recall(token)
    if cached is not None:
        return cached
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
    _remember(token, user_id)
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
