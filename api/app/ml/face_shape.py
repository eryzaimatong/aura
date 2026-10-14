"""Face-shape inference: the trained model when present, the rule-based stub otherwise."""

import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from app.ml.features import FEATURES
from app.ml.rules import ShapeResult, classify_face_shape as classify_with_rules
from app.schemas.scan import LandmarkRatios

log = logging.getLogger("aura.ml")

MODEL_PATH = Path(__file__).parent / "models" / "face_shape.joblib"
RULES_VERSION = "fs-rules-0.1"


@lru_cache(maxsize=1)
def _bundle() -> dict[str, Any] | None:
    if not MODEL_PATH.exists():
        log.warning("face shape model not found at %s; using rule-based stub", MODEL_PATH)
        return None
    import joblib  # imported lazily so the API starts fast without the model

    bundle: dict[str, Any] = joblib.load(MODEL_PATH)
    if tuple(bundle["features"]) != FEATURES:
        raise RuntimeError(f"model features {bundle['features']} don't match app features {FEATURES}")
    if not bundle.get("launch_ok"):
        log.warning("face shape model %s has NOT passed the per-Monk-band launch gate (hard rule 11)", bundle["version"])
    return bundle


def model_version() -> str:
    bundle = _bundle()
    return bundle["version"] if bundle else RULES_VERSION


def classify_face_shape(r: LandmarkRatios) -> ShapeResult:
    bundle = _bundle()
    if bundle is None:
        return classify_with_rules(r)
    x = np.array([[getattr(r, f) for f in FEATURES]])
    proba = bundle["model"].predict_proba(x)[0]
    best = int(proba.argmax())
    # Calibrated probability of the chosen class: shown to the user as confidence.
    return ShapeResult(str(bundle["classes"][best]), round(float(proba[best]), 2))  # type: ignore[arg-type]
