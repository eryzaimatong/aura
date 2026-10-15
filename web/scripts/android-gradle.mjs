// Runs the Android Gradle wrapper with a JDK 21 (Capacitor 8 / Gradle 8.14 can't run on Java 25).
// Finds it via $JAVA_HOME_21, android/.gradle/config.properties (what Android Studio uses),
// or ~/.jdks/*21*. Usage: node scripts/android-gradle.mjs assembleDebug
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const androidDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'android');

function findJdk21() {
  if (process.env.JAVA_HOME_21) return process.env.JAVA_HOME_21;
  const cfg = join(androidDir, '.gradle', 'config.properties');
  if (existsSync(cfg)) {
    const m = readFileSync(cfg, 'utf8').match(/^java\.home=(.+)$/m);
    // .properties escaping: "C\:\\Users" → "C:\Users"
    if (m) return m[1].trim().replace(/\\(.)/g, '$1');
  }
  const jdks = join(homedir(), '.jdks');
  const hit = existsSync(jdks) && readdirSync(jdks).find((d) => /(^|-)21[.-]/.test(d));
  return hit ? join(jdks, hit) : null;
}

const jdk = findJdk21();
if (!jdk || !existsSync(join(jdk, 'bin'))) {
  console.error('JDK 21 not found. Install Temurin 21 into ~/.jdks or set JAVA_HOME_21.');
  process.exit(1);
}
const win = process.platform === 'win32';
// Full, quoted path: the project folder contains spaces, and .bat files need a shell on Windows.
const wrapper = join(androidDir, win ? 'gradlew.bat' : 'gradlew');
const res = spawnSync(win ? `"${wrapper}"` : wrapper, process.argv.slice(2), {
  cwd: androidDir, stdio: 'inherit', shell: win,
  env: { ...process.env, JAVA_HOME: jdk },
});
process.exit(res.status ?? 1);
