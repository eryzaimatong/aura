"""
Garment tagging: cut out the item, embed it with CLIP, name its category and colours.

All CPU, all ONNX — no PyTorch, so it fits a small server. Models load once, lazily.
"""

import io
import logging
import os
import threading
from dataclasses import dataclass
from functools import lru_cache

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

from app.ml.colors import Swatch, dominant_colors
from app.ml.model_files import CLIP_PROMPTS, CLIP_VISION, U2NETP
from app.ml.taxonomy import SUBCATEGORIES, ItemCategory

log = logging.getLogger("aura.ml")

MAX_INPUT_SIDE = 1024
CUTOUT_MAX_SIDE = 768
MIN_FOREGROUND = 0.03  # below this the cut-out failed: keep the whole photo instead
TAGGER_VERSION = "tag-u2netp+clip-b32-int8-1"

_CLIP_MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
_CLIP_STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)
_U2_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_U2_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class TaggerUnavailable(RuntimeError):
    """Model files missing — callers fall back to manual tagging."""


@dataclass(frozen=True)
class CategoryGuess:
    category: ItemCategory
    confidence: float


@dataclass(frozen=True)
class TagResult:
    cutout_webp: bytes
    cutout_ok: bool
    category: ItemCategory
    category_conf: float
    alternatives: list[CategoryGuess]
    subcategory: str
    subcategory_label: str
    colors: list[Swatch]
    seasonality: str
    embedding: list[float]


class Tagger:
    def __init__(self) -> None:
        for f in (U2NETP, CLIP_VISION):
            if not f.path.exists():
                raise TaggerUnavailable(f"{f.name} missing — run `python -m app.ml.download_models`")
        if not CLIP_PROMPTS.exists():
            raise TaggerUnavailable("clip_prompts.npz missing — run `python -m training.build_clip_prompts`")
        opts = ort.SessionOptions()
        # Measured: 4 threads is the sweet spot (u2netp 2.4 s → 1 s; more threads slowed CLIP).
        # Requests are serialised by self._lock, so threads never multiply across requests.
        opts.intra_op_num_threads = min(4, os.cpu_count() or 1)
        self._u2 = ort.InferenceSession(str(U2NETP.path), opts, providers=["CPUExecutionProvider"])
        self._clip = ort.InferenceSession(str(CLIP_VISION.path), opts, providers=["CPUExecutionProvider"])
        prompts = np.load(CLIP_PROMPTS)
        self._keys = [str(k) for k in prompts["keys"]]
        self._text = prompts["embeddings"]
        self._season_keys = [str(k) for k in prompts["season_keys"]]
        self._season = prompts["season_embeddings"]
        self._lock = threading.Lock()

    # ---------- stages ----------

    def _mask(self, rgb: np.ndarray) -> np.ndarray:
        """u2netp foreground probability, 0..1, same size as the image."""
        h, w = rgb.shape[:2]
        x = np.asarray(Image.fromarray(rgb).resize((320, 320), Image.Resampling.LANCZOS), dtype=np.float32)
        x = (x / max(float(x.max()), 1e-6) - _U2_MEAN) / _U2_STD
        (pred,) = self._u2.run([self._u2.get_outputs()[0].name], {self._u2.get_inputs()[0].name: x.transpose(2, 0, 1)[None]})[:1]
        p = pred[0, 0]
        p = (p - p.min()) / max(float(p.max() - p.min()), 1e-6)
        return np.asarray(Image.fromarray((p * 255).astype(np.uint8)).resize((w, h), Image.Resampling.BILINEAR), dtype=np.float32) / 255

    def _embed(self, rgb: np.ndarray) -> np.ndarray:
        """CLIP image embedding (L2-normalised): resize shortest side to 224, centre-crop."""
        im = Image.fromarray(rgb)
        scale = 224 / min(im.size)
        im = im.resize((max(224, round(im.width * scale)), max(224, round(im.height * scale))), Image.Resampling.BICUBIC)
        left, top = (im.width - 224) // 2, (im.height - 224) // 2
        x = np.asarray(im.crop((left, top, left + 224, top + 224)), dtype=np.float32) / 255
        x = ((x - _CLIP_MEAN) / _CLIP_STD).transpose(2, 0, 1)[None].astype(np.float32)
        (emb,) = self._clip.run(["image_embeds"], {"pixel_values": x})
        return emb[0] / np.linalg.norm(emb[0])

    # ---------- pipeline ----------

    def tag(self, image_bytes: bytes) -> TagResult:
        with Image.open(io.BytesIO(image_bytes)) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            im.thumbnail((MAX_INPUT_SIDE, MAX_INPUT_SIDE))
            rgb = np.asarray(im)

        with self._lock:  # one inference at a time per process keeps memory flat
            alpha = self._mask(rgb)
            fg = alpha > 0.5
            cutout_ok = fg.mean() >= MIN_FOREGROUND
            if not cutout_ok:
                fg = np.ones_like(fg)
                alpha = np.ones_like(alpha)
            # CLIP sees the item on white, like a product photo.
            on_white = (rgb * alpha[..., None] + 255 * (1 - alpha[..., None])).astype(np.uint8)
            emb = self._embed(_crop_to(on_white, fg))

        probs = _softmax(100 * (self._text @ emb))
        by_cat: dict[str, float] = {}
        for k, p in zip(self._keys, probs):
            by_cat[SUBCATEGORIES[k][0]] = by_cat.get(SUBCATEGORIES[k][0], 0.0) + float(p)
        ranked = sorted(by_cat.items(), key=lambda kv: -kv[1])
        # Type is chosen inside the winning category, so the two never disagree.
        key = max((k for k in self._keys if SUBCATEGORIES[k][0] == ranked[0][0]), key=lambda k: probs[self._keys.index(k)])
        season_probs = _softmax(100 * (self._season @ emb))
        warm_minus_cool = float(season_probs[self._season_keys.index("warm")] - season_probs[self._season_keys.index("cool")])

        return TagResult(
            cutout_webp=_encode_cutout(rgb, alpha, fg),
            cutout_ok=bool(cutout_ok),
            category=ranked[0][0],  # type: ignore[arg-type]
            category_conf=round(ranked[0][1], 2),
            alternatives=[CategoryGuess(c, round(p, 2)) for c, p in ranked[1:3]],  # type: ignore[arg-type]
            subcategory=key,
            subcategory_label=SUBCATEGORIES[key][1],
            colors=dominant_colors(rgb[fg]),
            seasonality="warm" if warm_minus_cool > 0.3 else "cool" if warm_minus_cool < -0.3 else "all",
            embedding=[round(float(v), 6) for v in emb],
        )


