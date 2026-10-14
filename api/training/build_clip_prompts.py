"""
Precompute CLIP text embeddings for the garment vocabulary (app/ml/taxonomy.py).

    python -m training.build_clip_prompts           (run from api/; re-run after editing taxonomy.py)

The API then only needs the image encoder: zero-shot tagging is a dot product against
these saved vectors. Writes app/ml/models/clip_prompts.npz (small, committed).
"""

import urllib.request
from pathlib import Path

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

from app.ml.model_files import CLIP_PROMPTS, CLIP_REVISION
from app.ml.taxonomy import OCCASION_PROMPTS, SEASONALITY_PROMPTS, SUBCATEGORIES, TEMPLATES

CACHE = Path(__file__).resolve().parents[2] / "data" / "clip-text"  # gitignored
BASE = f"https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/{CLIP_REVISION}"
FILES = {"text_model_quantized.onnx": f"{BASE}/onnx/text_model_quantized.onnx", "tokenizer.json": f"{BASE}/tokenizer.json"}

BOS, EOS = 49406, 49407


def fetch() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    for name, url in FILES.items():
        if not (CACHE / name).exists():
            print(f"download {name} …", flush=True)
            urllib.request.urlretrieve(url, CACHE / name)


def unit(v: np.ndarray) -> np.ndarray:
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


def main() -> None:
    fetch()
    tok = Tokenizer.from_file(str(CACHE / "tokenizer.json"))
    session = ort.InferenceSession(str(CACHE / "text_model_quantized.onnx"), providers=["CPUExecutionProvider"])

    def embed(text: str) -> np.ndarray:
        ids = tok.encode(text).ids
        assert ids[0] == BOS and ids[-1] == EOS, "tokenizer should add start/end tokens"
        (out,) = session.run(["text_embeds"], {"input_ids": np.array([ids], dtype=np.int64)})
        return unit(out[0])

    def mean_of(phrases: list[str]) -> np.ndarray:
        return unit(np.mean([embed(p) for p in phrases], axis=0))

    keys = list(SUBCATEGORIES)
    sub = np.stack([mean_of([t.format(p) for p in SUBCATEGORIES[k][2] for t in TEMPLATES]) for k in keys])
    season_keys = list(SEASONALITY_PROMPTS)
    season = np.stack([mean_of(list(SEASONALITY_PROMPTS[k])) for k in season_keys])
    occasion_keys = list(OCCASION_PROMPTS)
    occasion = np.stack([mean_of(list(OCCASION_PROMPTS[k])) for k in occasion_keys])

    np.savez_compressed(CLIP_PROMPTS, keys=np.array(keys), embeddings=sub.astype(np.float32),
                        season_keys=np.array(season_keys), season_embeddings=season.astype(np.float32),
                        occasion_keys=np.array(occasion_keys), occasion_embeddings=occasion.astype(np.float32),
                        revision=np.array(CLIP_REVISION))
    print(f"wrote {CLIP_PROMPTS} ({len(keys)} subcategories, {len(season_keys)} seasonality, {len(occasion_keys)} occasions)")


if __name__ == "__main__":
    main()
