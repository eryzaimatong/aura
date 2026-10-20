import { describe, expect, it } from 'vitest';
import type { ItemCategory } from '../database.types';
import { outfitMath } from './outfitMath';

const closet = (spec: Partial<Record<ItemCategory, number>>) =>
  Object.entries(spec).flatMap(([category, count]) => Array.from({ length: count }, () => ({ category: category as ItemCategory })));

describe('outfitMath', () => {
  it('counts tops × bottoms plus dresses', () => {
    expect(outfitMath(closet({ top: 4, bottom: 2, dress: 1, shoes: 3 })).outfits).toBe(9);
  });
  it('suggests the side that unlocks the most', () => {
    expect(outfitMath(closet({ top: 6, bottom: 2 })).next).toEqual({ category: 'bottom', adds: 6 });
    expect(outfitMath(closet({ top: 1, bottom: 3 })).next).toEqual({ category: 'top', adds: 3 });
  });
  it('has no suggestion when there is nothing to pair with', () => {
    expect(outfitMath(closet({ dress: 2 })).next).toBeNull();
    expect(outfitMath(closet({ top: 3 })).next).toEqual({ category: 'bottom', adds: 3 });
  });
});
