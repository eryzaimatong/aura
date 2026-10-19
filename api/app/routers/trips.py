from datetime import timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user
from app.deps import get_db
from app.ml.outfits import GENERATOR_VERSION, NotEnoughItems
from app.ml.trips import MAX_DAYS, TripDay, plan_trip
from app.routers.outfits import _closet, _season_name, _utc_today
from app.schemas.outfits import OutfitPieceOut
from app.schemas.trips import DayOut, GapOut, TripIn, TripLookOut, TripOut
from app.supabase_rest import SupabaseRest
from app.weather import FORECAST_DAYS_MAX, DayForecast, daily_forecast, geocode

router = APIRouter(prefix="/api", tags=["trips"])


@router.post("/trips/plan", response_model=TripOut)
async def plan(body: TripIn, user: CurrentUser = Depends(get_current_user),
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
