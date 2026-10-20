from datetime import date, timedelta

import httpx

from app.ml.trips import TripDay, plan_trip
from app.routers import outfits as outfits_router
from app.routers import trips as trips_router
from app.weather import DayForecast, Place
from tests.test_outfits import TODAY, basic_closet, client, piece  # noqa: F401  (client is a fixture)


def days(n: int, **kw) -> list[TripDay]:
    return [TripDay(TODAY + timedelta(days=i), **kw) for i in range(n)]


def test_one_look_per_day_plus_evenings_and_reuse():
    plan = plan_trip(basic_closet(), days(4), ["casual", "date"], today=TODAY)
    assert len(plan.looks) == 5 and plan.looks[-1].label == "Dinner out"
    assert all(lk.outfit.reason for lk in plan.looks)
    used = {p.id for lk in plan.looks for p in lk.outfit.pieces}
    assert {p.id for p in plan.packed} >= used
    assert len(plan.packed) < sum(len(lk.outfit.pieces) for lk in plan.looks)  # pieces get reused


def test_consecutive_days_change_the_base():
    plan = plan_trip(basic_closet(), days(3), ["casual"], today=TODAY)
    for a, b in zip(plan.looks, plan.looks[1:]):
        base = lambda lk: {p.id for p in lk.outfit.pieces if p.category in ("top", "bottom", "dress")}  # noqa: E731
        assert base(a) != base(b)


def test_cool_nights_pack_a_layer_or_flag_the_gap():
    cool = days(2, min_c=14, max_c=22, rain_pct=10)
    closet = basic_closet() + [piece("denim_jacket", "outerwear", "jacket")]
    plan = plan_trip(closet, cool, ["casual"], today=TODAY)
    assert "denim_jacket" in {p.id for p in plan.packed}
    no_layer = plan_trip(basic_closet(), cool, ["casual"], today=TODAY)
    assert [g["kind"] for g in no_layer.gaps] == ["warm_layer"] and "14°C" in no_layer.gaps[0]["text"]


def test_rain_without_closed_shoes_is_a_gap():
    closet = [p for p in basic_closet() if p.id != "white_sneakers"]
    plan = plan_trip(closet, days(2, min_c=24, max_c=30, rain_pct=80), ["casual"], today=TODAY)
    assert "closed_shoes" in {g["kind"] for g in plan.gaps}


def test_plan_endpoint(client, monkeypatch):
    async def fake_geocode(name, _):
        return Place("Baguio City", 16.41, 120.59)

    async def fake_forecast(place, start, end, _):
        return [DayForecast(start, 15.0, 23.0, 70)]

    monkeypatch.setattr(trips_router, "geocode", fake_geocode)
    monkeypatch.setattr(trips_router, "daily_forecast", fake_forecast)
    c, _ = client(basic_closet())
    start = outfits_router._utc_today() + timedelta(days=2)
    res = c.post("/api/trips/plan", json={"place": "baguio", "starts_on": start.isoformat(),
                                          "ends_on": (start + timedelta(days=2)).isoformat(), "occasions": ["casual", "formal"]})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["place"] == "Baguio City" and len(body["forecast"]) == 1 and len(body["looks"]) == 4
    assert body["looks"][-1]["label"] == "Formal event" and all(lk["reason"] for lk in body["looks"])
    assert any(g["kind"] == "warm_layer" for g in body["gaps"])


def test_plan_rejects_long_trips_and_unknown_places(client, monkeypatch):
    async def none(name, _):
        return None

    monkeypatch.setattr(trips_router, "geocode", none)
    c, _ = client(basic_closet())
    start = outfits_router._utc_today()
    base = {"place": "Nowhere", "starts_on": start.isoformat(), "occasions": ["casual"]}
    assert c.post("/api/trips/plan", json={**base, "ends_on": (start + timedelta(days=20)).isoformat()}).status_code == 422
    assert c.post("/api/trips/plan", json={**base, "ends_on": start.isoformat()}).status_code == 404
    assert c.post("/api/trips/plan", json={**base, "ends_on": start.isoformat(), "occasions": ["class"]}).status_code == 422


def test_week_plan_uses_weekday_and_weekend_occasions(client, monkeypatch):
    seen = {}

    async def fake_forecast(place, start, end, _):
        seen["place"] = place
        return [DayForecast(start, 25.0, 32.0, 20)]

    monkeypatch.setattr(trips_router, "daily_forecast", fake_forecast)
    c, _ = client(basic_closet())
    today = outfits_router._utc_today()
    res = c.post("/api/week/plan", json={"start": today.isoformat(), "weekday": "work", "weekend": "casual", "lat": 14.5547, "lon": 121.0244})
    assert res.status_code == 200, res.text
    body = res.json()
    assert len(body["looks"]) == 7 and all(lk["reason"] for lk in body["looks"])
    for lk in body["looks"]:
        weekend = date.fromisoformat(lk["date"]).weekday() >= 5
        assert lk["occasion"] == ("casual" if weekend else "work")
    assert (seen["place"].lat, seen["place"].lon) == (14.6, 121.0)  # rounded, never precise
    assert body["place"] is None


def test_week_plan_defaults_and_rejects_far_dates(client, monkeypatch):
    async def fail(*_):
        raise httpx.ConnectError("offline")

    monkeypatch.setattr(trips_router, "daily_forecast", fail)
    c, _ = client(basic_closet())
    body = c.post("/api/week/plan", json={"start": outfits_router._utc_today().isoformat()}).json()
    assert body["place"] == "Metro Manila" and body["forecast"] == [] and len(body["looks"]) == 7
    assert c.post("/api/week/plan", json={"start": "2020-01-01"}).status_code == 422
