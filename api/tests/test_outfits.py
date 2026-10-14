from datetime import date, timedelta
from typing import Any

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.auth import CurrentUser, get_current_user
from app.deps import get_db
from app.main import app
from app.ml.outfits import NotEnoughItems, Piece, Weather, generate
from app.routers import outfits as outfits_router
from app.weather import parse

TODAY = date(2026, 10, 15)
RNG = np.random.default_rng(1)
NAVY, CREAM, SAGE = (20.0, 5.0, -25.0), (91.0, 1.5, 9.5), (72.0, -10.0, 12.0)


def vec() -> np.ndarray:
    v = RNG.normal(size=512).astype(np.float32)
    return v / np.linalg.norm(v)


def piece(id: str, cat: str, sub: str | None = None, **kw: Any) -> Piece:
    return Piece(id=id, name=id.replace("_", " ").title(), category=cat, subcategory=sub, embedding=vec(), **kw)


def basic_closet() -> list[Piece]:
    return [
        piece("cream_tee", "top", "tshirt", in_palette=True, lab=CREAM, seasonality="warm", color_name="cream"),
        piece("navy_sweater", "top", "sweater", in_palette=True, lab=NAVY, seasonality="cool", color_name="navy"),
        piece("navy_trousers", "bottom", "trousers", in_palette=True, lab=NAVY, color_name="navy"),
        piece("sage_skirt", "bottom", "skirt", in_palette=True, lab=SAGE, color_name="sage"),
        piece("white_sneakers", "shoes", "sneakers", lab=CREAM),
        piece("tan_sandals", "shoes", "sandals", lab=(70.0, 8.0, 25.0)),
    ]


def test_builds_complete_outfit_with_reason():
    o = generate(basic_closet(), occasion="class", weather=None, today=TODAY, season_name="Soft Summer")
    cats = sorted(p.category for p in o.pieces)
    assert cats == ["bottom", "shoes", "top"]
    assert o.reason.endswith(".") and len(o.reason) > 10
    assert "Class day" in o.tags


def test_same_seed_same_outfit_and_shuffle_varies():
    closet = basic_closet()
    first = [p.id for p in generate(closet, occasion=None, weather=None, today=TODAY, seed=3).pieces]
    assert first == [p.id for p in generate(closet, occasion=None, weather=None, today=TODAY, seed=3).pieces]
    seen = {tuple(sorted(p.id for p in generate(closet, occasion=None, weather=None, today=TODAY, seed=s).pieces)) for s in range(12)}
    assert len(seen) >= 2


def test_heat_avoids_cool_pieces():
    hot = Weather(temp_c=33, feels_c=38, rain_pct=10)
    for s in range(8):
        o = generate(basic_closet(), occasion=None, weather=hot, today=TODAY, seed=s)
        assert "navy_sweater" not in [p.id for p in o.pieces]
    assert "Heat friendly" in o.tags and "38°C" in o.reason


def test_rain_prefers_closed_shoes_and_explains_swap():
    closet = basic_closet()
    closet[5].in_palette = True  # make sandals the dry-weather favourite
    closet[5].wear_count = 0
    rain = Weather(temp_c=27, feels_c=29, rain_pct=85)
    o = generate(closet, occasion=None, weather=rain, today=TODAY, seed=0)
    shoes = next(p for p in o.pieces if p.category == "shoes")
    assert shoes.id == "white_sneakers" and "Rain ready" in o.tags
    if o.note:
        assert o.note.startswith("rain check")


def test_recently_worn_is_rotated_out():
    closet = basic_closet()
    for p in closet:
        if p.id == "cream_tee":
            p.last_worn = TODAY - timedelta(days=1)
    picks = [generate(closet, occasion=None, weather=None, today=TODAY, seed=s).pieces for s in range(6)]
    assert sum("cream_tee" in [p.id for p in ps] for ps in picks) <= 2


def test_dress_outfit_and_missing_pieces():
    o = generate([piece("dress", "dress", "dress"), piece("flats", "shoes", "flats")], occasion=None, weather=None, today=TODAY)
    assert sorted(p.category for p in o.pieces) == ["dress", "shoes"]
    with pytest.raises(NotEnoughItems) as e:
        generate([piece("tee", "top")], occasion=None, weather=None, today=TODAY)
    assert e.value.missing == ["bottom"]


