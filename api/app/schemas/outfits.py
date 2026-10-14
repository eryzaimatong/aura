from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Occasion = Literal["casual", "class", "work", "date", "formal", "travel"]


class WeatherIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    temp_c: float = Field(ge=-30, le=60)
    feels_c: float = Field(ge=-40, le=70)
    rain_pct: float = Field(ge=0, le=100)


class WeatherOut(BaseModel):
    place: str | None
    temp_c: float
    feels_c: float
    humidity: int
    rain_pct: int
    rain_from_hour: int | None
    summary: str


class GenerateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    occasion: Occasion | None = None
    weather: WeatherIn | None = None
    # Bump on "Shuffle" / "Show another" for a different outfit.
    seed: int = Field(default=0, ge=0, le=2**31)
    # The outfit just shown, so the next one moves away from it.
    avoid_ids: Annotated[list[str], Field(max_length=10)] = []


class OutfitPieceOut(BaseModel):
    id: str
    slot: str


class OutfitOut(BaseModel):
    pieces: list[OutfitPieceOut]
    # Hard rule 7: never empty.
    reason: str = Field(min_length=1)
    tags: list[str]
    note: str | None
    occasion: Occasion | None
    generator_v: str


class WearIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_ids: Annotated[list[str], Field(min_length=1, max_length=8)]
    occasion: Occasion | None = None
    weather: WeatherIn | None = None
    reason: str = Field(min_length=1, max_length=500)
    generator_v: str = Field(min_length=1, max_length=40)
    # The user's local calendar date (the server runs on UTC).
    worn_on: date


class WearOut(BaseModel):
    outfit_id: str
    newly_logged: int
