"""Model files the API needs, where they come from, and how to verify them."""

import hashlib
from dataclasses import dataclass
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "models"

CLIP_REVISION = "d15189d7028b43f1d3e65039190477f6af591c2a"  # Xenova/clip-vit-base-patch32, pinned
_CLIP_BASE = f"https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/{CLIP_REVISION}"


@dataclass(frozen=True)
class ModelFile:
    name: str
    url: str
    sha256: str
    # Committed files ship with the repo; the rest are fetched by `python -m app.ml.download_models`.
    committed: bool

    @property
    def path(self) -> Path:
        return MODELS_DIR / self.name

    def verified(self) -> bool:
        if not self.path.exists():
            return False
        h = hashlib.sha256()
        with self.path.open("rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                h.update(chunk)
        return h.hexdigest() == self.sha256


# Garment cut-out (rembg's u2netp, 4.6 MB).
U2NETP = ModelFile(
    "u2netp.onnx",
    "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx",
    "309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8",
    committed=True,
)

# CLIP ViT-B/32 image encoder, int8-quantised ONNX (89 MB): 512-d embeddings without PyTorch.
CLIP_VISION = ModelFile(
    "clip_vision_int8.onnx",
    f"{_CLIP_BASE}/onnx/vision_model_quantized.onnx",
    "583fd1110a514667812fee7d684952aaf82a99b959760c8d7dca7e0ab9839299",
    committed=False,
)

# Precomputed CLIP text embeddings for the garment prompts (built by training/build_clip_prompts.py).
CLIP_PROMPTS = MODELS_DIR / "clip_prompts.npz"
