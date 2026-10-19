from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.outfits import Occasion, OutfitPieceOut

TripOccasion = Literal["casual", "work", "date", "formal", "travel"]


class TripIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    place: str = Field(min_length=2, max_length=80)
    starts_on: date
    ends_on: date
    occasions: Annotated[list[TripOccasion], Field(min_length=1, max_length=5)]


class DayOut(BaseModel):
    date: date
    min_c: float
    max_c: float
    rain_pct: int


class TripLookOut(BaseModel):
    label: str
    date: date | None
    occasion: Occasion | None
    pieces: list[OutfitPieceOut]
    # Hard rule 7: never empty.
    reason: str = Field(min_length=1)
    tags: list[str]


class GapOut(BaseModel):
    kind: str
    text: str


class TripOut(BaseModel):
    place: str
    starts_on: date
    ends_on: date
    occasions: list[TripOccasion]
    # Empty when the dates are past the 16-day forecast horizon (or the forecast was unavailable).
    forecast: list[DayOut]
    looks: list[TripLookOut]
    packed_ids: list[str]
    gaps: list[GapOut]
    layer_note: str | None
    generator_v: str
