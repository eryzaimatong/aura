"""
Python twin of web/src/lib/face/{ratios,color,analyze}.ts.

The app measures faces on-device in TypeScript; training measures the dataset here.
Both must produce the same numbers, so indices, formulas and filters are kept identical.
Change one side, change the other.
"""

import math
from dataclasses import dataclass

import numpy as np

# MediaPipe face-mesh indices (see LM in ratios.ts)
FOREHEAD_TOP, CHIN = 10, 152
CHEEKBONE_L, CHEEKBONE_R = 234, 454
JAW_L, JAW_R = 172, 397
FOREHEAD_L, FOREHEAD_R = 54, 284
CHIN_L, CHIN_R = 176, 400
NOSE_TIP = 1
CHEEK_PATCH_L, CHEEK_PATCH_R = 50, 280

# Model input order — the trained model depends on it.
FEATURES = ("len_width", "jaw_forehead", "jaw_cheek", "forehead_cheek", "chin_jaw")

# Same gates as analyze.ts: frames the app would refuse are not trained on either.
MAX_YAW = 0.12
MIN_FACE_SHARE = 0.18
MAX_SIDE = 1280  # capture.ts downscales to this before analysis

Point = tuple[float, float]


def _dist(a: Point, b: Point) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def compute_ratios(p: list[Point]) -> dict[str, float]:
    cheek = _dist(p[CHEEKBONE_L], p[CHEEKBONE_R])
    jaw = _dist(p[JAW_L], p[JAW_R])
    forehead = _dist(p[FOREHEAD_L], p[FOREHEAD_R])
    r = {
        "len_width": _dist(p[FOREHEAD_TOP], p[CHIN]) / cheek,
        "jaw_forehead": jaw / forehead,
        "jaw_cheek": jaw / cheek,
        "forehead_cheek": forehead / cheek,
        "chin_jaw": _dist(p[CHIN_L], p[CHIN_R]) / jaw,
    }
    return {k: round(v, 4) for k, v in r.items()}


@dataclass(frozen=True)
class Geometry:
    face_width_px: float
    yaw: float


def face_geometry(p: list[Point]) -> Geometry:
    l, r = p[CHEEKBONE_L], p[CHEEKBONE_R]
    width = _dist(l, r)
    mid_x = (l[0] + r[0]) / 2
    return Geometry(width, (p[NOSE_TIP][0] - mid_x) / width)


# ---------- colour (color.ts) ----------

def _srgb_to_linear(c: np.ndarray) -> np.ndarray:
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_lab(rgb: np.ndarray) -> tuple[float, float, float]:
    r, g, b = (float(v) for v in rgb)
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883

    def f(t: float) -> float:
        return math.cbrt(t) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116

    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def hex_to_lab(hex_color: str) -> tuple[float, float, float]:
    n = int(hex_color[1:], 16)
    rgb = np.array([(n >> 16) & 255, (n >> 8) & 255, n & 255]) / 255
    return linear_to_lab(_srgb_to_linear(rgb))


def sample_lab(img: np.ndarray, centres: list[Point], radius: float) -> tuple[float, float, float] | None:
    """Trimmed mean (drop brightest and darkest 15% by luminance) of pixels inside the circles."""
    h, w = img.shape[:2]
    pixels = []
    for cx, cy in centres:
        x0, x1 = max(0, math.floor(cx - radius)), min(w - 1, math.ceil(cx + radius))
        y0, y1 = max(0, math.floor(cy - radius)), min(h - 1, math.ceil(cy + radius))
        if x1 < x0 or y1 < y0:
            continue
        ys, xs = np.mgrid[y0:y1 + 1, x0:x1 + 1]
        mask = np.hypot(xs - cx, ys - cy) <= radius
        pixels.append(img[y0:y1 + 1, x0:x1 + 1][mask])
    if not pixels:
        return None
    px = _srgb_to_linear(np.concatenate(pixels).astype(np.float64) / 255)
    if len(px) < 10:
        return None
    lum = px @ np.array([0.2126, 0.7152, 0.0722])
    order = np.argsort(lum, kind="stable")
    kept = px[order][int(len(px) * 0.15): math.ceil(len(px) * 0.85)]
    return linear_to_lab(kept.mean(axis=0))


MONK_HEX = ("#f6ede4", "#f3e7db", "#f7ead0", "#eadaba", "#d7bd96",
            "#a07e56", "#825c43", "#604134", "#3a312a", "#292420")
_MONK_LAB = [hex_to_lab(h) for h in MONK_HEX]


def monk_band(skin: tuple[float, float, float]) -> int:
    dists = [math.dist(skin, m) for m in _MONK_LAB]
    return int(np.argmin(dists)) + 1


def skin_lab(img: np.ndarray, p: list[Point], face_width: float) -> tuple[float, float, float] | None:
    return sample_lab(img, [p[CHEEK_PATCH_L], p[CHEEK_PATCH_R]], face_width * 0.06)
