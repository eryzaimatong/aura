import type { ClosetItemInsert, ClosetItemRow, WearLogRow } from '../database.types';
import { supabase } from '../supabase';
import { invalidateCloset } from './cache';

const BUCKET = 'closet';
const SIGNED_URL_TTL_S = 60 * 60;

/** An item plus its wear metrics (hard rule 8: wears, last worn — never cost). */
export type ClosetItem = ClosetItemRow & { wearCount: number; lastWorn: string | null };

const ITEM_COLUMNS =
  'id, user_id, name, category, subcategory, image_path, dominant_colors, lab_primary, in_palette, auto_tagged, seasonality, archived, created_at, updated_at';

/** Active pieces, or with `archived` the ones packed away (kept with their wear history, out of outfits). */
export async function listItems(userId: string, { archived = false } = {}): Promise<ClosetItem[]> {
  const [items, stats] = await Promise.all([
    supabase.from('closet_items').select(ITEM_COLUMNS).eq('user_id', userId).eq('archived', archived).order('created_at', { ascending: false }),
    supabase.from('item_wear_stats').select('item_id, wear_count, last_worn').eq('user_id', userId),
  ]);
  if (items.error) throw items.error;
  if (stats.error) throw stats.error;
  const byId = new Map(stats.data.map((s) => [s.item_id, s]));
  return items.data.map((i) => ({ ...i, wearCount: byId.get(i.id)?.wear_count ?? 0, lastWorn: byId.get(i.id)?.last_worn ?? null }));
}

export async function countItems(userId: string): Promise<number> {
  const { count, error } = await supabase.from('closet_items').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('archived', false);
  if (error) throw error;
  return count ?? 0;
}

/** Private bucket: photos are shown through short-lived signed links. */
export async function signedUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_S);
  if (error) throw error;
  return new Map(data.flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}

export type NewItem = Omit<ClosetItemInsert, 'user_id' | 'image_path' | 'embedding'> & { embedding?: number[] | null };

/** Uploads the cut-out WebP into the user's own folder, then records the item. */
export async function saveItem(userId: string, image: Blob, item: NewItem): Promise<ClosetItemRow> {
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const up = await supabase.storage.from(BUCKET).upload(path, image, { contentType: 'image/webp', upsert: false });
  if (up.error) throw up.error;

  const { embedding, ...rest } = item;
  const { data, error } = await supabase
    .from('closet_items')
    .insert({ ...rest, user_id: userId, image_path: path, embedding: embedding ? `[${embedding.join(',')}]` : null })
    .select(ITEM_COLUMNS)
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]); // don't leave an orphaned photo
    throw error;
  }
  invalidateCloset();
  return data;
}

/** Pack a piece away (out of season, lent out, donated) or bring it back. */
export async function setArchived(itemId: string, archived: boolean): Promise<void> {
  const { error } = await supabase.from('closet_items').update({ archived }).eq('id', itemId);
  if (error) throw error;
  invalidateCloset();
}

/** Hard rule 5: deletion is real — the row (and its wear log, by cascade) and the photo. */
export async function deleteItem(item: Pick<ClosetItemRow, 'id' | 'image_path'>): Promise<void> {
  const { error } = await supabase.from('closet_items').delete().eq('id', item.id);
  if (error) throw error;
  invalidateCloset();
  const removed = await supabase.storage.from(BUCKET).remove([item.image_path]);
  if (removed.error) console.warn('photo not removed', removed.error);
}

/** Today in the user's own timezone (worn_on is a calendar date, not a UTC instant). */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Logs a wear for today. Returns false if it was already logged (one wear per item per day). */
export async function logWearToday(userId: string, itemId: string): Promise<boolean> {
  const { error } = await supabase.from('wear_log').insert({ user_id: userId, item_id: itemId, worn_on: localToday() });
  if (error?.code === '23505') return false;
  if (error) throw error;
  invalidateCloset();
  return true;
}

export async function wearLog(userId: string): Promise<Pick<WearLogRow, 'item_id' | 'worn_on'>[]> {
  const { data, error } = await supabase.from('wear_log').select('item_id, worn_on').eq('user_id', userId);
  if (error) throw error;
  return data;
}
