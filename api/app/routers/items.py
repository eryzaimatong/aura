import base64
import json
import math

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from PIL import UnidentifiedImageError

from app.auth import CurrentUser, get_current_user
from app.deps import get_db
from app.ml.colors import color_name, hex_to_rgb, palette_match, srgb_to_lab
from app.ml.garments import TAGGER_VERSION, TaggerUnavailable, get_tagger
from app.schemas.items import CategoryGuessOut, ColorOut, SimilarOut, TagOut
from app.supabase_rest import SupabaseRest

router = APIRouter(prefix="/api/items", tags=["items"])

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
ACCEPTED_TYPES = {"image/jpeg", "image/png", "image/webp"}


async def _palette(db: SupabaseRest, user_id: str) -> list[str]:
    cards = await db.select("aura_cards", {"user_id": f"eq.{user_id}", "is_current": "eq.true", "select": "palette", "limit": "1"})
    return list(cards[0].get("palette") or []) if cards else []


# Same category, CLIP image similarity this high and a close main colour: probably the same piece.
SIMILAR_MIN = 0.9
SIMILAR_MAX_DELTA_E = 20.0


def _unit(v: list[float]) -> list[float]:
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


async def _similar(db: SupabaseRest, user_id: str, category: str, embedding: list[float],
                   lab: tuple[float, float, float] | None) -> list[SimilarOut]:
    rows = await db.select("closet_items", {
        "user_id": f"eq.{user_id}", "archived": "eq.false", "category": f"eq.{category}",
        "select": "id,name,embedding,lab_primary",
    })
    q = _unit(embedding)
    found = []
    for r in rows:
        emb = r.get("embedding")
        if not emb:
            continue
        v = _unit(json.loads(emb) if isinstance(emb, str) else emb)
        if len(v) != len(q):
            continue
        sim = sum(a * b for a, b in zip(q, v))
        other = r.get("lab_primary")
        if lab is not None and other and math.dist(lab, [float(x) for x in other]) > SIMILAR_MAX_DELTA_E:
            continue
        if sim >= SIMILAR_MIN:
            found.append(SimilarOut(id=r["id"], name=r["name"], similarity=round(sim, 3)))
    return sorted(found, key=lambda s: -s.similarity)[:2]


@router.post("/tag", response_model=TagOut)
async def tag_item(image: UploadFile = File(...), user: CurrentUser = Depends(get_current_user),
                   db: SupabaseRest = Depends(get_db)) -> TagOut:
    """
    Garment photo → cut-out WebP, category, colours, palette match, CLIP embedding.
    Clothing photos only; selfies never come here (they never leave the phone).
    Nothing is stored: the app saves the item once the user confirms the form.
    """
    if image.content_type not in ACCEPTED_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="unsupported_image_type")
    data = await image.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, detail="image_too_large")

    try:
        tagger = await run_in_threadpool(get_tagger)
        result = await run_in_threadpool(tagger.tag, data)
    except TaggerUnavailable:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="tagging_unavailable") from None
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="unreadable_image") from None

    main = result.colors[0] if result.colors else None
    match = palette_match(main.lab, await _palette(db, user.id)) if main else None
    reason = None
    if match is not None and main is not None:
        shade = color_name(srgb_to_lab(hex_to_rgb(match.nearest_hex)[None])[0])
        reason = (f"Its {main.name} sits close to the {shade} in your palette."
                  if match.in_palette else f"Its {main.name} isn't one of your palette shades.")

    label = result.subcategory_label
    return TagOut(
        model_version=TAGGER_VERSION,
        cutout_webp_base64=base64.b64encode(result.cutout_webp).decode(),
        cutout_ok=result.cutout_ok,
        category=result.category,
        category_conf=result.category_conf,
        alternatives=[CategoryGuessOut(category=a.category, confidence=a.confidence) for a in result.alternatives],
        subcategory=result.subcategory,
        subcategory_label=label,
        colors=[ColorOut(hex=c.hex, pct=c.pct, name=c.name) for c in result.colors],
        color_name=main.name if main else None,
        lab_primary=main.lab if main else None,
        in_palette=match.in_palette if match else None,
        palette_reason=reason,
        seasonality=result.seasonality,  # type: ignore[arg-type]
        suggested_name=f"{main.name.capitalize()} {label.lower()}" if main else label,
        embedding=result.embedding,
        similar=await _similar(db, user.id, result.category, result.embedding, main.lab if main else None),
    )
