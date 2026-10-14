"""
Fetch model files that aren't committed, verifying their checksums.

    python -m app.ml.download_models      (run from api/; also part of the Render build)
"""

import sys
import urllib.request

from app.ml.model_files import CLIP_VISION, U2NETP, ModelFile


def ensure(model: ModelFile) -> None:
    if model.verified():
        print(f"ok        {model.name}")
        return
    model.path.parent.mkdir(parents=True, exist_ok=True)
    tmp = model.path.with_suffix(".part")
    print(f"download  {model.name} …", flush=True)
    urllib.request.urlretrieve(model.url, tmp)
    tmp.replace(model.path)
    if not model.verified():
        model.path.unlink(missing_ok=True)
        sys.exit(f"checksum mismatch for {model.name} — refusing to use it")
    print(f"ok        {model.name}")


def main() -> None:
    for model in (U2NETP, CLIP_VISION):
        ensure(model)


if __name__ == "__main__":
    main()
