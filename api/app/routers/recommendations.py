from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import CurrentUser, get_current_user
from app.deps import current_card, get_db
from app.ml.recommend import ALGO_VERSION, recommend
from app.supabase_rest import SupabaseRest

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

VANITY_KINDS = ("makeup", "hair", "colors")


class RecOut(BaseModel):
    id: str
    kind: str
    key: str
    title: str
    # Hard rule 7: never empty.
    reason: str
    fit_score: float
    swatches: list[str]
    icon: str


@router.post("/refresh", response_model=list[RecOut])
async def refresh(user: CurrentUser = Depends(get_current_user), db: SupabaseRest = Depends(get_db)) -> list[RecOut]:
    """Rebuilds Vanity picks from the current Aura Card (old picks and their feedback go with them)."""
    card = await current_card(db, user.id)
    recs = recommend(card)
    await db.delete("recommendations", {"user_id": f"eq.{user.id}", "kind": f"in.({','.join(VANITY_KINDS)})"})
    rows = await db.insert_many("recommendations", [{
        "user_id": user.id,
        "kind": r.kind,
        "payload": {"key": r.key, "title": r.title, "swatches": r.swatches, "icon": r.icon, "card_id": card["id"]},
        "reason": r.reason,
        "fit_score": r.fit_score,
        "algo_v": ALGO_VERSION,
    } for r in recs])
    out = [RecOut(id=row["id"], kind=row["kind"], key=row["payload"]["key"], title=row["payload"]["title"],
                  reason=row["reason"], fit_score=row["fit_score"], swatches=row["payload"]["swatches"],
                  icon=row["payload"]["icon"]) for row in rows]
    return sorted(out, key=lambda r: -r.fit_score)
