/** Colour science for the scan: sRGB → CIELAB (D65), patch sampling, Monk band, lighting. */

export type Lab = [number, number, number];
type Rgb = [number, number, number];

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Relative luminance Y of a linear-RGB pixel. */
const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export function linearToLab([r, g, b]: Rgb): Lab {
  // linear sRGB → XYZ (D65), normalised by the reference white
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function hexToLab(hex: string): Lab {
  const n = parseInt(hex.slice(1), 16);
  return linearToLab([(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => srgbToLinear(c / 255)) as Rgb);
}

export const roundLab = ([l, a, b]: Lab): Lab => [l, a, b].map((v) => Math.round(v * 100) / 100) as Lab;

export interface Patch {
  cx: number;
  cy: number;
  radius: number;
  /** Ring sampling: skip the centre (e.g. the pupil). */
  innerRadius?: number;
}

/**
 * Mean linear RGB of the pixels in the patches, after trimming the brightest and
 * darkest 15% by luminance (specular highlights, pores, stray hair).
 */
export function samplePatches(img: ImageData, patches: Patch[]): Rgb | null {
  const px: Rgb[] = [];
  for (const { cx, cy, radius, innerRadius = 0 } of patches) {
    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(img.width - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(img.height - 1, Math.ceil(cy + radius));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > radius || d < innerRadius) continue;
        const i = (y * img.width + x) * 4;
        px.push([
          srgbToLinear((img.data[i] ?? 0) / 255),
          srgbToLinear((img.data[i + 1] ?? 0) / 255),
          srgbToLinear((img.data[i + 2] ?? 0) / 255),
        ]);
      }
    }
  }
  if (px.length < 10) return null;
  px.sort((a, b) => luminance(a) - luminance(b));
  const kept = px.slice(Math.floor(px.length * 0.15), Math.ceil(px.length * 0.85));
  const sum = kept.reduce<Rgb>((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]);
  return [sum[0] / kept.length, sum[1] / kept.length, sum[2] / kept.length];
}

export function sampleLab(img: ImageData, patches: Patch[]): Lab | null {
  const rgb = samplePatches(img, patches);
  return rgb ? linearToLab(rgb) : null;
}

// Monk Skin Tone scale, swatches 1 (lightest) → 10 (deepest).
const MONK_HEX = ['#f6ede4', '#f3e7db', '#f7ead0', '#eadaba', '#d7bd96', '#a07e56', '#825c43', '#604134', '#3a312a', '#292420'];
const MONK_LAB = MONK_HEX.map(hexToLab);

/** Nearest Monk swatch by ΔE (CIE76). */
export function monkBand(skin: Lab): number {
  let best = 0;
  let bestDist = Infinity;
  MONK_LAB.forEach((m, i) => {
    const d = Math.hypot(skin[0] - m[0], skin[1] - m[1], skin[2] - m[2]);
    if (d < bestDist) [best, bestDist] = [i, d];
  });
  return best + 1;
}

export type LightingIssue = 'dim' | 'harsh' | 'uneven' | 'warm_cast' | 'cool_cast';

export interface LightingReport {
  /** 0–1. Drives colour confidence; low values trigger the low-light screen. */
  score: number;
  /** The biggest problem, if any — used for the "why" copy. */
  issue: LightingIssue | null;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Judges the light, not the skin: scene brightness comes from the whole frame's
 * highlights (so deep skin tones are not mistaken for darkness), plus clipping on
 * the face, left/right evenness, and a grey-world colour cast.
 */
export function assessLighting(img: ImageData, face: { x: number; y: number; w: number; h: number },
  cheekL: Lab | null, cheekR: Lab | null): LightingReport {
  const lum: number[] = [];
  // Grey-world cast is measured on the background only: skin itself is "warm",
  // so including the face would flag every close-up selfie as a warm cast.
  const mean: Rgb = [0, 0, 0];
  let bgCount = 0;
  for (let i = 0; i < img.data.length; i += 16) {
    const p: Rgb = [srgbToLinear((img.data[i] ?? 0) / 255), srgbToLinear((img.data[i + 1] ?? 0) / 255), srgbToLinear((img.data[i + 2] ?? 0) / 255)];
    lum.push(luminance(p));
    const px = (i / 4) % img.width;
    const py = Math.floor(i / 4 / img.width);
    const inFace = px >= face.x && px <= face.x + face.w && py >= face.y && py <= face.y + face.h;
    if (!inFace) {
      mean[0] += p[0];
      mean[1] += p[1];
      mean[2] += p[2];
      bgCount++;
    }
  }
  lum.sort((a, b) => a - b);
  const p98 = lum[Math.floor(lum.length * 0.98)] ?? 0;

  let clipped = 0;
  let total = 0;
  for (let y = Math.max(0, Math.floor(face.y)); y < Math.min(img.height, face.y + face.h); y += 2) {
    for (let x = Math.max(0, Math.floor(face.x)); x < Math.min(img.width, face.x + face.w); x += 2) {
      const i = (y * img.width + x) * 4;
      const [r, g, b] = [img.data[i] ?? 0, img.data[i + 1] ?? 0, img.data[i + 2] ?? 0];
      if (Math.min(r, g, b) >= 250 || Math.max(r, g, b) <= 8) clipped++;
      total++;
    }
  }
  const clipFrac = total ? clipped / total : 0;
  // Too little background to judge (face fills the frame): don't guess a cast.
  const enoughBackground = bgCount >= lum.length * 0.15;
  const cast: Lab = enoughBackground ? linearToLab([mean[0] / bgCount, mean[1] / bgCount, mean[2] / bgCount]) : [0, 0, 0];
  const castChroma = Math.hypot(cast[1], cast[2]);
  const evenDiff = cheekL && cheekR ? Math.abs(cheekL[0] - cheekR[0]) : 0;

  // TODO(step 7): calibrate these against real captures across Monk bands.
  const factors: Record<LightingIssue, number> = {
    dim: clamp01((p98 - 0.12) / 0.33),
    harsh: 1 - clamp01(clipFrac * 4),
    uneven: 1 - clamp01((evenDiff - 6) / 20),
    warm_cast: cast[2] > 0 ? 1 - clamp01((castChroma - 8) / 18) : 1,
    cool_cast: cast[2] <= 0 ? 1 - clamp01((castChroma - 8) / 18) : 1,
  };
  const score = Object.values(factors).reduce((s, f) => s * f, 1);
  const [worst, worstValue] = (Object.entries(factors) as [LightingIssue, number][]).sort((a, b) => a[1] - b[1])[0] ?? ['dim', 1];
  return { score: Math.round(score * 100) / 100, issue: worstValue < 0.85 ? worst : null };
}
