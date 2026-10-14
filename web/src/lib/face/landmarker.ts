import { FaceLandmarker, FilesetResolver, type FaceLandmarkerOptions } from '@mediapipe/tasks-vision';

// Served from /public (copied by scripts/copy-mediapipe.mjs) — never a CDN.
const BASE = `${import.meta.env.BASE_URL}mediapipe/`;

let pending: Promise<FaceLandmarker> | null = null;

/** Loads the face landmarker once and reuses it. A failed load can be retried. */
export function loadFaceLandmarker(): Promise<FaceLandmarker> {
  pending ??= create().catch((err: unknown) => {
    pending = null;
    throw err;
  });
  return pending;
}

async function create(): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}wasm`);
  const options = (delegate: 'GPU' | 'CPU'): FaceLandmarkerOptions => ({
    baseOptions: { modelAssetPath: `${BASE}face_landmarker.task`, delegate },
    runningMode: 'IMAGE',
    // Two, so a second face in frame can be caught and refused rather than mixed in.
    numFaces: 2,
  });
  try {
    return await FaceLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    // Some Android webviews have no usable WebGL — the CPU path is slower but works.
    return FaceLandmarker.createFromOptions(fileset, options('CPU'));
  }
}
