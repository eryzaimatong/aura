import { useState } from 'react';
import { Check, CloudSun, Luggage } from 'lucide-react';
import { Card } from '../../components/Card';
import type { GeneratedOutfit } from '../../lib/api';
import type { ClosetItem } from '../../lib/closet/data';
import { cx } from '../../lib/cx';
import type { TripSaved } from '../../lib/database.types';
import { dateRange, dayLabel, FORECAST_DAYS, loadTicks, saveTicks, weatherSummary } from '../../lib/trips';
import { ItemPhoto } from '../closet/ItemPhoto';
import { OutfitCollage } from '../looks/OutfitCollage';

export interface TripViewData {
  place: string;
  starts_on: string;
  ends_on: string;
  item_ids: string[];
  gaps: { kind: string; text: string }[];
  plan: TripSaved;
}

/** A trip's weather, packing list and look-by-look plan. `tripId` turns the packing list into a checklist. */
export function TripView({ trip, items, urls, tripId }: {
  trip: TripViewData;
  items: ClosetItem[];
  urls: Map<string, string>;
  tripId?: string;
}) {
  const [ticks, setTicks] = useState<Set<string>>(() => (tripId ? loadTicks(tripId) : new Set()));
  const packed = trip.item_ids.map((id) => items.find((i) => i.id === id)).filter((i): i is ClosetItem => i !== undefined);
  const missing = trip.item_ids.length - packed.length;
  const weather = weatherSummary(trip.plan.days);
  const dayLooks = trip.plan.looks.filter((l) => l.date).length;
  const looks = trip.plan.looks.length;

  function toggle(id: string) {
    if (!tripId) return;
    const next = new Set(ticks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTicks(next);
    saveTicks(tripId, next);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card tone="opal" flat className="flex flex-col gap-1 p-5">
        <p className="font-display text-h2 font-semibold">{trip.place}</p>
        <p className="text-caption text-cocoa">{dateRange(trip.starts_on, trip.ends_on)}</p>
        <p className="mt-2 flex items-center gap-2 text-label text-cocoa">
          <CloudSun size={18} aria-hidden="true" />
          {weather ?? `Too far out for a forecast. Mira can see ${FORECAST_DAYS} days ahead.`}
        </p>
        {weather && trip.plan.days.length < dayLooks && (
          <p className="text-caption text-cocoa-soft">Later days are past the {FORECAST_DAYS}-day forecast, so they’re planned without weather.</p>
        )}
      </Card>

      {(trip.gaps.length > 0 || trip.plan.layer_note) && (
        <Card tone="peach" flat className="flex flex-col gap-2">
          <p className="text-label font-bold">Mira noticed</p>
          {trip.plan.layer_note && <p className="text-caption text-cocoa">{trip.plan.layer_note}</p>}
          {trip.gaps.map((g) => <p key={g.kind} className="text-caption text-cocoa">{g.text}</p>)}
        </Card>
      )}

      <section aria-labelledby="pack-title">
        <h2 id="pack-title" className="flex items-center gap-2 font-display text-h3 font-semibold">
          <Luggage size={20} aria-hidden="true" />
          Pack {packed.length} piece{packed.length === 1 ? '' : 's'} → {looks} look{looks === 1 ? '' : 's'}
        </h2>
        {tripId && packed.length > 0 && (
          <p className="text-caption text-cocoa-soft">{ticks.size >= packed.length ? 'All packed!' : 'Tap a piece once it’s in your bag.'}</p>
        )}
        <ul className="mt-3 grid grid-cols-3 gap-3">
          {packed.map((item) => {
            const done = ticks.has(item.id);
            const tile = (
              <>
                <ItemPhoto src={urls.get(item.image_path)} alt="" className={cx('aspect-square w-full', done && 'opacity-50')} />
                {done && (
                  <span aria-hidden="true" className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-pill bg-gold-deep text-paper">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
                <span className="mt-1 block truncate text-caption text-cocoa">{item.name}</span>
              </>
            );
            return (
              <li key={item.id}>
                {tripId ? (
                  <button type="button" aria-pressed={done} onClick={() => toggle(item.id)}
                    className="relative block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep">
                    {tile}
                  </button>
                ) : <div className="relative">{tile}</div>}
              </li>
            );
          })}
        </ul>
        {missing > 0 && <p className="mt-2 text-caption text-cocoa-soft">{missing} piece{missing === 1 ? ' is' : 's are'} no longer in your closet.</p>}
      </section>

      <section aria-labelledby="looks-title" className="flex flex-col gap-3">
        <h2 id="looks-title" className="font-display text-h3 font-semibold">Look by look</h2>
        {trip.plan.looks.map((look, i) => {
          const day = look.date ? trip.plan.days.find((d) => d.date === look.date) : undefined;
          return (
            <Card key={i} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-label font-bold">{look.date ? dayLabel(look.date) : look.label}</p>
                {day && <p className="text-caption text-cocoa-soft">{Math.round(day.min_c)}–{Math.round(day.max_c)}°C{day.rain_pct >= 60 ? ' · rain likely' : ''}</p>}
              </div>
              <OutfitCollage outfit={{ pieces: look.pieces as GeneratedOutfit['pieces'] }} items={items} urls={urls} />
              <p className="text-caption text-cocoa-soft">{look.reason}</p>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
