import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Input } from '../../components/Input';
import { Mira } from '../../components/Mira';
import { RoomNav } from '../../components/RoomNav';
import { Screen } from '../../components/Screen';
import type { ClosetItem } from '../../lib/closet/data';
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_PLURAL, wornLabel } from '../../lib/closet/labels';
import { outfitMath } from '../../lib/closet/outfitMath';
import type { ItemCategory } from '../../lib/database.types';
import { FormAlert } from '../onboarding/FormAlert';
import { ItemPhoto } from './ItemPhoto';
import { useCloset } from './useCloset';

type Filter = 'all' | 'palette' | ItemCategory;
const NO_ITEMS: ClosetItem[] = [];
type Sort = 'newest' | 'most' | 'least' | 'idle';

const SORTS: Record<Sort, { label: string; cmp: (a: ClosetItem, b: ClosetItem) => number }> = {
  newest: { label: 'Newest', cmp: (a, b) => b.created_at.localeCompare(a.created_at) },
  most: { label: 'Most worn', cmp: (a, b) => b.wearCount - a.wearCount },
  least: { label: 'Least worn', cmp: (a, b) => a.wearCount - b.wearCount },
  // Never-worn first, then the longest since last worn.
  idle: { label: 'Longest since worn', cmp: (a, b) => (a.lastWorn ?? '').localeCompare(b.lastWorn ?? '') },
};

export function ClosetScreen() {
  const navigate = useNavigate();
  const { state, reload } = useCloset();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('newest');

  const items = state.status === 'ready' ? state.items : NO_ITEMS;
  const present = useMemo(() => CATEGORIES.filter((c) => items.some((i) => i.category === c)), [items]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) =>
      (filter === 'all' || (filter === 'palette' ? i.in_palette === true : i.category === filter)) &&
      (!q || i.name.toLowerCase().includes(q) || (i.subcategory ?? '').includes(q)
        || i.dominant_colors.some((c) => c.name?.toLowerCase().includes(q)))).sort(SORTS[sort].cmp);
  }, [items, filter, query, sort]);

  return (
    <Screen className="pb-32">
      <header className="flex items-end justify-between">
        <h1 className="font-display text-h1 font-semibold">The Closet</h1>
        <div className="flex items-center gap-3">
          {state.status === 'ready' && <span className="text-label text-cocoa-soft">{items.length} items</span>}
          <Button size="sm" icon={<Plus size={16} />} onClick={() => navigate('/closet/add')} aria-label="Add an item">Add</Button>
        </div>
      </header>

      {state.status === 'loading' && <p role="status" className="mt-10 text-center font-mira text-h3 text-cocoa-soft">opening the wardrobe…</p>}
      {state.status === 'error' && (
        <div className="mt-6 flex flex-col gap-3">
          <FormAlert message={state.message} />
          <Button variant="ghost" onClick={reload}>Try again</Button>
        </div>
      )}

      {state.status === 'ready' && items.length === 0 && (
        <div className="mt-10 flex flex-col items-center text-center">
          <Mira expression="closet-pick" size="lg" />
          <h2 className="mt-4 font-display text-h3 font-semibold">Your closet is empty</h2>
          <p className="mt-1 text-body text-cocoa-soft">Start with the 15 pieces you actually reach for.</p>
          <div className="mt-6 flex w-full flex-col gap-3">
            <Button fullWidth onClick={() => navigate('/closet/start')}>Add my top 15</Button>
            <Button variant="ghost" fullWidth onClick={() => navigate('/closet/add')}>Add one item</Button>
          </div>
        </div>
      )}

      {state.status === 'ready' && items.length > 0 && (
        <>
          {(() => {
            const m = outfitMath(items);
            if (m.outfits === 0 && !m.next) return null;
            return (
              <p className="mt-3 text-caption text-cocoa-soft">
                Your closet makes <span className="font-bold text-cocoa">{m.outfits} outfit{m.outfits === 1 ? '' : 's'}</span>
                {m.next && <>. One more {m.next.category} would add {m.next.adds}.</>}
              </p>
            );
          })()}
          <Input className="mt-4" label="Search your closet" hideLabel placeholder="Search by name, kind or color…" type="search"
            value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="-mx-gutter mt-3 flex gap-2 overflow-x-auto px-gutter pb-1">
            <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
            {present.map((c) => (
              <Chip key={c} selected={filter === c} onClick={() => setFilter(c)}>{CATEGORY_PLURAL[c]}</Chip>
            ))}
            <Chip selected={filter === 'palette'} onClick={() => setFilter('palette')}>In palette</Chip>
          </div>
          <label className="mt-3 flex items-center justify-end gap-2 text-label text-cocoa-soft">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
              className="h-10 rounded-pill border-2 border-track bg-paper px-3 text-label text-cocoa focus:border-gold focus:outline-none">
              {(Object.keys(SORTS) as Sort[]).map((s) => <option key={s} value={s}>{SORTS[s].label}</option>)}
            </select>
          </label>

          {shown.length === 0 ? (
            <p className="mt-8 text-center text-body text-cocoa-soft">Nothing matches. Try another filter.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-4">
              {shown.map((item) => <ItemCard key={item.id} item={item} src={state.urls.get(item.image_path)} />)}
            </ul>
          )}
          <Link to="/closet/packed" className="mt-6 block text-center text-label font-bold text-gold-deep underline">Packed away</Link>
          {items.length < 15 && (
            <Link to="/closet/start" className="mt-6 block text-center text-label font-bold text-gold-deep underline">
              {15 - items.length} to go for your top 15
            </Link>
          )}
        </>
      )}
      <RoomNav active="closet" />
    </Screen>
  );
}

function ItemCard({ item, src }: { item: ClosetItem; src: string | undefined }) {
  return (
    <li>
      <Link to={`/closet/item/${item.id}`} className="block rounded-lg bg-paper p-3 shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep">
        <ItemPhoto src={src} alt={item.name} className="aspect-square" />
        <p className="mt-2 line-clamp-2 text-label font-bold">{item.name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-pill bg-butter px-2 py-0.5 text-micro font-bold">{CATEGORY_LABEL[item.category]}</span>
          <span className="text-micro text-cocoa-soft">{wornLabel(item.wearCount)}</span>
        </div>
      </Link>
    </li>
  );
}
