import { request } from './api';
import type { RecKind, RecVerdict } from './database.types';
import { supabase } from './supabase';

export type VanityKind = Exclude<RecKind, 'product'>;

export interface VanityRec {
  id: string;
  kind: VanityKind;
  key: string;
  title: string;
  reason: string;
  fit_score: number;
  swatches: string[];
  icon: string;
  saved: boolean;
  dismissed: boolean;
}

/**
 * Vanity picks for the current Aura Card. Rebuilt by the API whenever the card changes
 * (new scan, quiz or correction), so advice always matches what the card says.
 */
export async function loadVanity(userId: string, cardId: string): Promise<VanityRec[]> {
  const existing = await supabase.from('recommendations').select('*').eq('user_id', userId).in('kind', ['makeup', 'hair', 'colors']);
  if (existing.error) throw existing.error;

  let recs = existing.data
    .filter((r) => r.payload?.card_id === cardId)
    .map((r) => ({ id: r.id, kind: r.kind as VanityKind, key: r.payload?.key ?? '', title: r.payload?.title ?? '',
      reason: r.reason, fit_score: r.fit_score, swatches: r.payload?.swatches ?? [], icon: r.payload?.icon ?? 'swatch' }));
  if (recs.length === 0) {
    recs = await request<Omit<VanityRec, 'saved' | 'dismissed'>[]>('/api/recommendations/refresh', { method: 'POST', auth: true });
  }

  const ids = recs.map((r) => r.id);
  const fb = ids.length ? await supabase.from('rec_feedback').select('rec_id, verdict').in('rec_id', ids) : { data: [], error: null };
  if (fb.error) throw fb.error;
  const has = (id: string, v: RecVerdict) => fb.data.some((f) => f.rec_id === id && f.verdict === v);

  return recs
    // Hard rule 7: no reason, no render.
    .filter((r) => r.reason.trim().length > 0)
    .map((r) => ({ ...r, saved: has(r.id, 'saved'), dismissed: has(r.id, 'dismissed') }))
    // Hard rule 9: fit_score is the only ranking signal.
    .sort((a, b) => b.fit_score - a.fit_score);
}

export async function setSaved(userId: string, recId: string, saved: boolean): Promise<void> {
  const { error } = saved
    ? await supabase.from('rec_feedback').insert({ rec_id: recId, user_id: userId, verdict: 'saved' })
    : await supabase.from('rec_feedback').delete().eq('rec_id', recId).eq('verdict', 'saved');
  if (error && error.code !== '23505') throw error;
}

export async function dismiss(userId: string, recId: string): Promise<void> {
  const { error } = await supabase.from('rec_feedback').insert({ rec_id: recId, user_id: userId, verdict: 'dismissed' });
  if (error && error.code !== '23505') throw error;
}
