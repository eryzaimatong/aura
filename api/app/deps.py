from collections.abc import AsyncIterator

import httpx
from fastapi import Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user
from app.supabase_rest import Row, SupabaseRest


async def get_db(user: CurrentUser = Depends(get_current_user)) -> AsyncIterator[SupabaseRest]:
    async with httpx.AsyncClient(timeout=10) as client:
        yield SupabaseRest(user.token, client)


async def current_card(db: SupabaseRest, user_id: str) -> Row:
    cards = await db.select("aura_cards", {"user_id": f"eq.{user_id}", "is_current": "eq.true", "select": "*", "limit": "1"})
    if not cards:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="no_card")
    return cards[0]


async def card_scan(db: SupabaseRest, card: Row) -> Row | None:
    """The scan behind a card (numbers only), or None if it was deleted."""
    if not card.get("scan_id"):
        return None
    scans = await db.select("scans", {"id": f"eq.{card['scan_id']}", "select": "lab_skin,lab_eye,model_version"})
    return scans[0] if scans else None


def lab_or_none(value: object) -> tuple[float, float, float] | None:
    if isinstance(value, list) and len(value) == 3:
        return (float(value[0]), float(value[1]), float(value[2]))
    return None
