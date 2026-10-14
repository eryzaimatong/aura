import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * MediaPipe face-mesh indices used for measurement.
 * Step 7 trains on the same five ratios — any change here must be mirrored there.
 */
export const LM = {
  foreheadTop: 10,
  chin: 152,
  cheekboneL: 234,
  cheekboneR: 454,
  jawL: 172,
  jawR: 397,
  foreheadL: 54,
  foreheadR: 284,
  chinL: 176,
  chinR: 400,
  noseTip: 1,
  cheekPatchL: 50,
  cheekPatchR: 280,
  irisCentreL: 468,
  irisEdgeL: [469, 471],
  irisCentreR: 473,
  irisEdgeR: [474, 476],
} as const;

export interface Point {
  x: number;
  y: number;
}

export interface LandmarkRatios {
  /** forehead top → chin, over cheekbone width */
  len_width: number;
  /** jaw width over forehead width */
  jaw_forehead: number;
  /** jaw width over cheekbone width */
  jaw_cheek: number;
  /** forehead width over cheekbone width */
  forehead_cheek: number;
  /** width near the chin over jaw width — low means a pointed chin */
  chin_jaw: number;
}

/** Normalised landmarks → pixels, so widths and heights share one scale. */
export function toPixels(landmarks: NormalizedLandmark[], width: number, height: number): Point[] {
  return landmarks.map((l) => ({ x: l.x * width, y: l.y * height }));
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function at(points: Point[], i: number): Point {
  const p = points[i];
  if (!p) throw new Error(`landmark ${i} missing`);
  return p;
}

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

export function computeRatios(points: Point[]): LandmarkRatios {
  const width = (a: number, b: number) => dist(at(points, a), at(points, b));
  const cheek = width(LM.cheekboneL, LM.cheekboneR);
  const jaw = width(LM.jawL, LM.jawR);
  const forehead = width(LM.foreheadL, LM.foreheadR);
  return {
    len_width: round4(width(LM.foreheadTop, LM.chin) / cheek),
    jaw_forehead: round4(jaw / forehead),
    jaw_cheek: round4(jaw / cheek),
    forehead_cheek: round4(forehead / cheek),
    chin_jaw: round4(width(LM.chinL, LM.chinR) / jaw),
  };
}

export interface FaceGeometry {
  faceWidthPx: number;
  /** Nose offset from the cheekbone midpoint, as a share of face width. 0 = facing the camera. */
  yaw: number;
}

export function faceGeometry(points: Point[]): FaceGeometry {
  const l = at(points, LM.cheekboneL);
  const r = at(points, LM.cheekboneR);
  const faceWidthPx = dist(l, r);
  const midX = (l.x + r.x) / 2;
  return { faceWidthPx, yaw: (at(points, LM.noseTip).x - midX) / faceWidthPx };
}
