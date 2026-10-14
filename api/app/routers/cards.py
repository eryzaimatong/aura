from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user
from app.deps import card_scan, current_card, get_db, lab_or_none
from app.ml.rules import palette_for, season_for
from app.routers.scan import FALLBACK_SKIN, card_out, model_version
from app.schemas.scan import AuraCardOut, CorrectionIn
from app.supabase_rest import SupabaseRest

router = APIRouter(prefix="/api/cards", tags=["cards"])

# correction target → aura_cards column
TARGETS = (("face_shape", "face_shape"), ("season", "season"), ("undertone", "skin_undertone"))


@router.post("/current/correction", response_model=AuraCardOut)
async def correct_card(body: CorrectionIn, user: CurrentUser = Depends(get_current_user),
                       db: SupabaseRest = Depends(get_db)) -> AuraCardOut:
    """
    "This doesn't look like me". Hard rule 12: every answer is stored with the prediction
    and the model version that made it — these rows are training labels. "Not sure" is
    stored too (corrected_to = null): it still says the prediction was doubted.
    """
    card = await current_card(db, user.id)
    scan = await card_scan(db, card)
    version = (scan or {}).get("model_version") or model_version()

    changes: dict[str, object] = {}
    for target, column in TARGETS:
        answer = getattr(body, target)
        if answer is None:
            continue
        corrected = None if answer == "not_sure" else answer
        await db.insert("card_corrections", {
            "user_id": user.id,
            "card_id": card["id"],
            "scan_id": card.get("scan_id"),
            "target": target,
            "predicted": card.get(column) or "none",
            "corrected_to": corrected,
            "model_version": version,
        })
        if corrected is not None and corrected != card.get(column):
            changes[column] = corrected

    # A new undertone with no season pick: re-derive the season so the palette follows.
    if "skin_undertone" in changes and "season" not in changes:
        skin = lab_or_none((scan or {}).get("lab_skin")) or FALLBACK_SKIN
        changes["season"] = season_for(changes["skin_undertone"], skin, lab_or_none((scan or {}).get("lab_eye")))  # type: ignore[arg-type]
    if "season" in changes:
        changes["palette"] = palette_for(changes["season"])  # type: ignore[arg-type]

    if not changes:
        return card_out(card)
    # Model confidences are kept as they were: the card shows these fields as "set by you".
    changes["source"] = "user_corrected"
    updated = await db.update("aura_cards", {"id": f"eq.{card['id']}"}, changes)
    return card_out(updated[0])
