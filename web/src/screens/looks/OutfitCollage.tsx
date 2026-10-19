import type { GeneratedOutfit } from '../../lib/api';
import type { ClosetItem } from '../../lib/closet/data';
import { cx } from '../../lib/cx';
import { ItemPhoto } from '../closet/ItemPhoto';

const SLOT_ORDER = ['dress', 'top', 'bottom', 'outerwear', 'shoes', 'bag', 'accessory'];
const TINTS = ['bg-tint-lilac', 'bg-tint-sage', 'bg-tint-peach', 'bg-tint-blue', 'bg-tint-pink'];

/** The outfit as a collage: main pieces in a tall left column, the rest stacked on the right. */
export function OutfitCollage({ outfit, items, urls }: { outfit: Pick<GeneratedOutfit, 'pieces'>; items: ClosetItem[]; urls: Map<string, string> }) {
  const pieces = [...outfit.pieces]
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
    .map((p) => items.find((i) => i.id === p.id))
    .filter((i): i is ClosetItem => i !== undefined);
  const leftCount = pieces.length <= 3 ? 1 : 2;
  const left = pieces.slice(0, leftCount);
  const right = pieces.slice(leftCount);

  const tile = (item: ClosetItem, i: number, tall: boolean) => (
    <ItemPhoto key={item.id} src={urls.get(item.image_path)} alt={item.name} tint={TINTS[i % TINTS.length]}
      className={cx('w-full', tall ? 'min-h-40 flex-1' : 'aspect-[4/3]')} />
  );

  return (
    <div className="grid grid-cols-2 gap-3" aria-label={`Outfit: ${pieces.map((p) => p.name).join(', ')}`}>
      <div className="flex flex-col gap-3">{left.map((p, i) => tile(p, i, true))}</div>
      <div className="flex flex-col gap-3">{right.map((p, i) => tile(p, i + leftCount, false))}</div>
    </div>
  );
}
