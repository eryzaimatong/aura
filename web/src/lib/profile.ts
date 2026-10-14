import type { User } from '@supabase/supabase-js';
import { isAgeBracket, type AgeBracket } from './ageBracket';
import type { ProfileRow } from './database.types';
import { POLICY_VERSION } from './policy';
import { supabase } from './supabase';

/** What signup stores on the auth user until the first session can write the profile. */
export interface SignupMetadata {
  display_name: string;
  age_bracket: AgeBracket;
  guardian_ok: boolean;
}

export class ProfileSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileSetupError';
  }
}

function readSignupMetadata(user: User): SignupMetadata | null {
  const m = user.user_metadata as Record<string, unknown>;
  const name = typeof m.display_name === 'string' ? m.display_name.trim() : '';
  if (!name || !isAgeBracket(m.age_bracket)) return null;
  return { display_name: name, age_bracket: m.age_bracket, guardian_ok: m.guardian_ok === true };
}

/**
 * Returns the user's profile, creating it on the first session after signup.
 * Email confirmation means signup itself has no session, so the row can only be
 * written here — from the metadata signup left on the auth user.
 */
export function ensureProfile(user: User): Promise<ProfileRow> {
  // One call per user at a time: concurrent callers (StrictMode, auth events) would
  // otherwise race the insert and append duplicate consent rows.
  const pending = inflight.get(user.id);
  if (pending) return pending;
  const run = (async () => {
    const profile = await findOrCreateProfile(user);
    if (profile.age_bracket === '13_17') await ensureGuardianConsent(user.id);
    return profile;
  })().finally(() => inflight.delete(user.id));
  inflight.set(user.id, run);
  return run;
}

const inflight = new Map<string, Promise<ProfileRow>>();

/** The guardian's agreement is a consent event like any other — appended once, never edited. */
async function ensureGuardianConsent(userId: string): Promise<void> {
  const found = await supabase.from('consents').select('id').eq('user_id', userId).eq('kind', 'guardian').limit(1);
  if (found.error) throw found.error;
  if (found.data.length > 0) return;
  const inserted = await supabase
    .from('consents')
    .insert({ user_id: userId, kind: 'guardian', granted: true, policy_ver: POLICY_VERSION });
  if (inserted.error) throw inserted.error;
}

async function findOrCreateProfile(user: User): Promise<ProfileRow> {
  const existing = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const meta = readSignupMetadata(user);
  if (!meta) throw new ProfileSetupError('This account is missing its signup details.');
  // The database enforces these too (no_under_13, minors_need_guardian); fail clearly first.
  if (meta.age_bracket === 'under_13') throw new ProfileSetupError('AURA is for ages 13 and up.');
  if (meta.age_bracket === '13_17' && !meta.guardian_ok) {
    throw new ProfileSetupError('A parent or guardian needs to agree before this account can be used.');
  }

  const created = await supabase
    .from('profiles')
    .insert({ id: user.id, display_name: meta.display_name, age_bracket: meta.age_bracket, guardian_ok: meta.guardian_ok })
    .select('*')
    .single();
  if (created.error) throw created.error;
  return created.data;
}
