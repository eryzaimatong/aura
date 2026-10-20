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

/** Finer types per category. Keys mirror api/app/ml/taxonomy.py SUBCATEGORIES. */
export const SUBCATEGORIES: Record<ItemCategory, ReadonlyArray<{ key: string; label: string }>> = {
  top: [{ key: 'tshirt', label: 'T-shirt' }, { key: 'blouse', label: 'Blouse' }, { key: 'shirt', label: 'Shirt' }, { key: 'tank', label: 'Tank top' }, { key: 'sweater', label: 'Sweater' }],
  bottom: [{ key: 'jeans', label: 'Jeans' }, { key: 'trousers', label: 'Trousers' }, { key: 'shorts', label: 'Shorts' }, { key: 'skirt', label: 'Skirt' }],
  dress: [{ key: 'dress', label: 'Dress' }, { key: 'jumpsuit', label: 'Jumpsuit' }],
  outerwear: [{ key: 'blazer', label: 'Blazer' }, { key: 'jacket', label: 'Jacket' }, { key: 'cardigan', label: 'Cardigan' }, { key: 'coat', label: 'Coat' }, { key: 'hoodie', label: 'Hoodie' }],
  shoes: [{ key: 'sneakers', label: 'Sneakers' }, { key: 'heels', label: 'Heels' }, { key: 'sandals', label: 'Sandals' }, { key: 'flats', label: 'Flats' }, { key: 'boots', label: 'Boots' }],
  bag: [{ key: 'handbag', label: 'Handbag' }, { key: 'tote', label: 'Tote' }, { key: 'backpack', label: 'Backpack' }],
  accessory: [{ key: 'hat', label: 'Hat' }, { key: 'scarf', label: 'Scarf' }, { key: 'belt', label: 'Belt' }, { key: 'jewelry', label: 'Jewelry' }, { key: 'sunglasses', label: 'Sunglasses' }],
};

/** How the outfit generator reads seasonality: warm = good in heat, cool = for cool days. */
export const SEASONALITY_LABEL = { warm: 'Hot days', cool: 'Cool days', all: 'Any weather' } as const;
