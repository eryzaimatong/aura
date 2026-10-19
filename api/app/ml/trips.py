"""
Trip planner: one outfit per day (plus one per evening occasion) from the user's own closet,
nudged to reuse what's already packed, with honest gaps when the closet can't cover something.
"""

from dataclasses import dataclass, field
from datetime import date

import numpy as np

from app.ml.outfits import CLOSED_SHOES, COOL_FEELS_C, RAINY_PCT, Outfit, Piece, Weather, _occasion_fit, generate, occasion_vectors

# Occasions worn once per trip, in the evening, rather than every day.
EVENING = ("date", "formal")
EVENING_LABEL = {"date": "Dinner out", "formal": "Formal event"}
MAX_DAYS = 14


@dataclass(frozen=True)
class TripDay:
    on: date
    min_c: float | None = None
    max_c: float | None = None
    rain_pct: int | None = None

    @property
    def weather(self) -> Weather | None:
        if self.max_c is None:
            return None
        return Weather(self.max_c, self.max_c, float(self.rain_pct or 0))


@dataclass
class TripLook:
    label: str
    on: date | None
    occasion: str | None
    outfit: Outfit


@dataclass
class TripPlan:
    looks: list[TripLook]
    packed: list[Piece]
    gaps: list[dict[str, str]] = field(default_factory=list)
    layer_note: str | None = None


def plan_trip(closet: list[Piece], days: list[TripDay], occasions: list[str], *,
              today: date, season_name: str | None = None) -> TripPlan:
    """`occasions`: the trip's occasions; daytime ones rotate across days, evening ones get one look each."""
    daytime = [o for o in occasions if o not in EVENING] or ["casual"]
    evenings = [o for o in occasions if o in EVENING]
    packed: dict[str, Piece] = {}
    looks: list[TripLook] = []
    prev: set[str] = set()

    def add(label: str, on: date | None, occasion: str, w: Weather | None, seed: int) -> None:
        nonlocal prev
        o = generate(closet, occasion=occasion, weather=w, today=on or today, seed=seed,
                     avoid=prev, season_name=season_name, prefer=set(packed))
        looks.append(TripLook(label, on, occasion, o))
        for p in o.pieces:
            packed.setdefault(p.id, p)
        # Only the base (top/bottom/dress) needs to change day to day; shoes and layers can repeat.
        prev = {p.id for p in o.pieces if p.category in ("top", "bottom", "dress")}

    for i, d in enumerate(days):
        add(d.on.strftime("%a %d %b").replace(" 0", " "), d.on, daytime[i % len(daytime)], d.weather, i)
    for j, occ in enumerate(evenings):
        night = days[min(j + 1, len(days) - 1)]
        add(EVENING_LABEL[occ], None, occ, night.weather, 100 + j)

    gaps: list[dict[str, str]] = []
    layer_note = None
    cool_nights = [d for d in days if d.min_c is not None and d.min_c < COOL_FEELS_C]
    if cool_nights and not any(p.category == "outerwear" for p in packed.values()):
        layers = [p for p in closet if p.category == "outerwear"]
        coldest = round(min(d.min_c for d in cool_nights))  # type: ignore[type-var]
        if layers:
            best = min(layers, key=lambda p: (p.seasonality == "warm", -p.wear_count))
            packed[best.id] = best
            layer_note = f"Nights drop to {coldest}°C, so I packed your {best.name.lower()} as a layer."
        else:
            gaps.append({"kind": "warm_layer",
                         "text": f"Nights drop to {coldest}°C and there's no jacket or cardigan in your closet yet. Add one if you have one."})

    if any((d.rain_pct or 0) >= RAINY_PCT for d in days) and not any(
            p.category == "shoes" and p.subcategory in CLOSED_SHOES for p in closet):
        gaps.append({"kind": "closed_shoes",
                     "text": "Rain is likely and there are no closed shoes in your closet yet. Sneakers, flats or boots would keep you dry."})

    vecs = occasion_vectors()
    for look in looks:
        if look.occasion == "formal" and vecs and float(np.mean([_occasion_fit(p, "formal", vecs) for p in look.outfit.pieces])) <= 0:
            gaps.append({"kind": "dressy_piece",
                         "text": "Nothing in your closet reads as dressy yet, so the formal look is the closest match. A dressier piece would help."})

    order = {"top": 0, "dress": 1, "bottom": 2, "outerwear": 3, "shoes": 4, "bag": 5, "accessory": 6}
    return TripPlan(looks, sorted(packed.values(), key=lambda p: order.get(p.category, 9)), gaps, layer_note)
