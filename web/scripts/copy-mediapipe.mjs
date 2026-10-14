// Copies the MediaPipe WASM runtime from node_modules into public/ so the app
// (and the Capacitor build) loads it locally — never from a CDN.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dest = join(root, 'public', 'mediapipe', 'wasm');
const model = join(root, 'public', 'mediapipe', 'face_landmarker.task');

if (!existsSync(src)) {
  console.error('copy-mediapipe: @mediapipe/tasks-vision is not installed — run npm install');
  process.exit(1);
}
// Fresh copy each time, skipping the ES-module build (~13 MB): forVisionTasks() loads the
// classic SIMD build, with the no-SIMD one as fallback.
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true, filter: (p) => !p.includes('_module_internal') });

if (!existsSync(model)) {
  console.error('copy-mediapipe: public/mediapipe/face_landmarker.task is missing. Download it from https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task');
  process.exit(1);
}
console.log('copy-mediapipe: wasm runtime copied to public/mediapipe/wasm');
