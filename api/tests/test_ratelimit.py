import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.config import Settings, settings
from app.main import app
from app.ratelimit import RateLimiter


def test_limit_and_window_reset():
    rl = RateLimiter("t", limit=2, window_s=60)
    rl.check("a", now=0)
    rl.check("a", now=1)
    with pytest.raises(HTTPException) as e:
        rl.check("a", now=2)
    assert e.value.status_code == 429 and e.value.headers == {"Retry-After": "59"}
    rl.check("b", now=2)  # per user
    rl.check("a", now=61)  # first hit has left the window


def test_docs_are_off_by_default(monkeypatch):
    monkeypatch.delenv("EXPOSE_DOCS", raising=False)
    assert Settings(_env_file=None).expose_docs is False
    expected = 200 if settings.expose_docs else 404
    assert TestClient(app).get("/docs").status_code == expected
