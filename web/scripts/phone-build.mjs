// Test APK for a real phone on the same Wi-Fi: the app talks to the API running on this computer.
// Usage: npm run android:phone   (then start the API with: uvicorn app.main:app --host 0.0.0.0 --port 8000)
// Plain HTTP to your own computer only; release builds never allow it (see capacitor.config.ts).
import { execSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { homedir, networkInterfaces } from 'node:os';
import { join } from 'node:path';

function lanAddress() {
  const isPrivate = (ip) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) if (a.family === 'IPv4' && !a.internal && isPrivate(a.address)) return a.address;
  }
  return null;
}

const ip = process.env.AURA_PC_IP ?? lanAddress();
if (!ip) {
  console.error('No Wi-Fi/LAN address found. Connect this computer to Wi-Fi, or set AURA_PC_IP.');
  process.exit(1);
}
const api = `http://${ip}:8000`;
console.log(`Building the phone test app against ${api}`);

// AURA_DEV_API=1 switches on the plain-HTTP exception in capacitor.config.ts (npx resets npm_lifecycle_event).
const env = { ...process.env, VITE_API_URL: api, AURA_DEV_API: '1' };
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });
run('node scripts/copy-mediapipe.mjs');
run('npx vite build --mode android');
run('npx cap sync android');
run('node scripts/android-gradle.mjs assembleDebug --console=plain');

const out = join(homedir(), 'Downloads', 'AURA-test.apk');
copyFileSync(join('android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'), out);
console.log(`\nDone: ${out}\nThe app will look for the API at ${api}, so keep this computer on the same Wi-Fi with the API running.`);
