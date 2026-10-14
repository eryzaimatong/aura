"""Garment vocabulary for CLIP zero-shot tagging. Categories match the item_category enum."""

from typing import Literal

ItemCategory = Literal["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"]

# subcategory key → (category, label shown to the user, CLIP phrases)
SUBCATEGORIES: dict[str, tuple[ItemCategory, str, tuple[str, ...]]] = {
    "tshirt": ("top", "T-shirt", ("t-shirt", "tee")),
    "blouse": ("top", "Blouse", ("blouse", "women's blouse")),
    "shirt": ("top", "Shirt", ("button-up shirt", "collared shirt")),
    "tank": ("top", "Tank top", ("tank top", "camisole")),
    "sweater": ("top", "Sweater", ("knit sweater", "pullover sweater")),
    "jeans": ("bottom", "Jeans", ("pair of jeans", "denim jeans")),
    "trousers": ("bottom", "Trousers", ("pair of trousers", "wide leg pants")),
    "shorts": ("bottom", "Shorts", ("pair of shorts",)),
    "skirt": ("bottom", "Skirt", ("skirt", "midi skirt")),
    "dress": ("dress", "Dress", ("dress", "sundress")),
    "jumpsuit": ("dress", "Jumpsuit", ("jumpsuit",)),
    "blazer": ("outerwear", "Blazer", ("blazer",)),
    "jacket": ("outerwear", "Jacket", ("jacket", "denim jacket")),
    "cardigan": ("outerwear", "Cardigan", ("cardigan",)),
    "coat": ("outerwear", "Coat", ("coat", "trench coat")),
    "hoodie": ("outerwear", "Hoodie", ("hoodie",)),
    "sneakers": ("shoes", "Sneakers", ("pair of sneakers",)),
    "heels": ("shoes", "Heels", ("pair of high heels",)),
    "sandals": ("shoes", "Sandals", ("pair of sandals", "pair of slippers")),
    "flats": ("shoes", "Flats", ("pair of flat shoes", "pair of loafers")),
    "boots": ("shoes", "Boots", ("pair of boots",)),
    "handbag": ("bag", "Handbag", ("handbag", "shoulder bag")),
    "tote": ("bag", "Tote", ("tote bag",)),
    "backpack": ("bag", "Backpack", ("backpack",)),
    "hat": ("accessory", "Hat", ("hat", "cap")),
    "scarf": ("accessory", "Scarf", ("scarf",)),
    "belt": ("accessory", "Belt", ("belt",)),
    "jewelry": ("accessory", "Jewelry", ("necklace", "earrings", "bracelet")),
    "sunglasses": ("accessory", "Sunglasses", ("pair of sunglasses",)),
}

TEMPLATES = ("a photo of a {}.", "a product photo of a {}, on a plain background.")

# closet_items.seasonality: what weather the piece is for.
SEASONALITY_PROMPTS: dict[str, tuple[str, ...]] = {
    "warm": ("a light, breathable piece of clothing for hot weather", "a thin summer garment"),
    "cool": ("a thick, warm piece of clothing for cold weather", "a heavy winter garment"),
}
