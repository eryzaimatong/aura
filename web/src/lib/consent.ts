import type { ConsentKind } from './database.types';
import { POLICY_VERSION } from './policy';
import { supabase } from './supabase';

/** True when the latest event of this kind is a grant of the current notice. */
export async function hasCurrentConsent(userId: string, kind: ConsentKind): Promise<boolean> {
  const { data, error } = await supabase
    .from('consents')
    .select('granted, policy_ver')
    .eq('user_id', userId)
    .eq('kind', kind)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const latest = data[0];
  return !!latest && latest.granted && latest.policy_ver === POLICY_VERSION;
}

/** Appends a consent event — the table is an audit trail, rows are never edited. */
export async function recordConsent(userId: string, kind: ConsentKind, granted: boolean): Promise<void> {
  const { error } = await supabase.from('consents').insert({ user_id: userId, kind, granted, policy_ver: POLICY_VERSION });
  if (error) throw error;
}
