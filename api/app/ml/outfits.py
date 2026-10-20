"""
Outfit generator: picks pieces from the user's own closet and says why.

Score = per-piece fit (occasion via CLIP, weather, palette, freshness)
      + colour harmony (CIELAB hue/chroma) + style coherence (CLIP image similarity).
A seeded jitter makes "Shuffle" give a different, still-good outfit each time.
Hard rule 7: every outfit carries a reason built from what actually drove the pick.
"""

import math
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from itertools import combinations, product

import numpy as np

from app.ml.model_files import CLIP_PROMPTS

GENERATOR_VERSION = "gen-rules-1"

HOT_FEELS_C = 30
COOL_FEELS_C = 22
RAINY_PCT = 60
CLOSED_SHOES = {"sneakers", "boots", "flats"}

OCCASION_PHRASE = {
    "casual": "easy and relaxed",
    "class": "comfortable enough for a full day of class",
    "work": "polished enough for work",
    "date": "a little dressed up for a date",
    "formal": "dressed up for the occasion",
    "travel": "comfortable for a day on the go",
}
OCCASION_TAG = {"casual": "Casual", "class": "Class day", "work": "Work day", "date": "Date night", "formal": "Formal", "travel": "Travel day"}


@dataclass(frozen=True)
class Weather:
    temp_c: float
    feels_c: float
    rain_pct: float


@dataclass
class Piece:
    id: str
    name: str
    category: str
    subcategory: str | None = None
    in_palette: bool | None = None
    seasonality: str | None = None
    color_name: str | None = None
    lab: tuple[float, float, float] | None = None
    embedding: np.ndarray | None = None
    wear_count: int = 0
    last_worn: date | None = None


@dataclass
class Outfit:
    pieces: list[Piece]
    score: float
    reason: str
    tags: list[str]
    note: str | None = None


class NotEnoughItems(Exception):
    def __init__(self, missing: list[str]) -> None:
        super().__init__(f"need: {', '.join(missing)}")
        self.missing = missing


@lru_cache(maxsize=1)
def occasion_vectors() -> dict[str, np.ndarray]:
    """CLIP text embeddings per occasion; empty if the prompt file predates occasions."""
    if not CLIP_PROMPTS.exists():
        return {}
    data = np.load(CLIP_PROMPTS)
    if "occasion_keys" not in data:
        return {}
    return {str(k): v for k, v in zip(data["occasion_keys"], data["occasion_embeddings"])}


# ---------- per-piece fit ----------

def _occasion_fit(p: Piece, occasion: str | None, vecs: dict[str, np.ndarray]) -> float:
    """How much more this piece suits `occasion` than occasions in general (CLIP)."""
    if not occasion or p.embedding is None or occasion not in vecs:
        return 0.0
    sims = {k: float(v @ p.embedding) for k, v in vecs.items()}
    return 25 * (sims[occasion] - float(np.mean(list(sims.values()))))


def _weather_fit(p: Piece, w: Weather | None) -> float:
    if w is None:
        return 0.0
    s = 0.0
    if w.feels_c >= HOT_FEELS_C:
        s += {"cool": -1.5, "warm": 0.4}.get(p.seasonality or "", 0.0)
        if p.category == "outerwear":
            s -= 1.0
    elif w.feels_c < COOL_FEELS_C:
        s += {"warm": -0.5}.get(p.seasonality or "", 0.0) + (0.5 if p.category == "outerwear" else 0.0)
    if w.rain_pct >= RAINY_PCT and p.category == "shoes":
        s += 0.5 if p.subcategory in CLOSED_SHOES else -1.5 if p.subcategory == "sandals" else 0.0
    return s


