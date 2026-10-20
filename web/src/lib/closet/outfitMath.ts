import type { ItemCategory } from '../database.types';

export interface OutfitMath {
  /** Distinct base outfits: every top with every bottom, plus each dress. */
  outfits: number;
  /** The single addition that unlocks the most new bases, if any. */
  next: { category: 'top' | 'bottom'; adds: number } | null;
}

/** Counting only: no shopping, no judgement. Shoes and layers multiply looks but aren't counted. */
export function outfitMath(items: ReadonlyArray<{ category: ItemCategory }>): OutfitMath {
  const n = (c: ItemCategory) => items.filter((i) => i.category === c).length;
  const tops = n('top');
  const bottoms = n('bottom');
  const outfits = tops * bottoms + n('dress');
  // One more top pairs with every bottom, and vice versa.
  const next = tops === 0 && bottoms === 0 ? null
    : bottoms <= tops ? { category: 'bottom' as const, adds: tops }
    : { category: 'top' as const, adds: bottoms };
  return { outfits, next: next && next.adds > 0 ? next : null };
}
