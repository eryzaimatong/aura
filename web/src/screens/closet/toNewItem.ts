import type { TagResponse } from '../../lib/api';
import type { NewItem } from '../../lib/closet/data';
import type { ItemCategory } from '../../lib/database.types';

/** Form + Mira's suggestions → the row to insert. Untagged items keep only what the user chose. */
export function toNewItem(tags: TagResponse | null, name: string, category: ItemCategory): NewItem {
  if (!tags) return { name, category, auto_tagged: false };
  return {
    name,
    category,
    // Keep Mira's finer type only if the user didn't switch to another category.
    subcategory: category === tags.category ? tags.subcategory : null,
    dominant_colors: tags.colors,
    lab_primary: tags.lab_primary,
    in_palette: tags.in_palette,
    embedding: tags.embedding,
    auto_tagged: true,
    seasonality: tags.seasonality,
  };
}
