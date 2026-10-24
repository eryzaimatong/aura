import type { FaceShape } from '../../lib/database.types';

/**
 * Small line-art portraits for Vanity picks: a haircut, or where blush goes on a face shape.
 * Drawn from a few parameters so every style stays in the same hand and uses AURA's tokens.
 * Decorative: the card's title and "Why" line carry the meaning (alt is on the card).
 */

type Ends = 'straight' | 'layered' | 'wavy' | 'flip' | 'angled';
type Top = 'plain' | 'curtain' | 'side' | 'lift' | 'choppy';

interface HairSpec {
  /** Where the ends fall (viewBox y; the chin is ~70, shoulders ~82). */
  length: number;
  ends: Ends;
  top: Top;
  /** Half-width of the hair outline at the sides. */
  width?: number;
}

// Keys match api/app/ml/recommend.py HAIR_CUTS.
const HAIR: Record<string, HairSpec> = {
  long_layers: { length: 92, ends: 'layered', top: 'plain' },
  blunt_bob: { length: 66, ends: 'straight', top: 'plain' },
  curtain_bangs: { length: 88, ends: 'straight', top: 'curtain' },
  side_part: { length: 84, ends: 'layered', top: 'lift' },
  angled_lob: { length: 72, ends: 'angled', top: 'plain' },
  soft_waves: { length: 88, ends: 'wavy', top: 'plain', width: 27 },
  side_bangs: { length: 80, ends: 'straight', top: 'side' },
  shag: { length: 78, ends: 'layered', top: 'choppy', width: 27 },
  chin_bob: { length: 69, ends: 'straight', top: 'side' },
  ends_volume: { length: 72, ends: 'flip', top: 'plain' },
  shoulder_waves: { length: 82, ends: 'wavy', top: 'curtain', width: 28 },
  side_volume: { length: 76, ends: 'wavy', top: 'plain', width: 30 },
};

export function hasHairSketch(key: string): boolean {
  return key in HAIR;
}

function bottomEdge(ends: Ends, l: number, r: number, y: number): string {
  // Right side to left side along the hem.
  switch (ends) {
    case 'straight':
      return `L ${r} ${y} L ${l} ${y}`;
    case 'layered': {
      const pts: string[] = [];
      const steps = 6;
      for (let i = 0; i <= steps; i++) pts.push(`L ${r - ((r - l) * i) / steps} ${y - (i % 2 ? 5 : 0)}`);
      return pts.join(' ');
    }
    case 'wavy': {
      const parts: string[] = [`L ${r} ${y}`];
      const steps = 4;
      const w = (r - l) / steps;
      for (let i = 0; i < steps; i++) parts.push(`q ${-w / 2} ${i % 2 ? -4 : 4} ${-w} 0`);
      return parts.join(' ');
    }
    case 'flip':
      return `L ${r} ${y - 6} Q ${r + 7} ${y} ${r - 2} ${y} L ${l + 2} ${y} Q ${l - 7} ${y} ${l} ${y - 6}`;
    case 'angled':
      return `L ${r} ${y + 6} L ${r - 7} ${y} L ${l + 7} ${y} L ${l} ${y + 6}`;
  }
}

function frontHair(top: Top): string {
  switch (top) {
    case 'plain':
      return 'M33 40 C33 22 42 16 50 16 C58 16 67 22 67 40 C64 30 58 26 50 26 C42 26 36 30 33 40 Z';
    case 'curtain':
      return 'M33 44 C33 22 42 16 50 16 C58 16 67 22 67 44 Q 60 31 50 28 Q 40 31 33 44 Z';
    case 'side':
      return 'M33 37 C33 21 42 15 50 15 C60 15 67 22 67 44 C61 39 52 33 41 30 C37 31 35 34 33 37 Z';
    case 'lift':
      return 'M33 40 C32 20 40 10 52 10 C63 10 68 20 67 40 C64 30 56 26 43 26 C38 28 35 32 33 40 Z';
    case 'choppy':
      return 'M33 40 C33 22 42 16 50 16 C58 16 67 22 67 40 L63 33 L59 37 L55 32 L50 36 L45 32 L41 37 L37 33 Z';
  }
}

const FACE: Record<FaceShape, string> = {
  oval: 'M50 22 C64 22 68 34 67 46 C66 60 58 70 50 70 C42 70 34 60 33 46 C32 34 36 22 50 22 Z',
  round: 'M50 24 C66 24 69 36 69 47 C69 60 60 69 50 69 C40 69 31 60 31 47 C31 36 34 24 50 24 Z',
  square: 'M50 22 C62 22 67 26 67 36 L67 56 C67 64 60 69 50 69 C40 69 33 64 33 56 L33 36 C33 26 38 22 50 22 Z',
  heart: 'M50 22 C64 22 69 30 68 40 C67 52 58 66 50 71 C42 66 33 52 32 40 C31 30 36 22 50 22 Z',
  oblong: 'M50 19 C62 19 65 30 65 44 C65 60 58 73 50 73 C42 73 35 60 35 44 C35 30 38 19 50 19 Z',
};

