/**
 * Export and deletion (hard rule 5, Data Privacy Act 2012: access and erasure).
 * Everything runs as the signed-in user, so RLS limits it to their own rows.
 */
import type { DeleteScope } from './database.types';
import { localToday } from './closet/data';
import { POLICY_VERSION } from './policy';
import { clearClosetCache } from './closet/cache';
import { clearReminder } from './reminders';
import { supabase } from './supabase';

const BUCKET = 'closet';
const PHOTO_LINK_TTL_S = 24 * 60 * 60;

type Rows = Record<string, unknown>[];
type Result = PromiseLike<{ data: Rows | null; error: { message: string } | null }>;

// One typed query per table: everything the export must contain, all scoped to the user.
const QUERIES = {
  consents: (u: string): Result => supabase.from('consents').select('*').eq('user_id', u),
  scans: (u: string): Result => supabase.from('scans').select('*').eq('user_id', u),
  aura_cards: (u: string): Result => supabase.from('aura_cards').select('*').eq('user_id', u),
  card_corrections: (u: string): Result => supabase.from('card_corrections').select('*').eq('user_id', u),
  undertone_quiz: (u: string): Result => supabase.from('undertone_quiz').select('*').eq('user_id', u),
  closet_items: (u: string): Result => supabase.from('closet_items').select('*').eq('user_id', u),
  wear_log: (u: string): Result => supabase.from('wear_log').select('*').eq('user_id', u),
  outfits: (u: string): Result => supabase.from('outfits').select('*').eq('user_id', u),
  trips: (u: string): Result => supabase.from('trips').select('*').eq('user_id', u),
  goals: (u: string): Result => supabase.from('goals').select('*').eq('user_id', u),
  measurements: (u: string): Result => supabase.from('measurements').select('*').eq('user_id', u),
  style_prints: (u: string): Result => supabase.from('style_prints').select('*').eq('user_id', u),
  recommendations: (u: string): Result => supabase.from('recommendations').select('*').eq('user_id', u),
  rec_feedback: (u: string): Result => supabase.from('rec_feedback').select('*').eq('user_id', u),
  data_requests: (u: string): Result => supabase.from('data_requests').select('*').eq('user_id', u),
};
type Table = keyof typeof QUERIES;

async function rows(table: Table, userId: string): Promise<Rows> {
  const { data, error } = await QUERIES[table](userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function count(table: 'scans' | 'closet_items' | 'wear_log', userId: string): Promise<number> {
  const { count: n, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw error;
  return n ?? 0;
}

/** For the "What AURA stores about you" card. */
export async function storedSummary(userId: string) {
  const [scans, items, wears] = await Promise.all([count('scans', userId), count('closet_items', userId), count('wear_log', userId)]);
  return { scans, items, wears };
}

export interface ExportFile {
  fileName: string;
  text: string;
  bytes: number;
  contents: string[];
}

/** Builds the export on the device. Nothing is emailed or stored server-side. */
export async function buildExport(userId: string, email: string | undefined): Promise<ExportFile> {
  const tables = Object.keys(QUERIES) as Table[];
  const [profile, ...lists] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    ...tables.map((t) => rows(t, userId)),
  ]);
  if (profile.error) throw profile.error;
  const data = Object.fromEntries(tables.map((t, i) => [t, lists[i] ?? []])) as Record<Table, Record<string, unknown>[]>;

  const outfitIds = data.outfits.map((o) => String(o.id));
  const outfitItems = outfitIds.length
    ? (await supabase.from('outfit_items').select('*').in('outfit_id', outfitIds)).data ?? []
    : [];

  // Closet photos: 24-hour links rather than embedding images in the file.
  const paths = data.closet_items.map((i) => String(i.image_path));
  const links = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, PHOTO_LINK_TTL_S);
    signed?.forEach((s) => s.path && s.signedUrl && links.set(s.path, s.signedUrl));
  }

  const doc = {
    exported_at: new Date().toISOString(),
    app: 'AURA',
    privacy_notice_version: POLICY_VERSION,
    selfies: 'none — AURA never uploads or stores your selfie, only the numbers read from it',
    account: { email: email ?? null, profile: profile.data },
    ...data,
    closet_items: data.closet_items.map((i) => ({ ...i, photo_link_24h: links.get(String(i.image_path)) ?? null })),
    outfit_items: outfitItems,
  };
  const text = JSON.stringify(doc, null, 2);

  await supabase.from('data_requests').insert({ user_id: userId, kind: 'export', status: 'done', completed_at: new Date().toISOString() });

  const n = (t: Table) => data[t].length;
  const contents = [
    `${n('aura_cards')} Aura Card${n('aura_cards') === 1 ? '' : 's'} and ${n('scans')} face measurement${n('scans') === 1 ? '' : 's'}`,
    `${n('closet_items')} closet items with tags and photo links`,
    `${n('wear_log')} wear log entries`,
    `${n('outfits')} saved looks`,
    `${n('consents')} consent records and your account details`,
  ];
  return { fileName: `aura-export-${localToday()}.json`, text, bytes: new Blob([text]).size, contents };
}

/** Removes every photo in the user's closet folder (Storage files can't be deleted from SQL). */
async function removeClosetPhotos(userId: string): Promise<void> {
  // 100 per page; the cap (10,000 photos) stops a runaway loop if a removal silently fails.
  for (let page = 0; page < 100; page++) {
    const { data, error } = await supabase.storage.from(BUCKET).list(userId, { limit: 100 });
    if (error) throw error;
    if (!data || data.length === 0) return;
    const { error: rmError } = await supabase.storage.from(BUCKET).remove(data.map((f) => `${userId}/${f.name}`));
    if (rmError) throw rmError;
  }
  throw new Error('Some closet photos could not be removed. Please try again.');
}

/** Real, immediate deletion. 'all' also deletes the login itself. */
export async function deleteMyData(userId: string, scope: DeleteScope): Promise<void> {
  if (scope === 'closet' || scope === 'all') await removeClosetPhotos(userId);
  const { error } = await supabase.rpc('delete_my_data', { scope });
  if (error) throw error;
  if (scope === 'closet' || scope === 'all') clearClosetCache();
  if (scope === 'all') {
    await clearReminder();
    await supabase.auth.signOut({ scope: 'local' });
  }
}

export function formatBytes(n: number): string {
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}
