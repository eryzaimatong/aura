"""Today's weather from Open-Meteo (free, no key), cached per coarse location."""

import time
from dataclasses import asdict, dataclass

import httpx

OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
CACHE_TTL_S = 30 * 60
LOOKAHEAD_H = 12
RAIN_FROM_PCT = 50

# Metro Manila: the default when the user hasn't shared a location.
DEFAULT_LAT, DEFAULT_LON, DEFAULT_PLACE = 14.6, 121.0, "Metro Manila"


@dataclass(frozen=True)
class WeatherNow:
    temp_c: float
    feels_c: float
    humidity: int
    rain_pct: int  # highest chance of rain over the next 12 hours
    rain_from_hour: int | None  # local hour (0-23) when rain chance first reaches 50%
    summary: str

    def as_dict(self) -> dict[str, object]:
        return asdict(self)


def _summary(code: int, temp_c: float, humidity: int) -> str:
    sky = ("clear" if code == 0 else "partly cloudy" if code <= 3 else "foggy" if code in (45, 48)
           else "drizzle" if 51 <= code <= 57 else "rain" if 61 <= code <= 67 or 80 <= code <= 82
           else "thunderstorms" if code >= 95 else "cloudy")
    return "humid" if humidity >= 70 and temp_c >= 26 and sky in ("clear", "partly cloudy", "cloudy") else sky


def parse(data: dict) -> WeatherNow:
    cur = data["current"]
    times: list[str] = data["hourly"]["time"]
    probs: list[int | None] = data["hourly"]["precipitation_probability"]
    now_hour = cur["time"][:13]  # "2026-10-14T15"
    start = next((i for i, t in enumerate(times) if t[:13] >= now_hour), 0)
    window = [(times[i], p or 0) for i, p in enumerate(probs[start:start + LOOKAHEAD_H], start)]
    first_wet = next((t for t, p in window if p >= RAIN_FROM_PCT), None)
    return WeatherNow(
        temp_c=round(float(cur["temperature_2m"]), 1),
        feels_c=round(float(cur["apparent_temperature"]), 1),
        humidity=int(cur["relative_humidity_2m"]),
        rain_pct=max((p for _, p in window), default=0),
        rain_from_hour=int(first_wet[11:13]) if first_wet else None,
        summary=_summary(int(cur["weather_code"]), float(cur["temperature_2m"]), int(cur["relative_humidity_2m"])),
    )


_cache: dict[tuple[float, float], tuple[float, WeatherNow]] = {}


async def current_weather(lat: float, lon: float, client: httpx.AsyncClient) -> WeatherNow:
    # One decimal ≈ 11 km: enough for weather, never a precise location.
    key = (round(lat, 1), round(lon, 1))
    hit = _cache.get(key)
    if hit and time.monotonic() - hit[0] < CACHE_TTL_S:
        return hit[1]
    res = await client.get(OPEN_METEO, params={
        "latitude": key[0], "longitude": key[1], "timezone": "auto", "forecast_days": 2,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code",
        "hourly": "precipitation_probability",
    }, timeout=8)
    res.raise_for_status()
    weather = parse(res.json())
    _cache[key] = (time.monotonic(), weather)
    return weather
