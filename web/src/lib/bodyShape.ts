/**
 * Body shape from tape measurements (circumferences in cm). No weight, no BMI, no
 * "problem areas" (hard rule 6): the result only says what tends to suit the shape.
 */
export type BodyShape = 'pear' | 'apple' | 'hourglass' | 'rectangle' | 'inverted_triangle';

// A type alias, not an interface: Supabase's table typing needs plain object types.
export type Measurements = {
  shoulders_cm: number | null;
  bust_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  height_cm: number | null;
};

export const SHAPE_NAMES: Record<BodyShape, string> = {
  pear: 'Pear',
  apple: 'Apple',
  hourglass: 'Hourglass',
  rectangle: 'Rectangle',
  inverted_triangle: 'Inverted triangle',
};

/** What suits each shape — style direction only, never a judgement. */
export const SHAPE_STYLE: Record<BodyShape, string> = {
  pear: 'Detail and color up top with clean lines below — A-line skirts and structured shoulders look great on you.',
  apple: 'Flowing fabrics and V-necks suit you, with legs and arms as easy places to show off color and print.',
  hourglass: 'Pieces that follow your waist suit you — wrap dresses, belted coats and fitted knits.',
  rectangle: 'You can play with shape — belts, peplums and layering all work, and so do straight, sleek cuts.',
  inverted_triangle: 'Volume and color below suit you — wide-leg trousers, full skirts and softer necklines.',
};

const TOLERANCE = 0.05;

/** Needs bust, waist and hips; returns null until all three are present. */
export function bodyShape(m: Pick<Measurements, 'bust_cm' | 'waist_cm' | 'hips_cm'>): BodyShape | null {
  const { bust_cm: bust, waist_cm: waist, hips_cm: hips } = m;
  if (!bust || !waist || !hips) return null;
  const big = Math.max(bust, hips);
  if (Math.abs(bust - hips) <= TOLERANCE * big && waist <= 0.75 * big) return 'hourglass';
  if (waist >= 0.9 * bust && waist >= 0.9 * hips) return 'apple';
  if (hips - bust > TOLERANCE * hips) return 'pear';
  if (bust - hips > TOLERANCE * bust) return 'inverted_triangle';
  return 'rectangle';
}

export const CM_PER_IN = 2.54;

/** Accepts "86", "86.5" or "86,5"; null for empty; NaN for nonsense. */
export function parseLength(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
}

export const RANGE_CM: Record<keyof Measurements, [number, number]> = {
  shoulders_cm: [25, 70],
  bust_cm: [50, 200],
  waist_cm: [40, 200],
  hips_cm: [50, 220],
  height_cm: [100, 230],
};
