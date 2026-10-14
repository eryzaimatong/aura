"""Minimal PostgREST client that acts as the signed-in user (RLS applies)."""

from typing import Any

import httpx
from fastapi import HTTPException, status

from app.config import settings

Row = dict[str, Any]


class SupabaseRest:
    def __init__(self, token: str, client: httpx.AsyncClient) -> None:
        self._client = client
        self._headers = {
            "apikey": settings.supabase_publishable_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def _url(self, table: str) -> str:
        return f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}"

    async def _send(self, method: str, table: str, *, params: dict[str, str], json: Any = None,
                    prefer: str | None = None) -> list[Row]:
        headers = dict(self._headers)
        if prefer:
            headers["Prefer"] = prefer
        try:
            res = await self._client.request(method, self._url(table), params=params, json=json, headers=headers)
        except httpx.HTTPError:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="database_unreachable") from None
        if res.status_code >= 400:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=f"database_error:{table}:{res.status_code}")
        return res.json() if res.content else []

    async def select(self, table: str, params: dict[str, str]) -> list[Row]:
        return await self._send("GET", table, params=params)

    async def insert(self, table: str, row: Row) -> Row:
        rows = await self._send("POST", table, params={}, json=row, prefer="return=representation")
        return rows[0]

    async def insert_many(self, table: str, rows: list[Row], *, ignore_conflicts_on: str | None = None) -> list[Row]:
        """Bulk insert. With `ignore_conflicts_on` (e.g. "user_id,item_id,worn_on"), duplicates are skipped."""
        if not rows:
            return []
        prefer = "return=representation"
        params: dict[str, str] = {}
        if ignore_conflicts_on:
            prefer += ",resolution=ignore-duplicates"
            params["on_conflict"] = ignore_conflicts_on
        return await self._send("POST", table, params=params, json=rows, prefer=prefer)

    async def update(self, table: str, filters: dict[str, str], values: Row) -> list[Row]:
        return await self._send("PATCH", table, params=filters, json=values, prefer="return=representation")
