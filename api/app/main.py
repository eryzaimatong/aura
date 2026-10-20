import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_VERSION, settings
from app.ml import face_shape
from app.ml.garments import TaggerUnavailable, get_tagger
from app.routers import cards, health, items, outfits, recommendations, scan, trips

log = logging.getLogger("aura")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Load models at boot so the first scan / first garment isn't the slow one.
    face_shape.model_version()
    try:
        get_tagger()
    except TaggerUnavailable as e:
        # The API still runs; /api/items/tag answers 503 and the app falls back to manual tags.
        log.warning("garment tagging disabled: %s", e)
    yield


app = FastAPI(
    title="AURA API", version=APP_VERSION, lifespan=lifespan,
    docs_url="/docs" if settings.expose_docs else None,
    redoc_url="/redoc" if settings.expose_docs else None,
    openapi_url="/openapi.json" if settings.expose_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(scan.router)
app.include_router(cards.router)
app.include_router(items.router)
app.include_router(outfits.router)
app.include_router(recommendations.router)
app.include_router(trips.router)
