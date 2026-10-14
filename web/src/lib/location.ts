/**
 * Coarse location for the weather card. Opt-in only (a button, never a prompt on load),
 * rounded to ~11 km, and kept on this device as a convenience — never sent to our database.
 */
export interface Coords {
  lat: number;
  lon: number;
}

const KEY = 'aura.coarse_location';
const round1 = (n: number) => Math.round(n * 10) / 10;

export function savedCoords(): Coords | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<Coords>;
    return typeof c.lat === 'number' && typeof c.lon === 'number' ? { lat: c.lat, lon: c.lon } : null;
  } catch {
    return null;
  }
}

export function requestCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location isn’t available on this device.'));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: round1(pos.coords.latitude), lon: round1(pos.coords.longitude) };
        try {
          localStorage.setItem(KEY, JSON.stringify(c));
        } catch {
          // storage blocked: still use it for this session
        }
        resolve(c);
      },
      () => reject(new Error('Location was not shared. Showing Metro Manila instead.')),
      { enableHighAccuracy: false, maximumAge: 60 * 60 * 1000, timeout: 10_000 },
    );
  });
}