def test_palette_reason_names_the_season():
    closet = [p for p in basic_closet() if p.category != "shoes"]
    o = generate(closet, occasion=None, weather=None, today=TODAY, season_name="Soft Summer")
    assert "Soft Summer palette" in o.reason


def test_weather_parse():
    data = {
        "current": {"time": "2026-10-15T13:00", "temperature_2m": 33.2, "apparent_temperature": 38.4,
                    "relative_humidity_2m": 78, "weather_code": 2},
        "hourly": {"time": [f"2026-10-15T{h:02d}:00" for h in range(24)],
                   "precipitation_probability": [0] * 15 + [80, 90] + [10] * 7},
    }
    w = parse(data)
    assert (w.feels_c, w.rain_pct, w.rain_from_hour, w.summary) == (38.4, 90, 15, "humid")


# ---------- endpoints ----------

def row(p: Piece) -> dict[str, Any]:
    return {"id": p.id, "name": p.name, "category": p.category, "subcategory": p.subcategory,
            "in_palette": p.in_palette, "seasonality": p.seasonality,
            "dominant_colors": [{"hex": "#000000", "pct": 1, "name": p.color_name}] if p.color_name else [],
            "lab_primary": list(p.lab) if p.lab else None,
            "embedding": "[" + ",".join(f"{x:.5f}" for x in p.embedding) + "]" if p.embedding is not None else None}  # type: ignore[union-attr]


class FakeDb:
    def __init__(self, closet: list[Piece]):
        self.closet = closet
        self.inserted: dict[str, list[dict[str, Any]]] = {}

    async def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        if table == "closet_items":
            rows = [row(p) for p in self.closet]
            if params.get("id", "").startswith("in.("):
                ids = params["id"][4:-1].split(",")
                rows = [{"id": r["id"], "category": r["category"]} for r in rows if r["id"] in ids]
            return rows
        if table == "aura_cards":
            return [{"season": "soft_summer"}]
        return []

    async def insert(self, table: str, r: dict[str, Any]) -> dict[str, Any]:
        self.inserted.setdefault(table, []).append(r)
        return {"id": "outfit-1", **r}

    async def insert_many(self, table: str, rows: list[dict[str, Any]], **_: Any) -> list[dict[str, Any]]:
        self.inserted.setdefault(table, []).extend(rows)
        return rows


@pytest.fixture
def client():
    def make(closet: list[Piece]):
        db = FakeDb(closet)
        app.dependency_overrides[get_current_user] = lambda: CurrentUser("u", "t")
        app.dependency_overrides[get_db] = lambda: db
        return TestClient(app), db
    yield make
    app.dependency_overrides.clear()


def test_generate_endpoint(client):
    c, _ = client(basic_closet())
    body = c.post("/api/outfits/generate", json={"occasion": "work", "weather": {"temp_c": 33, "feels_c": 38, "rain_pct": 80}}).json()
    assert {p["slot"] for p in body["pieces"]} == {"top", "bottom", "shoes"}
    assert body["reason"] and body["generator_v"]


def test_generate_needs_items(client):
    c, _ = client([piece("tee", "top")])
    res = c.post("/api/outfits/generate", json={})
    assert res.status_code == 409 and res.json()["detail"] == "need_items:bottom"


def test_wear_records_outfit_items_and_wear_log(client):
    c, db = client(basic_closet())
    today = outfits_router._utc_today().isoformat()
    res = c.post("/api/outfits/wear", json={"item_ids": ["cream_tee", "navy_trousers"], "reason": "Because.",
                                             "generator_v": "gen-rules-1", "worn_on": today, "occasion": "class"})
    assert res.status_code == 200, res.text
    assert res.json()["newly_logged"] == 2
    assert {r["slot"] for r in db.inserted["outfit_items"]} == {"top", "bottom"}
    assert all(r["outfit_id"] == "outfit-1" and r["worn_on"] == today for r in db.inserted["wear_log"])


def test_wear_rejects_far_dates_and_foreign_items(client):
    c, _ = client(basic_closet())
    base = {"reason": "x", "generator_v": "g", "item_ids": ["cream_tee"]}
    assert c.post("/api/outfits/wear", json={**base, "worn_on": "2020-01-01"}).status_code == 422
    today = outfits_router._utc_today().isoformat()
    assert c.post("/api/outfits/wear", json={**base, "item_ids": ["not_mine"], "worn_on": today}).status_code == 404
    assert c.post("/api/outfits/wear", json={**base, "reason": "", "worn_on": today}).status_code == 422
