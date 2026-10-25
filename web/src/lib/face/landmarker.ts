import { FaceLandmarker, FilesetResolver, type FaceLandmarkerOptions } from '@mediapipe/tasks-vision';

// Served from /public (copied by scripts/copy-mediapipe.mjs) — never a CDN.
const BASE = `${import.meta.env.BASE_URL}mediapipe/`;

export type Delegate = 'GPU' | 'CPU';

// Some Android webviews run the GPU path without errors but never find a face. Once the CPU path
// has found a face the GPU missed, this device uses the CPU from then on (remembered on the phone).
const CPU_KEY = 'aura.face_cpu';
function cpuPreferred(): boolean {
  try {
    return localStorage.getItem(CPU_KEY) === '1';
  } catch {
    return false;
  }
}

export function preferCpu(): void {
  try {
    localStorage.setItem(CPU_KEY, '1');
  } catch {
    /* not remembered: the fallback still runs each time */
  }
}

const pending: Partial<Record<Delegate, Promise<{ landmarker: FaceLandmarker; delegate: Delegate }>>> = {};

/**
 * Loads a face landmarker once per delegate and reuses it. Without an argument: the GPU, unless
 * this device is known to need the CPU, or the GPU won't load. A failed load can be retried.
 */
export function loadFaceLandmarker(want?: Delegate): Promise<{ landmarker: FaceLandmarker; delegate: Delegate }> {
  const delegate = want ?? (cpuPreferred() ? 'CPU' : 'GPU');
  pending[delegate] ??= create(delegate).catch((err: unknown) => {
    delete pending[delegate];
    throw err;
  });
  return pending[delegate];
}

async function create(delegate: Delegate): Promise<{ landmarker: FaceLandmarker; delegate: Delegate }> {
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}wasm`);
  const options = (d: Delegate): FaceLandmarkerOptions => ({
    baseOptions: { modelAssetPath: `${BASE}face_landmarker.task`, delegate: d },
    runningMode: 'IMAGE',
    // Two, so a second face in frame can be caught and refused rather than mixed in.
    numFaces: 2,
  });
  if (delegate === 'CPU') return { landmarker: await FaceLandmarker.createFromOptions(fileset, options('CPU')), delegate };
  try {
    return { landmarker: await FaceLandmarker.createFromOptions(fileset, options('GPU')), delegate: 'GPU' };
  } catch {
    // No usable WebGL at all: the CPU path is slower but works.
    return loadFaceLandmarker('CPU');
  }
}
