import type { WearLogRow } from '../database.types';
import { listItems, signedUrls, wearLog, type ClosetItem } from './data';

/**
 * One shared copy of the closet for every screen, so moving between rooms doesn't re-download
 * it each time. Data refreshes in the background when it's older than STALE_MS or after any
 * change (writes call invalidateCloset), and photo links are re-signed before they expire.
 */

export type ClosetState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: ClosetItem[]; urls: Map<string, string>; log: Pick<WearLogRow, 'item_id' | 'worn_on'>[] };

const STALE_MS = 30_000;
// Signed links last 60 minutes (data.ts); renew with time to spare.
const URL_RENEW_MS = 45 * 60_000;

interface Entry {
  userId: string;
  state: ClosetState;
  fetchedAt: number;
  urlsAt: number;
}

let entry: Entry | null = null;
// Bumped on sign-out, so a fetch that finishes afterwards can't bring the closet back.
let generation = 0;
let inflight: { userId: string; promise: Promise<void> } | null = null;
const listeners = new Set<() => void>();
const LOADING: ClosetState = { status: 'loading' };

function emit() {
  for (const l of listeners) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function snapshot(userId: string): ClosetState {
  return entry?.userId === userId ? entry.state : LOADING;
}

async function fetchCloset(userId: string, toMessage: (err: unknown) => string): Promise<void> {
  const gen = generation;
  try {
    const [items, log] = await Promise.all([listItems(userId), wearLog(userId)]);
    const urls = await signedUrls(items.map((i) => i.image_path));
    if (gen !== generation) return;
    const now = Date.now();
    entry = { userId, state: { status: 'ready', items, urls, log }, fetchedAt: now, urlsAt: now };
  } catch (err) {
    if (gen !== generation) return;
    // Keep showing what we have if a background refresh fails; only a first load shows the error.
    if (entry?.userId !== userId || entry.state.status !== 'ready') {
      entry = { userId, state: { status: 'error', message: toMessage(err) }, fetchedAt: Date.now(), urlsAt: 0 };
    }
  }
  emit();
}

/** Fetches if missing, stale, invalidated or the photo links are about to expire. Deduplicated. */
export function ensureFresh(userId: string, toMessage: (err: unknown) => string, force = false): Promise<void> {
  const now = Date.now();
  const fresh = entry?.userId === userId && entry.state.status === 'ready'
    && now - entry.fetchedAt < STALE_MS && now - entry.urlsAt < URL_RENEW_MS;
  if (fresh && !force) return Promise.resolve();
  if (inflight?.userId === userId && !force) return inflight.promise;
  // Forced after a write: a fetch already in flight may predate it, so fetch again after it.
  const start = inflight?.userId === userId ? inflight.promise.then(() => fetchCloset(userId, toMessage)) : fetchCloset(userId, toMessage);
  const promise = start.finally(() => {
    if (inflight?.promise === promise) inflight = null;
  });
  inflight = { userId, promise };
  return promise;
}

/** Call after any write to closet items, the wear log or photos. */
export function invalidateCloset(): void {
  if (entry) entry.fetchedAt = 0;
}

/** On sign-out or account deletion: drop the closet from memory entirely. */
export function clearClosetCache(): void {
  generation += 1;
  entry = null;
  inflight = null;
  emit();
}
