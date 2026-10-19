"""
Vanity recommendations: makeup, hair and colour advice from the Aura Card.

A curated style guide keyed on season family, undertone and face shape. Every pick
carries its reason (hard rule 7), reasons only ever say what suits the person —
never "flaws" or "problem areas" (hard rule 6) — and ranking is by fit_score alone.
"""

from dataclasses import dataclass, field
from typing import Literal

Kind = Literal["makeup", "hair", "colors"]
ALGO_VERSION = "vanity-guide-1"


@dataclass(frozen=True)
class Rec:
    kind: Kind
    key: str
    title: str
    reason: str
    fit_score: float
    swatches: list[str] = field(default_factory=list)
    icon: str = "swatch"


def family(season: str) -> str:
    """'soft_summer' → 'summer'."""
    return season.split("_")[-1]


def season_name(season: str) -> str:
    return season.replace("_", " ").title()


# ---------- makeup shades by season family ----------
# (key, title, swatch, why)
MAKEUP_SHADES: dict[str, list[tuple[str, str, str, str]]] = {
    "spring": [
        ("blush", "Peachy coral blush", "#F4A07E", "Peach picks up the golden warmth in your {season} coloring"),
        ("lip", "Warm coral lip", "#E8735A", "A clear, warm coral matches the brightness of your palette"),
        ("eyes", "Golden bronze shimmer", "#C9A15B", "Light-catching gold brings out warm flecks in your eyes"),
    ],
    "summer": [
        ("blush", "Soft rose blush", "#E3A3B3", "Cool rose sits naturally on {season} skin"),
        ("lip", "Dusty rose lip", "#C47A8A", "Muted, cool pinks read fresh rather than heavy on you"),
        ("eyes", "Taupe and mauve shadow", "#9C8A96", "Soft cool neutrals define without adding harsh contrast"),
    ],
    "autumn": [
        ("blush", "Terracotta blush", "#C97B5E", "Earthy warmth echoes the richness of your {season} palette"),
        ("lip", "Brick red lip", "#9E3B2E", "A warm, deep red suits your golden undertone"),
        ("eyes", "Olive and copper shadow", "#8A6A3A", "Copper and olive make warm eyes glow"),
    ],
    "winter": [
        ("blush", "Cool berry blush", "#C2457A", "Berry adds clear, cool color that suits {season} contrast"),
        ("lip", "True red lip", "#B3123A", "A blue-based red matches the clarity of your palette"),
        ("eyes", "Charcoal and plum shadow", "#4B3A5A", "Deep cool shades frame your eyes with the contrast you carry well"),
    ],
}

# Placement by face shape: always framed as what the shape does well.
BLUSH_PLACEMENT: dict[str, tuple[str, str]] = {
    "heart": ("Blush high on the apples, blended back", "Keeps the focus on your cheeks and eyes, which a heart shape frames beautifully"),
    "oval": ("Blush along the cheekbones", "Your balanced proportions suit classic placement"),
    "round": ("Blush swept up toward the temples", "An upward sweep plays up your cheekbones"),
    "square": ("Soft, round blush on the apples", "Softness pairs nicely with your defined jawline"),
    "oblong": ("Blush blended across the cheeks", "A horizontal sweep suits your graceful length"),
}

# ---------- hair ----------
HAIR_CUTS: dict[str, list[tuple[str, str, str]]] = {
    "oval": [
        ("long_layers", "Long, soft layers", "Your balanced proportions suit almost any length — layers add movement"),
        ("blunt_bob", "A blunt bob", "A clean line shows off your even features"),
        ("curtain_bangs", "Curtain bangs", "They frame your eyes without hiding your face"),
    ],
    "round": [
        ("long_layers", "Layers past the chin", "Length below the chin draws the eye downward along your face"),
        ("side_part", "Deep side part with lift", "Height at the crown suits your soft, rounded features"),
        ("angled_lob", "Angled lob", "Ends that angle forward echo your cheekbones"),
    ],
    "square": [
        ("soft_waves", "Soft waves", "Waves complement the strong lines of your jaw"),
        ("side_bangs", "Side-swept bangs", "A diagonal line adds softness around your features"),
        ("shag", "Layered shag", "Texture around the face suits your defined structure"),
    ],
    "heart": [
        ("chin_bob", "Chin-length bob", "Volume at the chin balances beautifully with your cheekbones"),
        ("side_bangs", "Side-swept bangs", "A soft diagonal frames your eyes"),
        ("ends_volume", "Volume at the ends", "Fullness near the jaw echoes your heart shape's curve"),
    ],
    "oblong": [
        ("curtain_bangs", "Curtain bangs", "Bangs frame your features and play up your eyes"),
        ("shoulder_waves", "Shoulder-length waves", "Width at the sides suits your graceful length"),
        ("side_volume", "Volume at the sides", "Fullness at the cheekbones looks natural on you"),
    ],
}

