"""
Measure every image in the face-shape dataset exactly as the app measures a selfie.

    python -m training.extract_features            (run from api/)

Reads   ../data/face-shape/{training_set,testing_set}/<Shape>/*.jpg
Writes  ../data/features/face_shape_features.csv   (one row per image, incl. skipped ones + why)
"""

import argparse
import csv
import sys
import time
from pathlib import Path

import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision
from PIL import Image, ImageOps, UnidentifiedImageError

from app.ml.features import FEATURES, MAX_SIDE, MAX_YAW, MIN_FACE_SHARE, compute_ratios, face_geometry, monk_band, skin_lab

API_DIR = Path(__file__).resolve().parents[1]
ROOT = API_DIR.parent
DEFAULT_DATA = ROOT / "data" / "face-shape"
DEFAULT_OUT = ROOT / "data" / "features" / "face_shape_features.csv"
# The same model file the app ships, so landmarks match what users get.
MODEL = ROOT / "web" / "public" / "mediapipe" / "face_landmarker.task"

SPLITS = {"training_set": "train", "testing_set": "test"}
COLUMNS = ["split", "label", "path", "status", *FEATURES, "yaw", "face_share", "monk_band"]


def load_rgb(path: Path) -> np.ndarray:
    """EXIF-rotate, force RGB, downscale like capture.ts (max side 1280)."""
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        scale = min(1.0, MAX_SIDE / max(im.size))
        if scale < 1:
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.BILINEAR)
        return np.asarray(im)


def measure(landmarker: vision.FaceLandmarker, path: Path) -> dict[str, object]:
    try:
        rgb = load_rgb(path)
    except (UnidentifiedImageError, OSError):
        return {"status": "unreadable"}
    h, w = rgb.shape[:2]
    result = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
    faces = result.face_landmarks
    if not faces:
        return {"status": "no_face"}
    if len(faces) > 1:
        return {"status": "multiple_faces"}

    points = [(lm.x * w, lm.y * h) for lm in faces[0]]
    geo = face_geometry(points)
    row: dict[str, object] = {"yaw": round(geo.yaw, 4), "face_share": round(geo.face_width_px / w, 4)}
    if abs(geo.yaw) > MAX_YAW:
        return {**row, "status": "off_angle"}
    if geo.face_width_px / w < MIN_FACE_SHARE:
        return {**row, "status": "too_far"}

    skin = skin_lab(rgb, points, geo.face_width_px)
    return {**row, **compute_ratios(points), "monk_band": monk_band(skin) if skin else "", "status": "ok"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    if not MODEL.exists():
        sys.exit(f"Face model not found at {MODEL}")
    images = [(split, label_dir.name.lower(), p)
              for folder, split in SPLITS.items()
              for label_dir in sorted((args.data / folder).iterdir()) if label_dir.is_dir()
              for p in sorted(label_dir.iterdir()) if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}]
    if not images:
        sys.exit(f"No images under {args.data}")

    options = vision.FaceLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=str(MODEL)),
        running_mode=vision.RunningMode.IMAGE,
        num_faces=2,  # like the app: a second face means the frame is refused
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    counts: dict[str, int] = {}
    started = time.time()
    with vision.FaceLandmarker.create_from_options(options) as landmarker, args.out.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        for i, (split, label, path) in enumerate(images, 1):
            row = measure(landmarker, path)
            counts[str(row["status"])] = counts.get(str(row["status"]), 0) + 1
            writer.writerow({"split": split, "label": label, "path": path.relative_to(args.data).as_posix(), **row})
            if i % 250 == 0 or i == len(images):
                print(f"  {i}/{len(images)}  {time.time() - started:.0f}s  {counts}", flush=True)

    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