def piece_score(p: Piece, occasion: str | None, w: Weather | None, today: date, avoid: set[str], vecs: dict[str, np.ndarray],
                prefer: frozenset[str] | set[str] = frozenset()) -> float:
    s = _occasion_fit(p, occasion, vecs) + _weather_fit(p, w)
    if p.in_palette:
        s += 0.5
    if p.last_worn is not None and (today - p.last_worn).days < 2:
        s -= 1.0  # worn yesterday or today
    if p.wear_count == 0:
        s += 0.3  # give unworn pieces an outing (closet utilisation)
    if p.id in avoid:
        s -= 0.8  # shuffle: move away from the outfit just shown
    if p.id in prefer:
        s += 0.6  # trip packing: reuse what's already in the bag
    return s


# ---------- combination ----------

def _hue_chroma(lab: tuple[float, float, float]) -> tuple[float, float]:
    return math.degrees(math.atan2(lab[2], lab[1])) % 360, math.hypot(lab[1], lab[2])


def _is_neutral(lab: tuple[float, float, float] | None) -> bool:
    return lab is None or lab[0] < 22 or _hue_chroma(lab)[1] < 12


def harmony(pieces: list[Piece]) -> float:
    s = 0.0
    for a, b in combinations([p.lab for p in pieces if not _is_neutral(p.lab)], 2):
        dh = abs(_hue_chroma(a)[0] - _hue_chroma(b)[0])  # type: ignore[arg-type]
        dh = min(dh, 360 - dh)
        s += 0.3 if dh < 30 else 0.1 if dh > 150 else -0.4
    loud = sum(1 for p in pieces if p.lab is not None and _hue_chroma(p.lab)[1] > 35)
    return s - (0.6 if loud >= 3 else 0.0)


def coherence(pieces: list[Piece]) -> float:
    embs = [p.embedding for p in pieces if p.embedding is not None]
    if len(embs) < 2:
        return 0.0
    sims = [float(a @ b) for a, b in combinations(embs, 2)]
    return 3 * (float(np.mean(sims)) - 0.6)


STYLABLE = {"top", "bottom", "dress", "shoes", "outerwear", "bag"}


def _search(by_cat: dict[str, list[Piece]], scores: dict[str, float],
            require: Piece | None = None) -> tuple[list[Piece], float]:
    req = require.category if require is not None else None

    def top(cat: str, k: int) -> list[Piece]:
        if require is not None and req == cat:
            return [require]  # "style this piece": the slot is fixed
        return sorted(by_cat.get(cat, []), key=lambda p: -scores[p.id])[:k]

    pairs = [[t, b] for t, b in product(top("top", 4), top("bottom", 4))]
    bases = pairs if req in ("top", "bottom") else [[require]] if req == "dress" else pairs + [[d] for d in top("dress", 4)]
    if not bases:
        missing = ["dress or a top and a bottom"]
        if by_cat.get("top") and not by_cat.get("bottom"):
            missing = ["bottom"]
        elif by_cat.get("bottom") and not by_cat.get("top"):
            missing = ["top"]
        raise NotEnoughItems(missing)
    shoes = top("shoes", 3) or [None]  # shoes are required when you own any
    outer = top("outerwear", 1) if req == "outerwear" else [p for p in top("outerwear", 2) if scores[p.id] > 0.3] + [None]
    bags = top("bag", 1) if req == "bag" else [p for p in top("bag", 1) if scores[p.id] > 0.3] + [None]

    best: tuple[list[Piece], float] = ([], -math.inf)
    for base, sh, ow, bag in product(bases, shoes, outer, bags):
        pieces = [*base, *(x for x in (sh, ow, bag) if x is not None)]
        total = sum(scores[p.id] for p in pieces) + harmony(pieces) + coherence(pieces)
        if total > best[1]:
            best = (pieces, total)
    return best


