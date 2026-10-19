/**
 * Style Print: the user's taste on four axes, seeded by an 8-question quiz.
 * Each answer nudges the axes; an axis value is 0 (first word) … 1 (second word).
 */
export type Axis = 'soft_structured' | 'quiet_bold' | 'classic_trend' | 'covered_cropped';
export const AXES: ReadonlyArray<{ key: Axis; left: string; right: string }> = [
  { key: 'soft_structured', left: 'Soft', right: 'Structured' },
  { key: 'quiet_bold', left: 'Quiet', right: 'Bold' },
  { key: 'classic_trend', left: 'Classic', right: 'Trend' },
  { key: 'covered_cropped', left: 'Covered', right: 'Cropped' },
];

/** Nudge per axis, −1 … +1, in AXES order. */
type Nudge = [number, number, number, number];
export interface Choice {
  label: string;
  icon: 'flower' | 'square' | 'zap' | 'layers' | 'shirt' | 'sparkles' | 'gem' | 'footprints' | 'trending' | 'sun';
  nudge: Nudge;
}
export interface Question {
  prompt: string;
  choices: [Choice, Choice, Choice, Choice];
}

export const QUESTIONS: Question[] = [
  { prompt: 'Which closet would you rather raid?', choices: [
    { label: 'Soft and romantic', icon: 'flower', nudge: [-1, 0, -0.3, 0] },
    { label: 'Clean and minimal', icon: 'square', nudge: [0.5, -1, -0.3, 0] },
    { label: 'Bold and graphic', icon: 'zap', nudge: [0.5, 1, 0.5, 0] },
    { label: 'Cozy and layered', icon: 'layers', nudge: [-0.5, -0.5, 0, -1] },
  ] },
  { prompt: 'Pick a weekend outfit', choices: [
    { label: 'Flowy midi dress', icon: 'flower', nudge: [-1, 0, 0, -0.5] },
    { label: 'Crisp shirt and jeans', icon: 'shirt', nudge: [0.5, -0.5, -1, 0] },
    { label: 'Statement top and mini skirt', icon: 'sparkles', nudge: [0, 1, 0.5, 1] },
    { label: 'Big hoodie and leggings', icon: 'layers', nudge: [-0.5, -0.5, 0.5, -0.5] },
  ] },
  { prompt: 'Your go-to print?', choices: [
    { label: 'None — solids please', icon: 'square', nudge: [0, -1, -0.5, 0] },
    { label: 'Florals', icon: 'flower', nudge: [-1, 0, -0.5, 0] },
    { label: 'Stripes or checks', icon: 'shirt', nudge: [0.5, 0, -1, 0] },
    { label: 'Bold abstract', icon: 'zap', nudge: [0, 1, 1, 0] },
  ] },
  { prompt: 'Which neckline feels like you?', choices: [
    { label: 'High neck', icon: 'shirt', nudge: [0.5, 0, 0, -1] },
    { label: 'Simple V', icon: 'square', nudge: [0, 0, -0.5, 0] },
    { label: 'Off-shoulder', icon: 'sun', nudge: [-1, 0.5, 0.5, 0.5] },
    { label: 'Square and cropped', icon: 'sparkles', nudge: [0, 0.5, 1, 1] },
  ] },
  { prompt: 'Shoes you reach for first', choices: [
    { label: 'Ballet flats', icon: 'footprints', nudge: [-1, -0.5, -0.5, 0] },
    { label: 'Loafers', icon: 'footprints', nudge: [1, -0.5, -1, 0] },
    { label: 'Chunky sneakers', icon: 'zap', nudge: [0, 0.5, 1, 0] },
    { label: 'Strappy heels', icon: 'gem', nudge: [-0.5, 1, 0, 0.5] },
  ] },
  { prompt: 'How do you shop new trends?', choices: [
    { label: 'I skip them', icon: 'square', nudge: [0, -0.5, -1, 0] },
    { label: 'One piece a season', icon: 'sun', nudge: [0, 0, 0, 0] },
    { label: 'I try most of them', icon: 'trending', nudge: [0, 0.5, 1, 0] },
    { label: 'I start them', icon: 'sparkles', nudge: [0, 1, 1, 0.5] },
  ] },
  { prompt: 'Your favourite fit', choices: [
    { label: 'Fitted and tailored', icon: 'shirt', nudge: [1, 0, -0.5, 0] },
    { label: 'Relaxed and drapey', icon: 'flower', nudge: [-1, -0.5, 0, -0.5] },
    { label: 'Cropped and boxy', icon: 'square', nudge: [0.5, 0.5, 1, 1] },
    { label: 'Long and layered', icon: 'layers', nudge: [-0.5, -0.5, 0, -1] },
  ] },
  { prompt: 'Accessories?', choices: [
    { label: 'Barely any', icon: 'square', nudge: [0, -1, -0.5, 0] },
    { label: 'Dainty gold or silver', icon: 'gem', nudge: [-0.5, -0.5, -0.5, 0] },
    { label: 'One statement piece', icon: 'sparkles', nudge: [0.5, 1, 0, 0] },
    { label: 'Lots, layered', icon: 'layers', nudge: [0, 1, 1, 0] },
  ] },
];

export type Axes = Record<Axis, number>;

/** answers[i] = chosen choice index for QUESTIONS[i]. */
export function computeAxes(answers: number[]): Axes {
  const sums = [0, 0, 0, 0];
  answers.forEach((a, qi) => QUESTIONS[qi]?.choices[a]?.nudge.forEach((n, ai) => { sums[ai]! += n; }));
  const value = (i: number) => Math.round(((sums[i]! / Math.max(1, answers.length) + 1) / 2) * 100) / 100;
  return { soft_structured: value(0), quiet_bold: value(1), classic_trend: value(2), covered_cropped: value(3) };
}

export function printLabel(a: Axes): { label: string; blurb: string } {
  const structured = a.soft_structured >= 0.5;
  const bold = a.quiet_bold >= 0.5;
  const base = structured
    ? bold ? { label: 'Bold Edge', blurb: 'Sharp tailoring with graphic, confident pieces.' }
           : { label: 'Clean Classic', blurb: 'Crisp lines and calm colors that never date.' }
    : bold ? { label: 'Romantic Statement', blurb: 'Flowing shapes with color and print that get noticed.' }
           : { label: 'Soft Minimalist', blurb: 'Gentle shapes, quiet colors, one soft detail.' };
  const lean = a.classic_trend >= 0.65 ? ' You enjoy what’s new.' : a.classic_trend <= 0.35 ? ' You lean toward timeless pieces.' : '';
  return { label: base.label, blurb: base.blurb + lean };
}

/** Quiz-only prints are honest about how little they know yet. */
export const QUIZ_CONFIDENCE = 0.4;

/**
 * The 64-d vector stored in style_prints.vector: one-hot answers (8×4 = 32),
 * the four axes, zero-padded. Layout is versioned so learned signals can extend it later.
 */
export function printVector(answers: number[], axes: Axes): number[] {
  const v = new Array<number>(64).fill(0);
  answers.forEach((a, qi) => { v[qi * 4 + a] = 1; });
  AXES.forEach(({ key }, i) => { v[32 + i] = axes[key]; });
  return v;
}
