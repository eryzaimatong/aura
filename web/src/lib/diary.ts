/**
 * Diary maths, all from the wear log and the closet. Pure functions (no I/O).
 * Hard rule 8: metrics are wears, last worn, worn-once and utilisation — never cost.
 */
import type { ClosetItem } from './closet/data';

export interface Wear {
  item_id: string;
  worn_on: string; // YYYY-MM-DD, local
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Consecutive days with at least one wear, ending today (or yesterday if today isn't logged yet). */
export function streak(log: Wear[], today: Date): number {
  const days = new Set(log.map((w) => w.worn_on));
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(iso(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(iso(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export interface Utilisation {
  items: number;
  pctUsed: number; // 0-100, share of pieces worn at least once
  wornOnce: number;
  unworn: number;
}

export function utilisation(items: ClosetItem[]): Utilisation {
  const worn = items.filter((i) => i.wearCount > 0).length;
  return {
    items: items.length,
    pctUsed: items.length ? Math.round((100 * worn) / items.length) : 0,
    wornOnce: items.filter((i) => i.wearCount === 1).length,
    unworn: items.length - worn,
  };
}

/** Wears in each calendar week of the month: W1 = days 1-7, W2 = 8-14, … */
export function weeklyWears(log: Wear[], year: number, month: number): number[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Array.from({ length: Math.ceil(daysInMonth / 7) }, () => 0);
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  for (const w of log) {
    if (!w.worn_on.startsWith(prefix)) continue;
    const day = Number(w.worn_on.slice(8, 10));
    weeks[Math.floor((day - 1) / 7)]! += 1;
  }
  return weeks;
}

export interface ColourShare {
  name: string;
  hex: string;
  wears: number;
}

/** Most-worn colours this month, by each piece's main colour. */
export function topColours(log: Wear[], items: ClosetItem[], year: number, month: number, limit = 3): ColourShare[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const byId = new Map(items.map((i) => [i.id, i]));
  const totals = new Map<string, ColourShare>();
  for (const w of log) {
    const main = w.worn_on.startsWith(prefix) ? byId.get(w.item_id)?.dominant_colors[0] : undefined;
    if (!main?.name) continue;
    const t = totals.get(main.name) ?? { name: main.name, hex: main.hex, wears: 0 };
    t.wears += 1;
    totals.set(main.name, t);
  }
  return [...totals.values()].sort((a, b) => b.wears - a.wears).slice(0, limit);
}

/** One gentle, evidence-backed observation (hard rule 7: it says why). */
export function insight(log: Wear[], items: ClosetItem[], year: number, month: number): string {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const byId = new Map(items.map((i) => [i.id, i]));
  const month_ = log.filter((w) => w.worn_on.startsWith(prefix));
  const palette = month_.filter((w) => byId.get(w.item_id)?.in_palette === true).length;
  if (month_.length >= 5 && palette / month_.length >= 0.6) {
    return `${Math.round((100 * palette) / month_.length)}% of what you wore this month came from your palette.`;
  }
  const top = [...items].sort((a, b) => b.wearCount - a.wearCount)[0];
  if (top && top.wearCount >= 3) return `Your ${top.name.toLowerCase()} is your most-worn piece — ${top.wearCount} wears so far.`;
  const unworn = items.filter((i) => i.wearCount === 0);
  if (unworn.length >= 3) return `${unworn.length} pieces haven’t had an outing yet. The ${unworn[0]!.name.toLowerCase()} could be next.`;
  return 'Log what you wear for a week and Mira will start spotting patterns.';
}

export interface Rediscover {
  item: ClosetItem;
  /** Days since last worn, or since it was added if never worn. */
  idleDays: number;
  never: boolean;
}

const REDISCOVER_AFTER_DAYS = 30;
const NEW_ITEM_GRACE_DAYS = 14;

/**
 * Pieces that haven't been out in a while, longest-idle first. Accessories are skipped
 * (outfits aren't built around them). Never-worn pieces get a two-week grace period.
 */
export function rediscover(items: ClosetItem[], today: Date, limit = 3): Rediscover[] {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = (isoDate: string) => {
    const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
    return Math.round((t - new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getTime()) / 86_400_000);
  };
  return items
    .filter((i) => i.category !== 'accessory' && !i.archived)
    .map((item) => item.lastWorn
      ? { item, idleDays: days(item.lastWorn), never: false }
      : { item, idleDays: days(item.created_at), never: true })
    .filter((r) => r.idleDays >= (r.never ? NEW_ITEM_GRACE_DAYS : REDISCOVER_AFTER_DAYS))
    .sort((a, b) => b.idleDays - a.idleDays)
    .slice(0, limit);
}

/** "last out 6 weeks ago" / "not worn yet": plain facts, never a judgement. */
export function idleLabel(r: Rediscover): string {
  if (r.never) return 'not worn yet';
  const weeks = Math.floor(r.idleDays / 7);
  return r.idleDays < 60 ? `last out ${weeks} weeks ago` : `last out ${Math.round(r.idleDays / 30)} months ago`;
}