def generate(closet: list[Piece], *, occasion: str | None, weather: Weather | None, today: date,
             seed: int = 0, avoid: set[str] | None = None, season_name: str | None = None,
             prefer: set[str] | None = None, require: Piece | None = None) -> Outfit:
    """`require`: build the outfit around this piece (must be in `closet`, a category in STYLABLE)."""
    if require is not None and require.category not in STYLABLE:
        raise ValueError(f"can't build an outfit around a {require.category}")
    avoid = avoid or set()
    prefer = prefer or set()
    vecs = occasion_vectors()
    by_cat: dict[str, list[Piece]] = {}
    for p in closet:
        by_cat.setdefault(p.category, []).append(p)

    # Same jitter for both runs so the weather comparison below is like-for-like.
    jitter = {p.id: float(j) for p, j in zip(closet, np.random.default_rng(seed).gumbel(0, 0.6, len(closet)))}
    scores = {p.id: piece_score(p, occasion, weather, today, avoid, vecs, prefer) + jitter[p.id] for p in closet}
    pieces, total = _search(by_cat, scores, require)

    note = None
    if weather is not None:
        dry = {p.id: piece_score(p, occasion, None, today, avoid, vecs, prefer) + jitter[p.id] for p in closet}
        note = _swap_note(_search(by_cat, dry, require)[0], pieces, weather)

    # Only claim "polished enough for work" when the chosen pieces actually lean that way.
    fits = occasion is not None and float(np.mean([_occasion_fit(p, occasion, vecs) for p in pieces])) > 0
    reason, tags = explain(pieces, occasion, weather, season_name, occasion_fits=fits, around=require)
    return Outfit(pieces, round(total, 3), reason, tags, note)


def _swap_note(without: list[Piece], chosen: list[Piece], w: Weather) -> str | None:
    """When the weather changed a pick, say so (the mockup's "rain check")."""
    for old in without:
        new = next((p for p in chosen if p.category == old.category), None)
        if new is not None and new.id != old.id:
            check = "rain check" if w.rain_pct >= RAINY_PCT else "heat check" if w.feels_c >= HOT_FEELS_C else "weather check"
            return f"{check}: I swapped your {old.name.lower()} for the {new.name.lower()}"
    return None


# ---------- explanation (hard rule 7) ----------

def explain(pieces: list[Piece], occasion: str | None, w: Weather | None, season_name: str | None,
            occasion_fits: bool = True, around: Piece | None = None) -> tuple[str, list[str]]:
    phrases: list[str] = [f"built around your {around.name.lower()}"] if around is not None else []
    tags: list[str] = []
    hot = w is not None and w.feels_c >= HOT_FEELS_C
    closed = any(p.category == "shoes" and p.subcategory in CLOSED_SHOES for p in pieces)
    if hot:
        light = any(p.seasonality == "warm" for p in pieces)
        phrases.append(f"{'light, breathable pieces' if light else 'nothing too heavy'} for {round(w.feels_c)}°C")  # type: ignore[union-attr]
        tags.append("Heat friendly")
    if w is not None and w.rain_pct >= RAINY_PCT and closed:
        phrases.append("closed shoes for the rain")
        tags.append("Rain ready")

    in_pal = [p for p in pieces if p.in_palette]
    if len(in_pal) >= 2:
        where = f"your {season_name} palette" if season_name else "your palette"
        phrases.append(f"every piece in {where}" if len(in_pal) == len(pieces) else f"{len(in_pal)} pieces from {where}")
        tags.append("In your palette")

    if occasion in OCCASION_PHRASE:
        tags.append(OCCASION_TAG[occasion])
        if occasion_fits:
            phrases.append(OCCASION_PHRASE[occasion])

    accents = [p for p in pieces if not _is_neutral(p.lab)]
    if not accents:
        phrases.append("neutrals that go with everything")
    elif len(accents) == 1 and accents[0].color_name:
        phrases.append(f"one {accents[0].color_name} accent against calm neutrals")
    elif harmony(pieces) > 0:
        phrases.append("tonal colors that sit softly together")

    unworn = next((p for p in pieces if p.wear_count == 0 and p is not around), None)
    if unworn is not None:
        phrases.append(f"a first outing for the {unworn.name.lower()}")

    phrases = phrases[:3] or ["pieces from your own closet that work together"]
    text = phrases[0] if len(phrases) == 1 else ", ".join(phrases[:-1]) + " and " + phrases[-1]
    return text[0].upper() + text[1:] + ".", tags
