"""
Per-user request limits for the expensive endpoints (garment tagging, outfit generation).
In memory, per process: right for a single API instance. Move to Redis if it ever scales out.
"""

import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user


class RateLimiter:
    def __init__(self, name: str, limit: int, window_s: float) -> None:
        self.name, self.limit, self.window_s = name, limit, window_s
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, user_id: str, now: float | None = None) -> None:
        now = time.monotonic() if now is None else now
        hits = self._hits[user_id]
        while hits and now - hits[0] >= self.window_s:
            hits.popleft()
        if len(hits) >= self.limit:
            retry = int(self.window_s - (now - hits[0])) + 1
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited", headers={"Retry-After": str(retry)})
        hits.append(now)

    def __call__(self, user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        self.check(user.id)
        return user


# Generous for real use (a quick-start batch is 15 photos), tight enough to stop a loop.
tag_limit = RateLimiter("tag", limit=40, window_s=600)
generate_limit = RateLimiter("generate", limit=120, window_s=600)
plan_limit = RateLimiter("plan", limit=30, window_s=600)