// Left-cheek blush per face shape (mirrored for the right): matches BLUSH_PLACEMENT in recommend.py.
const BLUSH: Record<FaceShape, { cx: number; cy: number; rx: number; ry: number; rot: number }> = {
  heart: { cx: 41, cy: 50, rx: 4.5, ry: 3.2, rot: 0 },
  oval: { cx: 40, cy: 49, rx: 6, ry: 2.6, rot: -20 },
  round: { cx: 39.5, cy: 46, rx: 7, ry: 2.5, rot: -35 },
  square: { cx: 41, cy: 53, rx: 4.2, ry: 4.2, rot: 0 },
  oblong: { cx: 40, cy: 52, rx: 7, ry: 2.6, rot: 0 },
};

// Drawn in layers: shoulders, hair falling over them, then the neck and face in front of the hair.
function Shoulders() {
  return <path d="M22 100 C24 87 37 81 50 81 C63 81 76 87 78 100 Z" className="fill-tint-lilac stroke-cocoa" strokeWidth="1.5" />;
}

function Neck() {
  return (
    <>
      {/* Front of the top, over the middle of the hair, so long hair falls on either side. */}
      <path d="M40 82.5 C44 81 56 81 60 82.5 L64 100 L36 100 Z" className="fill-tint-lilac" />
      <path d="M44 64 L44 82 C47 84 53 84 56 82 L56 64 Z" className="fill-tint-peach stroke-cocoa" strokeWidth="1.5" />
    </>
  );
}

function backHair(spec: HairSpec): string {
  const w = spec.width ?? 25;
  const l = 50 - w;
  const r = 50 + w;
  return `M50 13 C${50 + w * 0.9} 13 ${r} 24 ${r} 40 ${bottomEdge(spec.ends, l, r, spec.length)} L ${l} 40 C${l} 24 ${50 - w * 0.9} 13 50 13 Z`;
}

const HAIR_CLASS = 'fill-cocoa-soft stroke-cocoa';
// Hair pulled back, so the face shape and blush stay the focus.
const TIED_BACK: HairSpec = { length: 52, ends: 'straight', top: 'plain', width: 20 };

function Features() {
  return (
    <>
      <circle cx="43.5" cy="45" r="1.4" className="fill-cocoa" />
      <circle cx="56.5" cy="45" r="1.4" className="fill-cocoa" />
      <path d="M46.5 57 Q 50 59.5 53.5 57" fill="none" className="stroke-cocoa" strokeWidth="1.4" strokeLinecap="round" />
    </>
  );
}

const FRAME = 'size-20 shrink-0 rounded-sm bg-tint-lilac';

/** A haircut on a simple portrait. */
export function HairSketch({ styleKey }: { styleKey: string }) {
  const spec = HAIR[styleKey];
  if (!spec) return null;
  return (
    <svg viewBox="0 0 100 100" className={FRAME} aria-hidden="true">
      <Shoulders />
      <path d={backHair(spec)} className={HAIR_CLASS} strokeWidth="1.5" strokeLinejoin="round" />
      <Neck />
      <path d={FACE.oval} className="fill-tint-peach stroke-cocoa" strokeWidth="1.5" />
      <Features />
      <path d={frontHair(spec.top)} className={HAIR_CLASS} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** Where blush goes, on the person's own face shape. */
export function PlacementSketch({ shape }: { shape: FaceShape }) {
  const b = BLUSH[shape];
  return (
    <svg viewBox="0 0 100 100" className={FRAME} aria-hidden="true">
      <Shoulders />
      <path d={backHair(TIED_BACK)} className={HAIR_CLASS} strokeWidth="1.5" strokeLinejoin="round" />
      <Neck />
      <path d={FACE[shape]} className="fill-tint-peach stroke-cocoa" strokeWidth="1.5" />
      {[b.cx, 100 - b.cx].map((cx, i) => (
        <ellipse key={i} cx={cx} cy={b.cy} rx={b.rx} ry={b.ry} transform={`rotate(${i ? -b.rot : b.rot} ${cx} ${b.cy})`}
          className="fill-blush" opacity="0.75" />
      ))}
      <Features />
      <path d={frontHair('plain')} className={HAIR_CLASS} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
