import type { ItemCategory } from '../database.types';

export const CATEGORIES: ItemCategory[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory'];

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  top: 'Top',
  bottom: 'Bottom',
  dress: 'Dress',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  bag: 'Bag',
  accessory: 'Accessory',
};

export const CATEGORY_PLURAL: Record<ItemCategory, string> = {
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  bag: 'Bags',
  accessory: 'Accessories',
};

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function wornLabel(count: number): string {
  if (count === 0) return 'Not worn yet';
  return count === 1 ? 'Worn once' : `Worn ${count}×`;
}

/** "2026-09-24" → "Sep 24" (local calendar date). */
export function shortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}
