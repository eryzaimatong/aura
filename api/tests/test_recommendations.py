import re
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.auth import CurrentUser, get_current_user
from app.deps import get_db
from app.main import app
from app.ml.recommend import BLUSH_PLACEMENT, HAIR_CUTS, MAKEUP_SHADES, recommend

CARD = {"id": "card-1", "season": "soft_summer", "skin_undertone": "cool", "face_shape": "heart",
        "palette": ["#A8BBD6", "#D9B8C4", "#C5CFC0", "#EFE3D2", "#8E95A8"],
        "season_conf": 0.8, "shape_conf": 0.7, "source": "model"}

# Hard rule 6: results read as "what suits you" — never flaws to hide or fix.
JUDGEMENT = re.compile(r"\b(flaw|problem|hide|fix|correct|slim|wide|narrow|big|small|bad|unflattering)\w*", re.I)


def test_every_pick_has_a_reason_and_kinds_covered():
    recs = recommend(CARD)
    assert {r.kind for r in recs} == {"makeup", "hair", "colors"}
    assert all(r.reason.strip().endswith(".") for r in recs)


def test_ranked_by_fit_only():
    scores = [r.fit_score for r in recommend(CARD)]
    assert scores == sorted(scores, reverse=True)


def test_reasons_never_judge_appearance():
    texts = [why for shades in MAKEUP_SHADES.values() for (*_, why) in shades]
    texts += [why for _, why in BLUSH_PLACEMENT.values()]
    texts += [why for cuts in HAIR_CUTS.values() for (*_, why) in cuts]
    texts += [r.reason for r in recommend(CARD)]
    offenders = [t for t in texts if JUDGEMENT.search(t)]
    assert offenders == []


def test_no_season_means_no_guessed_shades():
    recs = recommend({**CARD, "season": None, "skin_undertone": None, "palette": []})
    assert all(r.swatches == [] for r in recs if r.kind == "makeup")  # placement only
    assert not [r for r in recs if r.kind == "colors"]
    assert [r for r in recs if r.kind == "hair"]


def test_user_corrected_card_is_trusted_fully():
    model = max(r.fit_score for r in recommend(CARD))
    mine = max(r.fit_score for r in recommend({**CARD, "source": "user_corrected"}))
    assert mine > model


class FakeDb:
    def __init__(self, card: dict[str, Any] | None):
        self.card = card
        self.deleted: list[dict[str, str]] = []
        self.inserted: list[dict[str, Any]] = []

    async def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        if table == "recommendations":
            return [r for r in self.inserted if params.get("payload->>card_id") == f"eq.{r['payload']['card_id']}"]
        return [self.card] if table == "aura_cards" and self.card else []

    async def delete(self, table: str, filters: dict[str, str]) -> None:
        self.deleted.append(filters)

    async def insert_many(self, table: str, rows: list[dict[str, Any]], **_: Any) -> list[dict[str, Any]]:
        self.inserted = [{**r, "id": f"rec-{i}"} for i, r in enumerate(rows)]
        return self.inserted


@pytest.fixture
def client():
    def make(card: dict[str, Any] | None):
        db = FakeDb(card)
        app.dependency_overrides[get_current_user] = lambda: CurrentUser("u", "t")
        app.dependency_overrides[get_db] = lambda: db
        return TestClient(app), db
    yield make
    app.dependency_overrides.clear()


def test_refresh_replaces_vanity_picks(client):
    c, db = client(CARD)
    body = c.post("/api/recommendations/refresh").json()
    assert body and all(r["reason"] for r in body)
    assert db.deleted == [{"user_id": "eq.u", "kind": "in.(makeup,hair,colors)"}]
    assert all(r["payload"]["card_id"] == "card-1" for r in db.inserted)


def test_refresh_without_card_is_404(client):
    c, _ = client(None)
    assert c.post("/api/recommendations/refresh").json()["detail"] == "no_card"


def test_second_refresh_for_same_card_reuses_picks(client):
    c, db = client(CARD)
    first = c.post("/api/recommendations/refresh").json()
    second = c.post("/api/recommendations/refresh").json()
    assert [r["id"] for r in first] == [r["id"] for r in second]
    assert len(db.deleted) == 1  # nothing wiped the second time, so Saves survive
