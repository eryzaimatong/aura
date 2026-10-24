import time
from types import SimpleNamespace
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app import auth
from app.config import settings

ISSUER_URL = "https://example.supabase.co"
PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1())


@pytest.fixture(autouse=True)
def project(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "supabase_url", ISSUER_URL)
    monkeypatch.setattr(settings, "supabase_publishable_key", "pk")

    class FakeJwks:
        def get_signing_key_from_jwt(self, token: str):
            if jwt.get_unverified_header(token).get("kid") != "k1":
                raise jwt.PyJWKClientError("Unable to find a signing key that matches")
            return SimpleNamespace(key=PRIVATE_KEY.public_key())

    monkeypatch.setattr(auth, "_jwks_client", lambda: FakeJwks())
    auth._confirmed.clear()


def claims(**over: Any) -> dict[str, Any]:
    now = int(time.time())
    return {"sub": "user-1", "aud": "authenticated", "iss": f"{ISSUER_URL}/auth/v1", "iat": now, "exp": now + 3600, **over}


def es256(kid: str = "k1", **over: Any) -> str:
    return jwt.encode(claims(**over), PRIVATE_KEY, algorithm="ES256", headers={"kid": kid})


def hs256(**over: Any) -> str:
    return jwt.encode(claims(**over), "legacy-secret-at-least-32-bytes-long!", algorithm="HS256")


def call(token: str) -> auth.CurrentUser:
    return auth.get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))


def fake_auth_api(monkeypatch: pytest.MonkeyPatch, status_code: int, body: dict[str, Any] | None = None) -> list[str]:
    calls: list[str] = []

    def fake_get(url: str, **_: Any):
        calls.append(url)
        return SimpleNamespace(status_code=status_code, json=lambda: body or {})

    monkeypatch.setattr(auth.httpx, "get", fake_get)
    return calls


def test_es256_verified_locally_without_network(monkeypatch):
    calls = fake_auth_api(monkeypatch, 500)
    assert call(es256()).id == "user-1"
    assert calls == []


def test_es256_expired_is_session_expired():
    with pytest.raises(HTTPException) as e:
        call(es256(exp=int(time.time()) - auth.CLOCK_SKEW_S - 10))
    assert e.value.status_code == 401 and e.value.detail == "session_expired"


def test_es256_wrong_audience_rejected():
    with pytest.raises(HTTPException) as e:
        call(es256(aud="anon"))
    assert e.value.detail == "invalid_token"


def test_unknown_kid_falls_back_to_supabase(monkeypatch):
    calls = fake_auth_api(monkeypatch, 200, {"id": "user-2"})
    assert call(es256(kid="rotated")).id == "user-2"
    assert calls == [f"{ISSUER_URL}/auth/v1/user"]


def test_legacy_hs256_verified_by_supabase(monkeypatch):
    fake_auth_api(monkeypatch, 200, {"id": "user-3"})
    assert call(hs256()).id == "user-3"


def test_supabase_rejects_token(monkeypatch):
    fake_auth_api(monkeypatch, 401)
    with pytest.raises(HTTPException) as e:
        call(hs256())
    assert e.value.status_code == 401 and e.value.detail == "session_expired"


def test_garbage_token_rejected():
    with pytest.raises(HTTPException) as e:
        call("not-a-jwt")
    assert e.value.detail == "invalid_token"


def test_supabase_confirmation_is_cached_briefly(monkeypatch):
    calls = fake_auth_api(monkeypatch, 200, {"id": "user-1"})
    token = hs256()
    assert call(token).id == "user-1" and call(token).id == "user-1"
    assert len(calls) == 1
    # Past the cache window, Supabase is asked again.
    key = auth._token_key(token)
    auth._confirmed[key] = (auth._confirmed[key][0], 0.0)
    call(token)
    assert len(calls) == 2


def test_rejections_are_never_cached(monkeypatch):
    calls = fake_auth_api(monkeypatch, 401)
    token = hs256()
    for _ in range(2):
        with pytest.raises(HTTPException):
            call(token)
    assert len(calls) == 2


def test_tolerates_small_clock_skew():
    # Issued 20 s "in the future" by Supabase's clock.
    future = int(time.time()) + 20
    assert call(es256(iat=future, nbf=future)).id == "user-1"
