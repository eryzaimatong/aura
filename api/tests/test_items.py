import io
from typing import Any

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.auth import CurrentUser, get_current_user
from app.deps import get_db
from app.main import app
from app.ml import garments
from app.ml.colors import Swatch, dominant_colors, palette_match, srgb_to_lab
from app.routers import items

USER = CurrentUser(id="user-1", token="t")


# ---------- colour maths ----------

def test_lab_reference_values():
    lab = srgb_to_lab(np.array([[255, 255, 255], [0, 0, 0], [255, 0, 0]]))
    assert np.allclose(lab[0], [100, 0, 0], atol=0.1)
    assert np.allclose(lab[1], [0, 0, 0], atol=0.1)
    assert np.allclose(lab[2], [53.24, 80.09, 67.20], atol=0.3)


def test_dominant_colors_split_and_name():
    navy = np.tile([31, 42, 77], (700, 1))
    cream = np.tile([239, 227, 210], (300, 1))
    sw = dominant_colors(np.vstack([navy, cream]))
    assert [s.name for s in sw] == ["navy", "cream"]
    assert sw[0].pct == pytest.approx(0.7, abs=0.01)


def test_near_identical_clusters_merge():
    noisy = np.clip(np.tile([31, 42, 77], (1000, 1)) + np.random.default_rng(0).integers(-3, 4, (1000, 3)), 0, 255)
    assert len(dominant_colors(noisy)) == 1


def test_palette_match():
    lab = tuple(srgb_to_lab(np.array([[168, 187, 214]]))[0])
    assert palette_match(lab, ["#A8BBD6", "#000000"]).in_palette  # type: ignore[union-attr]
    assert not palette_match(lab, ["#C46A2F"]).in_palette  # type: ignore[union-attr]
    assert palette_match(lab, []) is None


# ---------- endpoint (tagger faked: no model files needed in CI) ----------

class FakeTagger:
    def tag(self, data: bytes) -> garments.TagResult:
        Image.open(io.BytesIO(data)).verify()  # still rejects non-images
        return garments.TagResult(
            cutout_webp=b"RIFFfakeWEBP", cutout_ok=True, category="outerwear", category_conf=0.81,
            alternatives=[garments.CategoryGuess("top", 0.12)], subcategory="blazer", subcategory_label="Blazer",
            colors=[Swatch("#EFE3D2", 0.62, "cream", (91.0, 1.5, 9.5))], seasonality="all", embedding=[0.0] * 512,
        )


class FakeDb:
    def __init__(self, palette: list[str]):
        self.palette = palette

    async def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        return [{"palette": self.palette}] if self.palette else []


def jpeg() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), (200, 180, 160)).save(buf, "JPEG")
    return buf.getvalue()


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch):
    def make(palette: list[str], tagger: object = FakeTagger()):
        monkeypatch.setattr(items, "get_tagger", lambda: tagger)
        app.dependency_overrides[get_current_user] = lambda: USER
        app.dependency_overrides[get_db] = lambda: FakeDb(palette)
        return TestClient(app)
    yield make
    app.dependency_overrides.clear()


def test_tag_prefills_form_with_reasoned_palette_match(client):
    body = client(["#EDE0CF", "#1F2A4D"]).post("/api/items/tag", files={"image": ("a.jpg", jpeg(), "image/jpeg")}).json()
    assert body["category"] == "outerwear" and body["suggested_name"] == "Cream blazer"
    assert body["in_palette"] is True and "palette" in body["palette_reason"]
    assert len(body["embedding"]) == 512 and body["cutout_webp_base64"]


def test_no_aura_card_means_no_palette_verdict(client):
    body = client([]).post("/api/items/tag", files={"image": ("a.jpg", jpeg(), "image/jpeg")}).json()
    assert body["in_palette"] is None and body["palette_reason"] is None


def test_rejects_wrong_type_and_garbage(client):
    c = client([])
    assert c.post("/api/items/tag", files={"image": ("a.gif", b"GIF89a", "image/gif")}).status_code == 415
    assert c.post("/api/items/tag", files={"image": ("a.jpg", b"not an image", "image/jpeg")}).json()["detail"] == "unreadable_image"


def test_rejects_oversized_upload(client):
    big = b"\xff" * (items.MAX_UPLOAD_BYTES + 10)
    assert client([]).post("/api/items/tag", files={"image": ("a.jpg", big, "image/jpeg")}).status_code == 413


def test_missing_models_is_503_not_crash(client):
    class Unavailable:
        def tag(self, data: bytes):
            raise garments.TaggerUnavailable("no models")
    res = client([], Unavailable()).post("/api/items/tag", files={"image": ("a.jpg", jpeg(), "image/jpeg")})
    assert res.status_code == 503 and res.json()["detail"] == "tagging_unavailable"
