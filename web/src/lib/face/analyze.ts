import { assessLighting, monkBand, roundLab, sampleLab, type Lab, type LightingIssue } from './color';
import { loadFaceLandmarker, preferCpu, type Delegate } from './landmarker';
import { LM, computeRatios, dist, faceGeometry, toPixels, type LandmarkRatios, type Point } from './ratios';

/** Everything that leaves the device. No pixels — numbers only (hard rule 1). */
export interface ScanMeasurements {
  landmark_ratios: LandmarkRatios;
  lab_skin: Lab;
  lab_eye: Lab | null;
  monk_band: number;
  lighting_score: number;
}

export type AnalysisFailure = 'no_face' | 'multiple_faces' | 'off_angle' | 'too_far' | 'unreadable';

/** Numbers about the attempt (never pixels), shown in test builds so failures can be diagnosed. */
export interface ScanDiagnostics {
  delegate: Delegate | 'GPU→CPU';
  width: number;
  height: number;
  /** Mean brightness 0–1 of a coarse sample: ~0 means the camera handed over a black frame. */
  brightness: number;
  faces: number;
}

export type AnalysisResult =
  | { ok: true; measurements: ScanMeasurements; lightingIssue: LightingIssue | null }
  | { ok: false; reason: AnalysisFailure; diagnostics?: ScanDiagnostics };

function coarseBrightness(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || !canvas.width || !canvas.height) return 0;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4 * 97) {
    sum += (0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0)) / 255;
    n += 1;
  }
  return n ? Math.round((sum / n) * 100) / 100 : 0;
}

/** Steps as shown on the Analyzing screen. */
export type AnalysisStep = 0 | 1 | 2;

const MAX_YAW = 0.12;
const MIN_FACE_SHARE = 0.18;

/**
 * Reads the face from a canvas, entirely on-device, then wipes the canvas.
 * Whatever happens, the pixels are gone when this returns.
 */
export async function analyzeCanvas(
  canvas: HTMLCanvasElement,
  onStep: (s: AnalysisStep) => void | Promise<void>,
): Promise<AnalysisResult> {
  try {
    await onStep(0);
    const first = await loadFaceLandmarker();
    let result = first.landmarker.detect(canvas);
    let delegate: ScanDiagnostics['delegate'] = first.delegate;
    if (result.faceLandmarks.length === 0 && first.delegate === 'GPU') {
      // Some phones' GPU path finds nothing without erroring: ask the CPU before giving up.
      const cpu = await loadFaceLandmarker('CPU');
      const again = cpu.landmarker.detect(canvas);
      delegate = 'GPU→CPU';
      if (again.faceLandmarks.length > 0) {
        preferCpu();
        result = again;
      }
    }
    const diagnostics = (): ScanDiagnostics => ({
      delegate, width: canvas.width, height: canvas.height, brightness: coarseBrightness(canvas), faces: result.faceLandmarks.length,
    });
    if (result.faceLandmarks.length === 0) return { ok: false, reason: 'no_face', diagnostics: diagnostics() };
    if (result.faceLandmarks.length > 1) return { ok: false, reason: 'multiple_faces', diagnostics: diagnostics() };
    const points = toPixels(result.faceLandmarks[0] ?? [], canvas.width, canvas.height);

    await onStep(1);
    const geo = faceGeometry(points);
    if (Math.abs(geo.yaw) > MAX_YAW) return { ok: false, reason: 'off_angle', diagnostics: diagnostics() };
    if (geo.faceWidthPx / canvas.width < MIN_FACE_SHARE) return { ok: false, reason: 'too_far', diagnostics: diagnostics() };
    const ratios = computeRatios(points);

    await onStep(2);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { ok: false, reason: 'unreadable' };
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const colors = readColors(img, points, geo.faceWidthPx);
    if (!colors) return { ok: false, reason: 'unreadable', diagnostics: diagnostics() };

    return {
      ok: true,
      lightingIssue: colors.lighting.issue,
      measurements: {
        landmark_ratios: ratios,
        lab_skin: roundLab(colors.skin),
        lab_eye: colors.eye ? roundLab(colors.eye) : null,
        monk_band: monkBand(colors.skin),
        lighting_score: colors.lighting.score,
      },
    };
  } finally {
    wipeCanvas(canvas);
  }
}

function readColors(img: ImageData, p: Point[], faceWidth: number) {
  const pt = (i: number) => p[i] ?? { x: 0, y: 0 };
  const cheekR = faceWidth * 0.06;
  const left = sampleLab(img, [{ cx: pt(LM.cheekPatchL).x, cy: pt(LM.cheekPatchL).y, radius: cheekR }]);
  const right = sampleLab(img, [{ cx: pt(LM.cheekPatchR).x, cy: pt(LM.cheekPatchR).y, radius: cheekR }]);
  const skin = sampleLab(img, [
    { cx: pt(LM.cheekPatchL).x, cy: pt(LM.cheekPatchL).y, radius: cheekR },
    { cx: pt(LM.cheekPatchR).x, cy: pt(LM.cheekPatchR).y, radius: cheekR },
  ]);
  if (!skin) return null;

  // Iris ring: skip the pupil (inner 35%) and the limbal edge (outer 15%).
  let eye: Lab | null = null;
  if (p.length > LM.irisCentreR) {
    const irisR = (dist(pt(LM.irisEdgeL[0]), pt(LM.irisEdgeL[1])) + dist(pt(LM.irisEdgeR[0]), pt(LM.irisEdgeR[1]))) / 4;
    eye = sampleLab(img, [LM.irisCentreL, LM.irisCentreR].map((i) => ({
      cx: pt(i).x, cy: pt(i).y, radius: irisR * 0.85, innerRadius: irisR * 0.35,
    })));
  }

  const xs = p.map((q) => q.x);
  const ys = p.map((q) => q.y);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  return { skin, eye, lighting: assessLighting(img, box, left, right) };
}

/** Clears the pixels and shrinks the backing store so nothing lingers in memory. */
export function wipeCanvas(canvas: HTMLCanvasElement): void {
  canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;
}
