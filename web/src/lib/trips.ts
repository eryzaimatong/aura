import { ApiError, type TripOccasion, type TripPlan } from './api';
import { apiErrorMessage } from './apiErrors';
import type { TripRow, TripSaved } from './database.types';

export const TRIP_OCCASIONS: ReadonlyArray<{ value: TripOccasion; label: string }> = [
  { value: 'casual', label: 'Casual days' },
  { value: 'date', label: 'Dinner out' },
  { value: 'work', label: 'Work' },
  { value: 'formal', label: 'Formal event' },
  { value: 'travel', label: 'Outdoors' },
];

export const MAX_TRIP_DAYS = 14;
export const FORECAST_DAYS = 16;

/** Local calendar date as YYYY-MM-DD (not UTC: late-evening plans would land on the wrong day). */
export function localISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localISO(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86_400_000);
}

export function dayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function dateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const a = new Date(`${start}T12:00:00`).toLocaleDateString(undefined, opts);
  return start === end ? a : `${a} – ${new Date(`${end}T12:00:00`).toLocaleDateString(undefined, opts)}`;
}

/** "16–23°C, rain likely" across the trip's forecast days. */
export function weatherSummary(days: TripSaved['days']): string | null {
  if (days.length === 0) return null;
  const lo = Math.round(Math.min(...days.map((d) => d.min_c)));
  const hi = Math.round(Math.max(...days.map((d) => d.max_c)));
  const rain = Math.max(...days.map((d) => d.rain_pct));
  return `${lo}–${hi}°C${rain >= 60 ? ', rain likely' : rain >= 30 ? ', a chance of rain' : ''}`;
}

export function tripErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'place_not_found') return 'Mira couldn’t find that place. Try the city or town name.';
    if (err.code === 'trip_length') return `Trips can be up to ${MAX_TRIP_DAYS} days for now.`;
    if (err.code === 'date_out_of_range') return 'Pick dates from today onward.';
    if (err.code.startsWith('need_items:')) return 'Mira needs a dress, or a top and a bottom, in your closet to plan looks.';
  }
  return apiErrorMessage(err);
}

export function toRow(plan: TripPlan, userId: string): Omit<TripRow, 'id' | 'created_at'> {
  return {
    user_id: userId,
    place: plan.place,
    starts_on: plan.starts_on,
    ends_on: plan.ends_on,
    occasions: plan.occasions,
    item_ids: plan.packed_ids,
    gaps: plan.gaps,
    forecast: { days: plan.forecast, looks: plan.looks, layer_note: plan.layer_note, generator_v: plan.generator_v },
  };
}

/** Packed ticks live on this device only: a checklist, not account data. */
export function loadTicks(tripId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(`aura.trip.${tripId}`) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function saveTicks(tripId: string, ids: Set<string>): void {
  try {
    localStorage.setItem(`aura.trip.${tripId}`, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable: ticks just won't persist */
  }
}