HAIR_COLOR: dict[str, tuple[str, str, str]] = {
    "spring": ("Honey or golden-brown tones", "#B07A3C", "Golden tones echo the warmth in your {season} palette"),
    "summer": ("Ash or soft cool brown", "#7E6A5E", "Cool, softened browns sit gently with your coloring"),
    "autumn": ("Chestnut or auburn tones", "#7A3E22", "Rich, warm browns match the depth of your palette"),
    "winter": ("Espresso or blue-black", "#2A1E1C", "Deep, cool shades match the contrast you carry well"),
}

# ---------- colours ----------
NEUTRALS: dict[str, tuple[str, list[str], str]] = {
    "warm": ("Camel, olive and cream basics", ["#B98A55", "#6E6B3A", "#EFE3D2"], "Warm neutrals let your undertone glow"),
    "cool": ("Navy, charcoal and soft white basics", ["#1F2A4D", "#3F4146", "#F5F5F7"], "Cool neutrals keep your coloring clear"),
    "neutral": ("Taupe, denim and ivory basics", ["#8B7D72", "#4F6D8F", "#F2EBDD"], "Balanced neutrals suit your in-between undertone"),
}
METALS: dict[str, tuple[str, str, str]] = {
    "warm": ("Gold jewellery", "#C9A64B", "Gold warms your skin's golden undertone"),
    "cool": ("Silver jewellery", "#C0C0C8", "Silver echoes the cool notes in your skin"),
    "neutral": ("Mixed metals", "#C9B37E", "Your neutral undertone carries both gold and silver"),
}


def recommend(card: dict) -> list[Rec]:
    """card: an aura_cards row (season, skin_undertone, face_shape, palette, *_conf, source)."""
    season = card.get("season")
    undertone = card.get("skin_undertone")
    shape = card["face_shape"]
    # Confidence scales fit: a card the user set themselves is trusted fully.
    user_set = card.get("source") == "user_corrected"
    color_conf = 1.0 if user_set else float(card.get("season_conf") or 0.6)
    shape_conf = 1.0 if user_set else float(card.get("shape_conf") or 0.6)
    recs: list[Rec] = []

    # Makeup
    if season:
        fam, name = family(season), season_name(season)
        for i, (key, title, hexv, why) in enumerate(MAKEUP_SHADES[fam]):
            recs.append(Rec("makeup", key, title, why.format(season=name) + ".", round((0.95 - 0.08 * i) * color_conf, 3), [hexv]))
    title, why = BLUSH_PLACEMENT[shape]
    recs.append(Rec("makeup", "placement", title, why + ".", round(0.78 * shape_conf, 3), [], "face"))

    # Hair
    for i, (key, title, why) in enumerate(HAIR_CUTS[shape]):
        recs.append(Rec("hair", key, title, why + ".", round((0.95 - 0.08 * i) * shape_conf, 3), [], "hair"))
    if season:
        t, hexv, why = HAIR_COLOR[family(season)]
        recs.append(Rec("hair", "hair_color", t, why.format(season=season_name(season)) + ".", round(0.75 * color_conf, 3), [hexv]))

    # Colours
    palette: list[str] = card.get("palette") or []
    if season and palette:
        recs.append(Rec("colors", "near_face", "Your top shades near your face", f"These {season_name(season)} colors light up your face most when worn close to it.",
                        round(0.95 * color_conf, 3), palette[:5], "palette"))
    if undertone:
        t, swatches, why = NEUTRALS[undertone]
        recs.append(Rec("colors", "neutrals", t, why + ".", round(0.88 * color_conf, 3), swatches, "palette"))
        t, hexv, why = METALS[undertone]
        recs.append(Rec("colors", "metal", t, why + ".", round(0.8 * color_conf, 3), [hexv]))

    # Hard rule 9 spirit: order by fit only.
    return sorted(recs, key=lambda r: -r.fit_score)
