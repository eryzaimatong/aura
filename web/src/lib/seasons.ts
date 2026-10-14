import type { ColorSeason, FaceShape, Undertone } from './database.types';

export const SEASON_NAMES: Record<ColorSeason, string> = {
  light_spring: 'Light Spring',
  true_spring: 'True Spring',
  bright_spring: 'Bright Spring',
  light_summer: 'Light Summer',
  true_summer: 'True Summer',
  soft_summer: 'Soft Summer',
  soft_autumn: 'Soft Autumn',
  true_autumn: 'True Autumn',
  deep_autumn: 'Deep Autumn',
  true_winter: 'True Winter',
  bright_winter: 'Bright Winter',
  deep_winter: 'Deep Winter',
};

/** "What suits you" framing only — never a judgement (hard rule 6). */
export const SEASON_BLURBS: Record<ColorSeason, string> = {
  light_spring: 'Light, warm and clear colors. Think peach, butter yellow and soft aqua.',
  true_spring: 'Warm, fresh colors with life in them. Coral, golden yellow and leaf green.',
  bright_spring: 'Vivid, warm brights. Poppy red, turquoise and sunny yellow love you.',
  light_summer: 'Airy, cool pastels. Powder blue, lavender and rose glow on you.',
  true_summer: 'Cool, gentle colors. Dusty blue, raspberry and soft teal.',
  soft_summer: 'Soft, muted, cool colors. Skip high contrast and warm oranges.',
  soft_autumn: 'Muted, warm earth tones. Camel, olive and dusty coral.',
  true_autumn: 'Rich, warm earth. Rust, mustard and forest green.',
  deep_autumn: 'Deep, warm colors. Chocolate, burgundy and dark olive.',
  true_winter: 'Cool, clear and high contrast. True red, royal blue and emerald.',
  bright_winter: 'Icy brights and bold contrast. Fuchsia, cobalt and crisp white.',
  deep_winter: 'Deep, cool and dramatic. Plum, ink navy and pine green.',
};

/** Sister seasons in the 12-season system — the likeliest alternatives when one feels off. */
export const NEIGHBOUR_SEASONS: Record<ColorSeason, [ColorSeason, ColorSeason, ColorSeason]> = {
  light_spring: ['light_summer', 'true_spring', 'bright_spring'],
  true_spring: ['light_spring', 'bright_spring', 'true_autumn'],
  bright_spring: ['true_spring', 'bright_winter', 'light_spring'],
  light_summer: ['light_spring', 'true_summer', 'soft_summer'],
  true_summer: ['light_summer', 'soft_summer', 'true_winter'],
  soft_summer: ['soft_autumn', 'true_summer', 'light_summer'],
  soft_autumn: ['soft_summer', 'true_autumn', 'deep_autumn'],
  true_autumn: ['soft_autumn', 'deep_autumn', 'true_spring'],
  deep_autumn: ['deep_winter', 'true_autumn', 'soft_autumn'],
  true_winter: ['deep_winter', 'bright_winter', 'true_summer'],
  bright_winter: ['bright_spring', 'true_winter', 'deep_winter'],
  deep_winter: ['deep_autumn', 'true_winter', 'bright_winter'],
};

export const ALL_SEASONS = Object.keys(SEASON_NAMES) as ColorSeason[];
export const ALL_FACE_SHAPES: FaceShape[] = ['heart', 'oblong', 'oval', 'round', 'square'];
export const ALL_UNDERTONES: Undertone[] = ['cool', 'warm', 'neutral'];

export const FACE_SHAPE_NAMES: Record<FaceShape, string> = {
  heart: 'Heart',
  oblong: 'Oblong',
  oval: 'Oval',
  round: 'Round',
  square: 'Square',
};

export const UNDERTONE_NAMES: Record<Undertone, string> = {
  cool: 'cool',
  warm: 'warm',
  neutral: 'neutral',
};

/** Plain-language labels for the five ratios on the "tap to see why" panel. */
export const RATIO_LABELS: Record<string, string> = {
  len_width: 'Face length ÷ width',
  jaw_forehead: 'Jaw ÷ forehead',
  jaw_cheek: 'Jaw ÷ cheekbones',
  forehead_cheek: 'Forehead ÷ cheekbones',
  chin_jaw: 'Chin ÷ jaw',
};

export const pct = (x: number | null | undefined) => (x == null ? '—' : `${Math.round(x * 100)}%`);
