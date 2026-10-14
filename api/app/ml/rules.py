"""
Rule-based classifiers.

- Face shape: fallback only. The trained model (app/ml/face_shape.py) is used when
  its file is present.
- Colour season/undertone: still rule-based. TODO: train once corrections (step 8)
  give real labels. Thresholds are uncalibrated, so confidences are capped.
"""

import math
from dataclasses import dataclass

from app.ml.palettes import PALETTES
from app.schemas.scan import ColorSeason, FaceShape, LandmarkRatios, UndertoneAnswers, Undertone

COLOR_VERSION = "color-rules-0.1"

# Below this, colour is not trusted: no season is shown, the quiz takes over.
COLOR_CONF_MIN = 0.55

# Uncalibrated rules can't justify near-certainty, whatever the lighting (hard rule 10:
# shown confidence must be honest). Same ceiling as the shape rules. Lift in step 7.
STUB_CONF_MAX = 0.8


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


@dataclass(frozen=True)
class ShapeResult:
    shape: FaceShape
    confidence: float


def classify_face_shape(r: LandmarkRatios) -> ShapeResult:
    """First matching rule wins; confidence grows with the margin past its threshold."""
    if r.len_width >= 1.32:
        return ShapeResult("oblong", _margin_conf(r.len_width - 1.32, 0.15))
    if r.jaw_forehead <= 0.90 and r.chin_jaw <= 0.55:
        return ShapeResult("heart", _margin_conf(0.90 - r.jaw_forehead, 0.10))
    if r.len_width <= 1.18 and r.jaw_cheek >= 0.86:
        return ShapeResult("square", _margin_conf(r.jaw_cheek - 0.86, 0.08))
    if r.len_width <= 1.10:
        return ShapeResult("round", _margin_conf(1.10 - r.len_width, 0.10))
    # Oval: balanced proportions — most confident near the middle of its band.
    centre_dist = abs(r.len_width - 1.21) / 0.11
    return ShapeResult("oval", round(0.55 + 0.25 * _clamp(1 - centre_dist), 2))


def _margin_conf(margin: float, full_at: float) -> float:
    return round(0.55 + 0.25 * _clamp(margin / full_at), 2)


@dataclass(frozen=True)
class ColorResult:
    undertone: Undertone
    season: ColorSeason
    confidence: float


def undertone_from_lab(lab_skin: tuple[float, float, float]) -> tuple[Undertone, float]:
    """Hue angle of skin: yellower (higher) reads warm, pinker (lower) reads cool."""
    _, a, b = lab_skin
    hue = math.degrees(math.atan2(b, a))
    if hue >= 60:
        return "warm", _clamp((hue - 60) / 10)
    if hue <= 50:
        return "cool", _clamp((50 - hue) / 10)
    return "neutral", _clamp(1 - abs(hue - 55) / 5)


def season_for(undertone: Undertone, lab_skin: tuple[float, float, float],
               lab_eye: tuple[float, float, float] | None) -> ColorSeason:
    L, a, b = lab_skin
    chroma = math.hypot(a, b)
    light, deep = L >= 68, L <= 45
    bright, soft = chroma >= 24, chroma <= 16
    high_contrast = lab_eye is not None and abs(L - lab_eye[0]) >= 35

    if undertone == "warm":
        if light:
            return "light_spring"
        if deep:
            return "deep_autumn"
        if bright or high_contrast:
            return "bright_spring"
        if soft:
            return "soft_autumn"
        return "true_spring" if L >= 58 else "true_autumn"
    if undertone == "cool":
        if light:
            return "light_summer"
        if deep:
            return "deep_winter"
        if bright or high_contrast:
            return "bright_winter"
        if soft:
            return "soft_summer"
        return "true_summer" if L >= 58 else "true_winter"
    # neutral: lean by yellowness
    yellow = b >= 18
    if light:
        return "light_spring" if yellow else "light_summer"
    if deep:
        return "deep_autumn" if yellow else "deep_winter"
    return "soft_autumn" if yellow else "soft_summer"


def classify_color(lab_skin: tuple[float, float, float], lab_eye: tuple[float, float, float] | None,
                   lighting_score: float) -> ColorResult:
    undertone, margin = undertone_from_lab(lab_skin)
    confidence = round(min(STUB_CONF_MAX, lighting_score * (0.6 + 0.4 * margin)), 2)
    return ColorResult(undertone, season_for(undertone, lab_skin, lab_eye), confidence)


_COOL = {"blue", "silver", "burn"}
_WARM = {"green", "gold", "tan"}


def undertone_from_quiz(answers: UndertoneAnswers) -> tuple[Undertone, float]:
    picks = [answers.veins, answers.metal, answers.sun]
    cool = sum(p in _COOL for p in picks)
    warm = sum(p in _WARM for p in picks)
    if cool >= 2:
        return "cool", 0.75 if cool == 3 else 0.6
    if warm >= 2:
        return "warm", 0.75 if warm == 3 else 0.6
    return "neutral", 0.5


def palette_for(season: ColorSeason) -> list[str]:
    return list(PALETTES[season])
