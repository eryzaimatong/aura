import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { localToday } from '../../lib/closet/data';
import { cx } from '../../lib/cx';
import { supabase } from '../../lib/supabase';
import { FormAlert } from '../onboarding/FormAlert';
import { ItemPhoto } from '../closet/ItemPhoto';
import { useCloset } from '../closet/useCloset';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/** How far back a forgotten wear can be added. */
const BACKFILL_DAYS = 60;

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Weeks of the month (Sunday first); null pads the first and last week. */
function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => iso(year, month, i + 1))];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

function daysAgo(date: string, today: string): number {
  return Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${date}T12:00:00`).getTime()) / 86_400_000);
}

/** The wear log as a calendar: what you wore each day, with fixes for missed or mistaken logs. */
export function HistoryScreen() {
  const profile = useProfile();
  const { state, reload } = useCloset();
  const today = localToday();
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<string>(today);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    if (state.status === 'ready') for (const w of state.log) m.set(w.worn_on, [...(m.get(w.worn_on) ?? []), w.item_id]);
    return m;
  }, [state]);

  if (state.status !== 'ready') {
    return (
      <Screen>
        <ScreenHeader title="Wear history" backTo="/diary" />
        {state.status === 'loading'
          ? <p role="status" className="mt-8 text-center font-mira text-h3 text-cocoa-soft">turning the pages…</p>
          : <FormAlert message={state.message} />}
      </Screen>
    );
  }

  const items = new Map(state.items.map((i) => [i.id, i]));
  const wornIds = byDay.get(selected) ?? [];
  const canEdit = selected <= today && daysAgo(selected, today) <= BACKFILL_DAYS;
  const atCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth();
  const label = new Date(view.year, view.month, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const monthWears = [...byDay.entries()].filter(([d]) => d.startsWith(iso(view.year, view.month, 1).slice(0, 8)));

  function shift(delta: number) {
    setAdding(false);
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  async function run(op: () => PromiseLike<{ error: { message: string; code?: string } | null }>) {
    setBusy(true);
    setError(null);
    const { error: err } = await op();
    setBusy(false);
    if (err && err.code !== '23505') return setError(authErrorMessage(err));
    reload();
  }

  const remove = (itemId: string) =>
    run(() => supabase.from('wear_log').delete().eq('user_id', profile.id).eq('item_id', itemId).eq('worn_on', selected));
  const add = (itemId: string) =>
    run(() => supabase.from('wear_log').insert({ user_id: profile.id, item_id: itemId, worn_on: selected }));

  return (
    <Screen>
      <ScreenHeader title="Wear history" backTo="/diary" />

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)}
            className="flex size-10 items-center justify-center rounded-pill bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep">
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <p className="font-display text-h3 font-semibold" aria-live="polite">{label}</p>
          <button type="button" aria-label="Next month" disabled={atCurrentMonth} onClick={() => shift(1)}
            className="flex size-10 items-center justify-center rounded-pill bg-sand disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep">
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
        <table className="w-full table-fixed text-center">
          <thead>
            <tr>{WEEKDAYS.map((d, i) => <th key={i} scope="col" className="pb-1 text-micro font-bold text-cocoa-soft">{d}</th>)}</tr>
          </thead>
          <tbody>
            {monthGrid(view.year, view.month).map((week, w) => (
              <tr key={w}>
                {week.map((date, i) => {
                  if (!date) return <td key={i} />;
                  const count = byDay.get(date)?.length ?? 0;
                  const future = date > today;
                  return (
                    <td key={date} className="p-0.5">
                      <button type="button" disabled={future} aria-pressed={selected === date}
                        aria-label={`${new Date(`${date}T12:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })}: ${count} piece${count === 1 ? '' : 's'}`}
                        onClick={() => { setSelected(date); setAdding(false); }}
                        className={cx('flex h-11 w-full flex-col items-center justify-center rounded-sm text-label disabled:opacity-30',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep',
                          selected === date ? 'bg-gold font-bold' : count > 0 ? 'bg-tint-lilac' : '',
                          date === today && selected !== date && 'ring-2 ring-gold')}>
                        {Number(date.slice(8))}
                        <span aria-hidden="true" className={cx('mt-0.5 size-1.5 rounded-pill', count > 0 ? 'bg-lilac' : 'bg-transparent')} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-caption text-cocoa-soft">{monthWears.length} day{monthWears.length === 1 ? '' : 's'} logged this month</p>
      </Card>

      <section className="mt-4" aria-labelledby="day-title">
        <h2 id="day-title" className="font-display text-h3 font-semibold">
          {selected === today ? 'Today' : new Date(`${selected}T12:00:00`).toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}
        </h2>
        {error && <div className="mt-2"><FormAlert message={error} /></div>}
        {wornIds.length === 0 && !adding && <p className="mt-2 text-body text-cocoa-soft">Nothing logged for this day.</p>}
        <ul className="mt-3 grid grid-cols-3 gap-3">
          {wornIds.map((id) => {
            const item = items.get(id);
            if (!item) return null;
            return (
              <li key={id} className="relative">
                <Link to={`/closet/item/${id}`} className="block">
                  <ItemPhoto src={state.urls.get(item.image_path)} alt="" className="aspect-square w-full" />
                  <span className="mt-1 block truncate text-caption">{item.name}</span>
                </Link>
                {canEdit && (
                  <button type="button" aria-label={`Remove ${item.name} from this day`} disabled={busy} onClick={() => void remove(id)}
                    className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-pill bg-paper shadow-soft focus-visible:outline-2 focus-visible:outline-gold-deep">
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {canEdit && !adding && (
          <Button variant="outline" size="sm" className="mt-4" icon={<Plus size={16} />} onClick={() => setAdding(true)}>
            {wornIds.length ? 'Add another piece' : 'Add what I wore'}
          </Button>
        )}
        {adding && (
          <Card tone="sand" flat className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-label font-bold">Tap what you wore</p>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Done</Button>
            </div>
            <ul className="mt-3 grid grid-cols-4 gap-2">
              {state.items.map((item) => {
                const on = wornIds.includes(item.id);
                return (
                  <li key={item.id}>
                    <button type="button" aria-pressed={on} aria-label={item.name} disabled={busy}
                      onClick={() => void (on ? remove(item.id) : add(item.id))}
                      className="relative block w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep">
                      <ItemPhoto src={state.urls.get(item.image_path)} alt="" className={cx('aspect-square w-full', on && 'ring-2 ring-gold-deep')} />
                      {on && (
                        <span aria-hidden="true" className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-pill bg-gold-deep text-paper">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        {!canEdit && selected <= today && (
          <p className="mt-3 text-caption text-cocoa-soft">Days more than {BACKFILL_DAYS} days back can’t be changed.</p>
        )}
      </section>
    </Screen>
  );
}
