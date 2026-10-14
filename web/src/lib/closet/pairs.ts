import type { ItemCategory, WearLogRow } from '../database.types';
import type { ClosetItem } from './data';

/** Hard rule 7: every pairing comes with the reason it was suggested. */
export interface Pairing {
  item: ClosetItem;
  reason: string;
}

// Slots that complete an outfit around a given piece.
const COMPLEMENTS: Record<ItemCategory, ItemCategory[]> = {
  top: ['bottom', 'outerwear', 'shoes'],
  bottom: ['top', 'shoes', 'outerwear'],
  dress: ['outerwear', 'shoes', 'bag'],
  outerwear: ['top', 'dress', 'bottom'],
  shoes: ['bottom', 'dress', 'top'],
  bag: ['dress', 'top', 'outerwear'],
  accessory: ['top', 'dress', 'outerwear'],
};

/**
 * What to wear with `item`: first, pieces actually worn on the same days (the diary
 * knows best); then complementary pieces that are both in the user's palette.
 */
export function pairsFor(item: ClosetItem, closet: ClosetItem[], log: Pick<WearLogRow, 'item_id' | 'worn_on'>[], limit = 3): Pairing[] {
  const myDays = new Set(log.filter((w) => w.item_id === item.id).map((w) => w.worn_on));
  const together = new Map<string, number>();
  for (const w of log) {
    if (w.item_id !== item.id && myDays.has(w.worn_on)) together.set(w.item_id, (together.get(w.item_id) ?? 0) + 1);
  }

  const others = closet.filter((c) => c.id !== item.id && c.category !== item.category);
  const picks: Pairing[] = others
    .filter((c) => together.has(c.id))
    .sort((a, b) => (together.get(b.id) ?? 0) - (together.get(a.id) ?? 0))
    .map((c) => ({ item: c, reason: `Worn together ${together.get(c.id)}×` }));

  const slots = COMPLEMENTS[item.category];
  const byPalette = others
    .filter((c) => !together.has(c.id) && slots.includes(c.category) && c.in_palette && item.in_palette)
    .sort((a, b) => slots.indexOf(a.category) - slots.indexOf(b.category))
    .map((c) => ({ item: c, reason: 'Both in your palette' }));

  return [...picks, ...byPalette].slice(0, limit);
}

/** 1 → "1st", 2 → "2nd", 11 → "11th". */
export function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** Rank among worn items by wear count; null if this item hasn't been worn. */
export function mostWornRank(item: ClosetItem, closet: ClosetItem[]): number | null {
  if (item.wearCount === 0) return null;
  return 1 + closet.filter((c) => c.wearCount > item.wearCount).length;
}
