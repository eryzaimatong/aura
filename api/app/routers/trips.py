from datetime import timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser
from app.deps import get_db
from app.ml.outfits import GENERATOR_VERSION, NotEnoughItems
from app.ml.trips import MAX_DAYS, TripDay, plan_trip
from app.routers.outfits import _closet, _season_name, _utc_today
from app.ratelimit import plan_limit
from app.schemas.outfits import OutfitPieceOut
from app.schemas.trips import DayOut, GapOut, TripIn, TripLookOut, TripOut, WeekIn, WeekOut
from app.supabase_rest import SupabaseRest
from app.routers.outfits import _check_local_date
from app.weather import DEFAULT_LAT, DEFAULT_LON, DEFAULT_PLACE, FORECAST_DAYS_MAX, DayForecast, Place, daily_forecast, geocode

router = APIRouter(prefix="/api", tags=["trips"])


@router.post("/trips/plan", response_model=TripOut)
async def plan(body: TripIn, user: CurrentUser = Depends(plan_limit),
               db: SupabaseRest = Depends(get_db)) -> TripOut:
    today = _utc_today()
    n_days = (body.ends_on - body.starts_on).days + 1
    if n_days < 1 or n_days > MAX_DAYS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="trip_length")
    if body.starts_on < today - timedelta(days=1) or body.starts_on > today + timedelta(days=365):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="date_out_of_range")

    # Only the place name goes to Open-Meteo; never the user's own location.
    place_name, forecast = body.place.strip(), list[DayForecast]()
    try:
        async with httpx.AsyncClient() as client:
            found = await geocode(place_name, client)
            if found is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="place_not_found")
            place_name = found.name
            # One day of margin: the server runs on UTC, Open-Meteo counts in local time.
            horizon = today + timedelta(days=FORECAST_DAYS_MAX - 2)
            if body.starts_on <= horizon:
                end = min(body.ends_on, horizon)
                forecast = await daily_forecast(found, body.starts_on.isoformat(), end.isoformat(), client)
    except (httpx.HTTPError, KeyError, ValueError):
        forecast = []  # plan without weather rather than fail the trip

    by_date = {f.date: f for f in forecast}
    days = []
    for i in range(n_days):
        d = body.starts_on + timedelta(days=i)
        f = by_date.get(d.isoformat())
        days.append(TripDay(d, f.min_c, f.max_c, f.rain_pct) if f else TripDay(d))

    closet = await _closet(db, user.id)
    try:
        trip = plan_trip(closet, days, list(body.occasions), today=today, season_name=await _season_name(db, user.id))
    except NotEnoughItems as e:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"need_items:{','.join(e.missing)}") from None

    return TripOut(
        place=place_name, starts_on=body.starts_on, ends_on=body.ends_on, occasions=body.occasions,
        forecast=[DayOut(date=f.date, min_c=f.min_c, max_c=f.max_c, rain_pct=f.rain_pct) for f in forecast],  # type: ignore[arg-type]
        looks=[TripLookOut(label=lk.label, date=lk.on, occasion=lk.occasion,  # type: ignore[arg-type]
                           pieces=[OutfitPieceOut(id=p.id, slot=p.category) for p in lk.outfit.pieces],
                           reason=lk.outfit.reason, tags=lk.outfit.tags) for lk in trip.looks],
        packed_ids=[p.id for p in trip.packed],
        gaps=[GapOut(**g) for g in trip.gaps], layer_note=trip.layer_note, generator_v=GENERATOR_VERSION,
    )


WEEK_DAYS = 7


@router.post("/week/plan", response_model=WeekOut)
async def plan_week(body: WeekIn, user: CurrentUser = Depends(plan_limit),
                    db: SupabaseRest = Depends(get_db)) -> WeekOut:
    """Seven days of outfits from today, with the daily forecast for the user's area."""
    _check_local_date(body.start)
    use_default = body.lat is None or body.lon is None
    # One decimal ≈ 11 km: enough for weather, never a precise location.
    place = Place(DEFAULT_PLACE, DEFAULT_LAT, DEFAULT_LON) if use_default else Place("", round(body.lat, 1), round(body.lon, 1))  # type: ignore[arg-type]
    end = body.start + timedelta(days=WEEK_DAYS - 1)
    try:
        async with httpx.AsyncClient() as client:
            forecast = await daily_forecast(place, body.start.isoformat(), end.isoformat(), client)
    except (httpx.HTTPError, KeyError, ValueError):
        forecast = []

    by_date = {f.date: f for f in forecast}
    days, occasions = [], []
    for i in range(WEEK_DAYS):
        d = body.start + timedelta(days=i)
        f = by_date.get(d.isoformat())
        days.append(TripDay(d, f.min_c, f.max_c, f.rain_pct) if f else TripDay(d))
        occasions.append(body.weekend if d.weekday() >= 5 else body.weekday)

    closet = await _closet(db, user.id)
    try:
        week = plan_trip(closet, days, [], today=body.start, season_name=await _season_name(db, user.id), day_occasions=occasions)
    except NotEnoughItems as e:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"need_items:{','.join(e.missing)}") from None

    return WeekOut(
        place=DEFAULT_PLACE if use_default else None,
        forecast=[DayOut(date=f.date, min_c=f.min_c, max_c=f.max_c, rain_pct=f.rain_pct) for f in forecast],  # type: ignore[arg-type]
        looks=[TripLookOut(label=lk.label, date=lk.on, occasion=lk.occasion,  # type: ignore[arg-type]
                           pieces=[OutfitPieceOut(id=p.id, slot=p.category) for p in lk.outfit.pieces],
                           reason=lk.outfit.reason, tags=lk.outfit.tags) for lk in week.looks],
        generator_v=GENERATOR_VERSION,
    )
