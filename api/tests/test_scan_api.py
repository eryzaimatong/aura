from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.auth import CurrentUser, get_current_user
from app.config import POLICY_VERSION
from app.main import app
from app.routers.scan import get_db

USER = CurrentUser(id="user-1", token="t")

GOOD_SCAN = {
    "landmark_ratios": {"len_width": 1.21, "jaw_forehead": 1.0, "jaw_cheek": 0.8, "forehead_cheek": 0.8, "chin_jaw": 0.65},
    "lab_skin": [62, 10, 25],
    "lab_eye": [30, 2, 8],
    "monk_band": 4,
    "lighting_score": 0.95,
}


class FakeDb:
    def __init__(self, consent: dict[str, Any] | None):
        self.consent = consent
        self.rows: dict[str, list[dict[str, Any]]] = {"scans": [], "aura_cards": [], "undertone_quiz": []}

    async def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        if table == "consents":
            return [self.consent] if self.consent else []
        if table == "aura_cards":
            return [r for r in self.rows["aura_cards"] if r["is_current"]]
        if table == "scans":
            return [r for r in self.rows["scans"] if r["id"] == params["id"].removeprefix("eq.")]
        return []

    async def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        stored = {"id": f"{table}-{len(self.rows[table]) + 1}", "created_at": "2026-10-14T00:00:00Z", "scan_id": None, **row}
        self.rows[table].append(stored)
        return stored

    async def update(self, table: str, filters: dict[str, str], values: dict[str, Any]) -> list[dict[str, Any]]:
        hit = []
        for r in self.rows[table]:
            if all(str(r.get(k)).lower() == v.removeprefix("eq.") for k, v in filters.items()):
                r.update(values)
                hit.append(r)
        return hit


@pytest.fixture
def make_client():
    def _make(consent: dict[str, Any] | None = {"granted": True, "policy_ver": POLICY_VERSION}):
        db = FakeDb(consent)
        app.dependency_overrides[get_current_user] = lambda: USER
        app.dependency_overrides[get_db] = lambda: db
        return TestClient(app), db
    yield _make
    app.dependency_overrides.clear()


def test_scan_creates_card(make_client):
    client, db = make_client()
    res = client.post("/api/scan", json=GOOD_SCAN)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["needs_quiz"] is False
    assert body["card"]["season"] is not None and len(body["card"]["palette"]) == 5
    assert db.rows["scans"][0]["model_version"] == "rules-0.1"


def test_low_light_routes_to_quiz_without_guessing(make_client):
    client, _ = make_client()
    res = client.post("/api/scan", json={**GOOD_SCAN, "lighting_score": 0.3})
    body = res.json()
    assert body["needs_quiz"] is True
    assert body["card"]["season"] is None and body["card"]["palette"] == []
    assert body["card"]["face_shape"]  # shape still delivered


def test_second_scan_retires_previous_card(make_client):
    client, db = make_client()
    client.post("/api/scan", json=GOOD_SCAN)
    client.post("/api/scan", json=GOOD_SCAN)
    assert [c["is_current"] for c in db.rows["aura_cards"]] == [False, True]


def test_scan_requires_consent(make_client):
    client, _ = make_client(consent=None)
    assert client.post("/api/scan", json=GOOD_SCAN).json()["detail"] == "consent_required"
    client, _ = make_client(consent={"granted": False, "policy_ver": POLICY_VERSION})
    assert client.post("/api/scan", json=GOOD_SCAN).status_code == 403
    client, _ = make_client(consent={"granted": True, "policy_ver": "2020-01"})
    assert client.post("/api/scan", json=GOOD_SCAN).status_code == 403


def test_images_are_rejected(make_client):
    client, _ = make_client()
    res = client.post("/api/scan", json={**GOOD_SCAN, "image": "data:image/png;base64,AAAA"})
    assert res.status_code == 422


def test_out_of_range_values_rejected(make_client):
    client, _ = make_client()
    assert client.post("/api/scan", json={**GOOD_SCAN, "monk_band": 11}).status_code == 422
    assert client.post("/api/scan", json={**GOOD_SCAN, "lab_skin": [120, 0, 0]}).status_code == 422


def test_quiz_fills_colors(make_client):
    client, db = make_client()
    client.post("/api/scan", json={**GOOD_SCAN, "lighting_score": 0.3})
    res = client.post("/api/cards/current/undertone", json={"veins": "blue", "metal": "silver", "sun": "burn"})
    assert res.status_code == 200, res.text
    card = res.json()
    assert card["source"] == "quiz" and card["skin_undertone"] == "cool" and card["season"]
    assert db.rows["undertone_quiz"][0]["result"] == "cool"


def test_quiz_without_card_is_404(make_client):
    client, _ = make_client()
    res = client.post("/api/cards/current/undertone", json={"veins": "blue", "metal": "silver", "sun": "burn"})
    assert res.status_code == 404


def test_scan_requires_sign_in():
    app.dependency_overrides.clear()
    res = TestClient(app).post("/api/scan", json=GOOD_SCAN)
    assert res.status_code == 401