def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - x.max())
    return e / e.sum()


def _bbox(fg: np.ndarray, margin: float = 0.04) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(fg)
    h, w = fg.shape
    my, mx = int(h * margin), int(w * margin)
    return max(0, xs.min() - mx), max(0, ys.min() - my), min(w, xs.max() + mx + 1), min(h, ys.max() + my + 1)


def _crop_to(rgb: np.ndarray, fg: np.ndarray) -> np.ndarray:
    x0, y0, x1, y1 = _bbox(fg)
    return rgb[y0:y1, x0:x1]


def _encode_cutout(rgb: np.ndarray, alpha: np.ndarray, fg: np.ndarray) -> bytes:
    """Transparent cut-out, cropped to the item, as WebP — what Storage keeps."""
    rgba = np.dstack([rgb, (alpha * 255).astype(np.uint8)])
    x0, y0, x1, y1 = _bbox(fg)
    im = Image.fromarray(rgba[y0:y1, x0:x1], "RGBA")
    im.thumbnail((CUTOUT_MAX_SIDE, CUTOUT_MAX_SIDE))
    buf = io.BytesIO()
    # method=1: ~10× faster than the default 4 for a few % larger file.
    im.save(buf, "WEBP", quality=85, method=1)
    return buf.getvalue()


_init_lock = threading.Lock()


@lru_cache(maxsize=1)
def _load() -> Tagger:
    return Tagger()


def get_tagger() -> Tagger:
    """Shared tagger; raises TaggerUnavailable if the models aren't installed."""
    with _init_lock:
        return _load()
