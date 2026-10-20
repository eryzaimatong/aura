import json
from datetime import date, datetime, timezone

import httpx
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import CurrentUser, get_current_user
from app.deps import get_db
from app.ml.outfits import GENERATOR_VERSION, NotEnoughItems, Piece, Weather, generate
from app.schemas.outfits import GenerateIn, OutfitOut, OutfitPieceOut, SaveIn, SaveOut, WearIn, WearOut, WeatherOut
from app.ratelimit import generate_limit
from app.supabase_rest import Row, SupabaseRest
from app.weather import DEFAULT_LAT, DEFAULT_LON, DEFAULT_PLACE, current_weather

router = APIRouter(prefix="/api", tags=["outfits"])


def _utc_today() -> date:
    return datetime.now(timezone.utc).date()


def _check_local_date(d: date) -> None:
    """The client sends its own calendar date; it must be within a day of UTC (timezones)."""
    if abs((d - _utc_today()).days) > 1:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="date_out_of_range")


def _piece(row: Row, stats: dict[str, Row]) -> Piece:
    emb = row.get("embedding")
    vec = np.array(json.loads(emb) if isinstance(emb, str) else emb, dtype=np.float32) if emb else None
    colors = row.get("dominant_colors") or []
    lab = row.get("lab_primary")
    st = stats.get(row["id"], {})
    return Piece(
        id=row["id"], name=row["name"], category=row["category"], subcategory=row.get("subcategory"),
        in_palette=row.get("in_palette"), seasonality=row.get("seasonality"),
        color_name=colors[0].get("name") if colors else None,
        lab=(float(lab[0]), float(lab[1]), float(lab[2])) if lab else None,
        embedding=vec / np.linalg.norm(vec) if vec is not None and np.linalg.norm(vec) > 0 else None,
        wear_count=int(st.get("wear_count") or 0),
        last_worn=date.fromisoformat(st["last_worn"]) if st.get("last_worn") else None,
    )


async def _closet(db: SupabaseRest, user_id: str) -> list[Piece]:
    items = await db.select("closet_items", {
        "user_id": f"eq.{user_id}", "archived": "eq.false",
        "select": "id,name,category,subcategory,in_palette,seasonality,dominant_colors,lab_primary,embedding",
    })
    stats = await db.select("item_wear_stats", {"user_id": f"eq.{user_id}", "select": "item_id,wear_count,last_worn"})
    by_id = {s["item_id"]: s for s in stats}
    return [_piece(r, by_id) for r in items]


async def _season_name(db: SupabaseRest, user_id: str) -> str | None:
    cards = await db.select("aura_cards", {"user_id": f"eq.{user_id}", "is_current": "eq.true", "select": "season", "limit": "1"})
    season = cards[0].get("season") if cards else None
    return season.replace("_", " ").title() if season else None


@router.post("/outfits/generate", response_model=OutfitOut)
async def generate_outfit(body: GenerateIn, user: CurrentUser = Depends(generate_limit),
                          db: SupabaseRest = Depends(get_db)) -> OutfitOut:
    closet = await _closet(db, user.id)
    weather = Weather(body.weather.temp_c, body.weather.feels_c, body.weather.rain_pct) if body.weather else None
    require = None
    if body.require_id is not None:
        require = next((p for p in closet if p.id == body.require_id), None)
        if require is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="item_not_found")
    try:
        outfit = generate(closet, occasion=body.occasion, weather=weather, today=_utc_today(), seed=body.seed,
                          avoid=set(body.avoid_ids) - {body.require_id}, season_name=await _season_name(db, user.id),
                          require=require)
    except ValueError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="cannot_style_category") from None
    except NotEnoughItems as e:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"need_items:{','.join(e.missing)}") from None
    return OutfitOut(
        pieces=[OutfitPieceOut(id=p.id, slot=p.category) for p in outfit.pieces],
        reason=outfit.reason, tags=outfit.tags, note=outfit.note, occasion=body.occasion, generator_v=GENERATOR_VERSION,
    )


async def _record(db: SupabaseRest, user_id: str, body: SaveIn, *, saved: bool) -> tuple[str, list[str]]:
    """Writes `outfits` + `outfit_items` after checking every piece belongs to the user."""
    ids = list(dict.fromkeys(body.item_ids))
    owned = await db.select("closet_items", {"id": f"in.({','.join(ids)})", "user_id": f"eq.{user_id}", "select": "id,category"})
    if len(owned) != len(ids):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="item_not_found")
    outfit = await db.insert("outfits", {
        "user_id": user_id, "occasion": body.occasion, "reason": body.reason, "generator_v": body.generator_v,
        "weather_ctx": body.weather.model_dump() if body.weather else None, "saved": saved,
    })
    await db.insert_many("outfit_items", [{"outfit_id": outfit["id"], "item_id": r["id"], "slot": r["category"]} for r in owned])
    return outfit["id"], ids


@router.post("/outfits/save", response_model=SaveOut)
async def save_outfit(body: SaveIn, user: CurrentUser = Depends(get_current_user),
                      db: SupabaseRest = Depends(get_db)) -> SaveOut:
    """Keeps a look in Saved looks without logging a wear."""
    outfit_id, _ = await _record(db, user.id, body, saved=True)
    return SaveOut(outfit_id=outfit_id)


@router.post("/outfits/wear", response_model=WearOut)
async def wear_outfit(body: WearIn, user: CurrentUser = Depends(get_current_user),
                      db: SupabaseRest = Depends(get_db)) -> WearOut:
    """Records the outfit and logs a wear for each piece (one per item per day, duplicates skipped)."""
    _check_local_date(body.worn_on)
    outfit_id, ids = await _record(db, user.id, body, saved=False)
    logged = await db.insert_many(
        "wear_log",
        [{"user_id": user.id, "item_id": i, "outfit_id": outfit_id, "worn_on": body.worn_on.isoformat()} for i in ids],
        ignore_conflicts_on="user_id,item_id,worn_on",
    )
    return WearOut(outfit_id=outfit_id, newly_logged=len(logged))


@router.get("/weather", response_model=WeatherOut)
async def weather(lat: float | None = Query(None, ge=-90, le=90), lon: float | None = Query(None, ge=-180, le=180),
                  _: CurrentUser = Depends(get_current_user)) -> WeatherOut:
    use_default = lat is None or lon is None
    try:
        async with httpx.AsyncClient() as client:
            w = await current_weather(DEFAULT_LAT if use_default else lat, DEFAULT_LON if use_default else lon, client)  # type: ignore[arg-type]
    except (httpx.HTTPError, KeyError, ValueError):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="weather_unavailable") from None
    return WeatherOut(place=DEFAULT_PLACE if use_default else None, **w.as_dict())  # type: ignore[arg-type]
