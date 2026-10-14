from app.ml.rules import (
    COLOR_CONF_MIN,
    classify_color,
    classify_face_shape,
    season_for,
    undertone_from_lab,
    undertone_from_quiz,
)
from app.schemas.scan import LandmarkRatios, UndertoneAnswers


def ratios(**overrides: float) -> LandmarkRatios:
    base = dict(len_width=1.21, jaw_forehead=1.0, jaw_cheek=0.80, forehead_cheek=0.80, chin_jaw=0.65)
    return LandmarkRatios(**{**base, **overrides})


def test_face_shapes():
    assert classify_face_shape(ratios(len_width=1.45)).shape == "oblong"
    assert classify_face_shape(ratios(jaw_forehead=0.82, chin_jaw=0.5)).shape == "heart"
    assert classify_face_shape(ratios(len_width=1.15, jaw_cheek=0.9)).shape == "square"
    assert classify_face_shape(ratios(len_width=1.05)).shape == "round"
    assert classify_face_shape(ratios()).shape == "oval"


def test_shape_confidence_bounded():
    for r in [ratios(len_width=3.0), ratios(), ratios(len_width=0.9)]:
        assert 0.55 <= classify_face_shape(r).confidence <= 0.8


def test_undertone_from_lab():
    assert undertone_from_lab((60, 10, 25))[0] == "warm"   # yellow-leaning
    assert undertone_from_lab((60, 18, 14))[0] == "cool"   # pink-leaning
    assert undertone_from_lab((60, 12, 17))[0] == "neutral"


def test_seasons_cover_depth():
    assert season_for("warm", (72, 10, 25), None) == "light_spring"
    assert season_for("cool", (40, 12, 8), None) == "deep_winter"
    assert season_for("cool", (60, 8, 6), None) == "soft_summer"


def test_low_light_drops_confidence_below_threshold():
    good = classify_color((60, 10, 25), None, lighting_score=0.95)
    bad = classify_color((60, 10, 25), None, lighting_score=0.4)
    assert good.confidence >= COLOR_CONF_MIN > bad.confidence


def test_quiz_majority():
    assert undertone_from_quiz(UndertoneAnswers(veins="blue", metal="silver", sun="burn")) == ("cool", 0.75)
    assert undertone_from_quiz(UndertoneAnswers(veins="green", metal="gold", sun="burn_then_tan"))[0] == "warm"
    assert undertone_from_quiz(UndertoneAnswers(veins="blue", metal="gold", sun="burn_then_tan"))[0] == "neutral"
