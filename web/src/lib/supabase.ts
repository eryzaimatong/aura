import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy web/.env.example to web/.env.local');
}

/** Database and storage calls give up after this, so screens show an error instead of spinning forever. */
const TIMEOUT_MS = 30_000;

export const supabase = createClient<Database>(url, anonKey, {
  global: {
    fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(TIMEOUT_MS) }),
  },
});
