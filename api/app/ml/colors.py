"""Garment colour: k-means in CIELAB, human colour names, and the Aura palette match."""

from dataclasses import dataclass

import numpy as np
from sklearn.cluster import KMeans

Lab = tuple[float, float, float]


def srgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    """(N, 3) sRGB 0-255 → (N, 3) CIELAB (D65). Same maths as web/src/lib/face/color.ts."""
    c = rgb.astype(np.float64) / 255
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = lin @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[:, 1] - 16, 500 * (f[:, 0] - f[:, 1]), 200 * (f[:, 1] - f[:, 2])], axis=1)


def hex_to_rgb(hex_color: str) -> np.ndarray:
    n = int(hex_color.lstrip("#"), 16)
    return np.array([(n >> 16) & 255, (n >> 8) & 255, n & 255])


def rgb_to_hex(rgb: np.ndarray) -> str:
    r, g, b = (int(round(v)) for v in np.clip(rgb, 0, 255))
    return f"#{r:02X}{g:02X}{b:02X}"


# Names a shopper would use. Matched by nearest LAB distance.
NAMED_COLORS: dict[str, str] = {
    "black": "#1C1C1C", "charcoal": "#3F4146", "grey": "#8E8E8E", "white": "#F7F7F5", "cream": "#EFE3D2",
    "beige": "#D8C3A5", "camel": "#B98A55", "brown": "#6B4A35", "chocolate": "#4A2C21",
    "navy": "#1F2A4D", "blue": "#3C6DB0", "denim": "#4F6D8F", "light blue": "#A9C8E8", "teal": "#2F7F7F",
    "green": "#3E7D4A", "olive": "#6E6B3A", "sage": "#A8B89A", "mint": "#B8E2CF",
    "yellow": "#F2D24B", "mustard": "#C9A23A", "orange": "#E8803A", "rust": "#A84C2A", "coral": "#F08C7A",
    "red": "#C2312F", "burgundy": "#6E1F2E", "pink": "#E8A0B4", "blush": "#F2C9CF", "fuchsia": "#C2307A",
    "purple": "#6A3F8F", "lavender": "#BBA9DD", "khaki": "#B7AD84", "silver": "#C0C0C8", "gold": "#C9A64B",
}
_NAMED_LAB = srgb_to_lab(np.array([hex_to_rgb(h) for h in NAMED_COLORS.values()]))
_NAMES = list(NAMED_COLORS)


def color_name(lab: np.ndarray) -> str:
    return _NAMES[int(np.argmin(np.linalg.norm(_NAMED_LAB - lab, axis=1)))]


@dataclass(frozen=True)
class Swatch:
    hex: str
    pct: float
    name: str
    lab: Lab


def dominant_colors(pixels: np.ndarray, k: int = 4, max_samples: int = 4000, seed: int = 0) -> list[Swatch]:
    """
    pixels: (N, 3) sRGB foreground pixels. K-means in LAB (perceptual), then near-identical
    clusters (ΔE < 10) are merged and slivers under 5% dropped. Largest first.
    """
    if len(pixels) == 0:
        return []
    rng = np.random.default_rng(seed)
    if len(pixels) > max_samples:
        pixels = pixels[rng.choice(len(pixels), max_samples, replace=False)]
    lab = srgb_to_lab(pixels)
    k = max(1, min(k, len(np.unique(pixels, axis=0))))
    labels = KMeans(n_clusters=k, n_init=2, random_state=seed).fit_predict(lab)

    clusters = [{"rgb": pixels[labels == i].mean(axis=0), "lab": lab[labels == i].mean(axis=0), "n": int((labels == i).sum())}
                for i in range(k) if (labels == i).any()]
    clusters.sort(key=lambda c: -c["n"])
    merged: list[dict] = []
    for c in clusters:
        near = next((m for m in merged if np.linalg.norm(m["lab"] - c["lab"]) < 10), None)
        if near is None:
            merged.append(dict(c))
        else:
            total = near["n"] + c["n"]
            near["rgb"] = (near["rgb"] * near["n"] + c["rgb"] * c["n"]) / total
            near["lab"] = (near["lab"] * near["n"] + c["lab"] * c["n"]) / total
            near["n"] = total

    n_all = len(pixels)
    out = [Swatch(rgb_to_hex(c["rgb"]), round(c["n"] / n_all, 3), color_name(c["lab"]), tuple(round(float(v), 2) for v in c["lab"]))  # type: ignore[arg-type]
           for c in merged if c["n"] / n_all >= 0.05]
    return sorted(out, key=lambda s: -s.pct)


# ΔE76 under which a garment colour counts as "in your palette".
PALETTE_DELTA_E = 20.0


@dataclass(frozen=True)
class PaletteMatch:
    in_palette: bool
    nearest_hex: str
    delta_e: float


def palette_match(garment_lab: Lab, palette_hex: list[str]) -> PaletteMatch | None:
    """Nearest Aura Card palette colour to the garment's main colour. None without a palette."""
    if not palette_hex:
        return None
    pal = srgb_to_lab(np.array([hex_to_rgb(h) for h in palette_hex]))
    d = np.linalg.norm(pal - np.array(garment_lab), axis=1)
    i = int(np.argmin(d))
    return PaletteMatch(bool(d[i] < PALETTE_DELTA_E), palette_hex[i].upper(), round(float(d[i]), 1))
