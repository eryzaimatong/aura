from typing import Literal

from pydantic import BaseModel

ItemCategory = Literal["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"]


class CategoryGuessOut(BaseModel):
    category: ItemCategory
    confidence: float


class ColorOut(BaseModel):
    hex: str
    pct: float
    name: str


class TagOut(BaseModel):
    """Suggestions to pre-fill the add-item form. Nothing is saved by this call."""

    model_version: str
    cutout_webp_base64: str
    cutout_ok: bool
    category: ItemCategory
    category_conf: float
    alternatives: list[CategoryGuessOut]
    subcategory: str
    subcategory_label: str
    colors: list[ColorOut]
    color_name: str | None
    lab_primary: tuple[float, float, float] | None
    # null when the user has no Aura Card palette yet
    in_palette: bool | None
    # Hard rule 7: a palette verdict always comes with its reason.
    palette_reason: str | None
    seasonality: Literal["warm", "cool", "all"]
    suggested_name: str
    embedding: list[float]
