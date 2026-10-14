from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user
from app.config import POLICY_VERSION
from app.deps import card_scan, current_card, get_db, lab_or_none
from app.ml import face_shape
from app.ml.rules import COLOR_CONF_MIN, COLOR_VERSION, classify_color, palette_for, season_for, undertone_from_quiz
from app.schemas.scan import AuraCardOut, ScanIn, ScanOut, UndertoneAnswers
from app.supabase_rest import Row, SupabaseRest

router = APIRouter(prefix="/api", tags=["scan"])

# Mid-range skin, used only when a card's scan numbers were deleted.
FALLBACK_SKIN = (60.0, 12.0, 17.0)


async def _require_scan_consent(db: SupabaseRest, user_id: str) -> None:
    """Hard rule 3: the latest face_scan consent must be a grant of the current notice."""
    rows = await db.select("consents", {
        "user_id": f"eq.{user_id}", "kind": "eq.face_scan",
        "order": "created_at.desc", "limit": "1", "select": "granted,policy_ver",
    })
    if not rows or not rows[0]["granted"] or rows[0]["policy_ver"] != POLICY_VERSION:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="consent_required")


def card_out(row: Row) -> AuraCardOut:
    return AuraCardOut.model_validate({**row, "palette": row.get("palette") or []})


def model_version() -> str:
    """Recorded on every scan, and copied onto corrections as the label's provenance (hard rule 12)."""
    return f"{face_shape.model_version()}+{COLOR_VERSION}"


@router.post("/scan", response_model=ScanOut)
async def create_scan(body: ScanIn, user: CurrentUser = Depends(get_current_user),
                      db: SupabaseRest = Depends(get_db)) -> ScanOut:
    await _require_scan_consent(db, user.id)

    scan = await db.insert("scans", {
        "user_id": user.id,
        "landmark_ratios": body.landmark_ratios.model_dump(),
        "lab_skin": list(body.lab_skin),
        "lab_eye": list(body.lab_eye) if body.lab_eye else None,
        "lab_hair": list(body.lab_hair) if body.lab_hair else None,
        "monk_band": body.monk_band,
        "lighting_score": body.lighting_score,
        "model_version": model_version(),
        "device_hint": body.device_hint,
    })

    shape = face_shape.classify_face_shape(body.landmark_ratios)
    color = classify_color(body.lab_skin, body.lab_eye, body.lighting_score)
    trusted = color.confidence >= COLOR_CONF_MIN

    # Only one current card per user (unique partial index): retire the old one first.
    await db.update("aura_cards", {"user_id": f"eq.{user.id}", "is_current": "eq.true"}, {"is_current": False})
    card = await db.insert("aura_cards", {
        "user_id": user.id,
        "scan_id": scan["id"],
        "face_shape": shape.shape,
        "shape_conf": shape.confidence,
        # Hard rule 10: untrusted colour is left empty for the quiz to fill, not guessed.
        "season": color.season if trusted else None,
        "season_conf": color.confidence if trusted else None,
        "skin_undertone": color.undertone if trusted else None,
        "palette": palette_for(color.season) if trusted else [],
        "source": "model",
        "is_current": True,
    })

    return ScanOut(scan_id=scan["id"], card=card_out(card), needs_quiz=not trusted, color_conf=color.confidence)


@router.post("/cards/current/undertone", response_model=AuraCardOut)
async def finish_with_quiz(answers: UndertoneAnswers, user: CurrentUser = Depends(get_current_user),
                           db: SupabaseRest = Depends(get_db)) -> AuraCardOut:
    card = await current_card(db, user.id)
    undertone, confidence = undertone_from_quiz(answers)
    await db.insert("undertone_quiz", {"user_id": user.id, "answers": answers.model_dump(), "result": undertone})

    # Depth and chroma still come from the scan; the quiz only settles the undertone.
    scan = await card_scan(db, card)
    skin = lab_or_none(scan.get("lab_skin")) if scan else None
    eye = lab_or_none(scan.get("lab_eye")) if scan else None
    season = season_for(undertone, skin or FALLBACK_SKIN, eye)

    updated = await db.update("aura_cards", {"id": f"eq.{card['id']}"}, {
        "season": season,
        "season_conf": confidence,
        "skin_undertone": undertone,
        "palette": palette_for(season),
        "source": "quiz",
    })
    return card_out(updated[0])
