import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy web/.env.example to web/.env.local');
}

/** Database and storage calls give up after this, so screens show an error instead of spinning forever. */
const TIMEOUT_MS = 30_000;

const timed = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(TIMEOUT_MS) });

/** Data and photo calls (not the auth endpoints themselves, which do the renewing). */
const isDataCall = (input: RequestInfo | URL) => /\/(rest|storage)\/v1\//.test(input instanceof Request ? input.url : String(input));

/** The server's "your login token has expired" answers, from the database and from storage. */
export function isExpiredTokenReply(status: number, body: unknown): boolean {
  if (status !== 401 && status !== 403 && status !== 400) return false;
  const b = (body ?? {}) as { code?: unknown; message?: unknown; error?: unknown };
  return b.code === 'PGRST303' || /jwt expired|"exp" claim|token is expired/i.test(`${String(b.message ?? '')} ${String(b.error ?? '')}`);
}

let renewing: Promise<string | null> | null = null;

/**
 * Gets a fresh login token from the refresh token. The Supabase client decides when to renew
 * using the phone's own clock, so a phone whose clock is off (or a session left idle) can hold an
 * expired token it still thinks is valid; the server's "expired" reply is the real signal.
 * Concurrent callers share one renewal.
 */
export function renewSession(): Promise<string | null> {
  renewing ??= supabase.auth.refreshSession()
    .then(({ data }) => data.session?.access_token ?? null)
    .catch(() => null)
    .finally(() => { renewing = null; });
  return renewing;
}

export const supabase = createClient<Database>(url, anonKey, {
  global: {
    fetch: async (input, init) => {
      const res = await timed(input, init);
      if (res.ok || !isDataCall(input) || res.status >= 500) return res;
      const body: unknown = await res.clone().json().catch(() => null);
      if (!isExpiredTokenReply(res.status, body)) return res;
      const token = await renewSession();
      if (!token) return res;
      const headers = new Headers(init?.headers);
      headers.set('Authorization', `Bearer ${token}`);
      return timed(input, { ...init, headers }); // one retry only
    },
  },
});
