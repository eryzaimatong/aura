"""Five signature colours per season, shown as the Aura Card palette dots."""

from app.schemas.scan import ColorSeason

PALETTES: dict[ColorSeason, list[str]] = {
    "light_spring": ["#F8D5A3", "#F4A7A0", "#A8D8B9", "#9EC9E8", "#F3E1A6"],
    "true_spring": ["#F28C5B", "#F6C445", "#7CC28E", "#3FA7C9", "#E86A5C"],
    "bright_spring": ["#FF6F59", "#FFC53D", "#2EC4B6", "#3A86FF", "#FF4F8B"],
    "light_summer": ["#B9D3EE", "#E8B9C8", "#C9C2E6", "#A9D4C9", "#F1E3E8"],
    "true_summer": ["#7FA7D1", "#C98FA8", "#8FB7B0", "#9B8FC9", "#D7C9DE"],
    "soft_summer": ["#A8BBD6", "#D9B8C4", "#C5CFC0", "#EFE3D2", "#8E95A8"],
    "soft_autumn": ["#C9A27E", "#A7A26B", "#D9A08B", "#8C9C7A", "#E6D3B3"],
    "true_autumn": ["#C46A2F", "#D9A13B", "#7A8B3C", "#8C4A2F", "#2F6F6A"],
    "deep_autumn": ["#7A2E1F", "#A0522D", "#556B2F", "#B8860B", "#3E4E3A"],
    "true_winter": ["#1F3A93", "#C8102E", "#00A693", "#5B2C83", "#E8E8F0"],
    "bright_winter": ["#E0115F", "#0047AB", "#00B7EB", "#7F00FF", "#F5F5F5"],
    "deep_winter": ["#2C1B47", "#7B1E3A", "#0B3D2E", "#1C2541", "#C0C0C0"],
}
