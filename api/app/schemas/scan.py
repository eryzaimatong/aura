"""Scan payloads. Privacy rule 1/2: numbers only — extra fields (e.g. an image) are rejected."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

FaceShape = Literal["heart", "oblong", "oval", "round", "square"]
Undertone = Literal["cool", "warm", "neutral"]
ColorSeason = Literal[
    "true_spring", "light_spring", "bright_spring",
    "true_summer", "light_summer", "soft_summer",
    "true_autumn", "soft_autumn", "deep_autumn",
    "true_winter", "bright_winter", "deep_winter",
]
CardSource = Literal["model", "quiz", "user_corrected"]
DeviceHint = Literal["browser", "ios", "android"]

Ratio = Annotated[float, Field(gt=0.1, lt=5.0)]
# CIELAB: L* 0..100, a*/b* -128..128
Lab = tuple[
    Annotated[float, Field(ge=0, le=100)],
    Annotated[float, Field(ge=-128, le=128)],
    Annotated[float, Field(ge=-128, le=128)],
]


class LandmarkRatios(BaseModel):
    """Five ratios from MediaPipe landmarks. Definitions: web/src/lib/face/ratios.ts."""

    model_config = ConfigDict(extra="forbid")

    len_width: Ratio
    jaw_forehead: Ratio
    jaw_cheek: Ratio
    forehead_cheek: Ratio
    chin_jaw: Ratio


class ScanIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    landmark_ratios: LandmarkRatios
    lab_skin: Lab
    lab_eye: Lab | None = None
    lab_hair: Lab | None = None
    monk_band: int = Field(ge=1, le=10)
    lighting_score: float = Field(ge=0, le=1)
    device_hint: DeviceHint = "browser"


class AuraCardOut(BaseModel):
    id: str
    scan_id: str | None
    face_shape: FaceShape
    shape_conf: float
    season: ColorSeason | None
    season_conf: float | None
    skin_undertone: Undertone | None
    palette: list[str]
    source: CardSource
    created_at: str


class ScanOut(BaseModel):
    scan_id: str
    card: AuraCardOut
    # Hard rule 10: low colour confidence goes to the undertone quiz, never a guess.
    needs_quiz: bool
    color_conf: float


NotSure = Literal["not_sure"]


class CorrectionIn(BaseModel):
    """What the user says is off. Each field present becomes one card_corrections row."""

    model_config = ConfigDict(extra="forbid")

    face_shape: FaceShape | NotSure | None = None
    season: ColorSeason | NotSure | None = None
    undertone: Undertone | NotSure | None = None

    @model_validator(mode="after")
    def _at_least_one(self) -> "CorrectionIn":
        if self.face_shape is None and self.season is None and self.undertone is None:
            raise ValueError("pick at least one thing to correct")
        return self


class UndertoneAnswers(BaseModel):
    model_config = ConfigDict(extra="forbid")

    veins: Literal["blue", "green", "unsure"]
    metal: Literal["silver", "gold", "both"]
    sun: Literal["burn", "tan", "burn_then_tan"]
