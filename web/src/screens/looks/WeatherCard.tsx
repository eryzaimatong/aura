import { Cloud, CloudLightning, CloudRain, Sun } from 'lucide-react';
import { Card } from '../../components/Card';
import type { WeatherNow } from '../../lib/api';
import type { WeatherState } from './useWeather';

const hour12 = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

function Icon({ w }: { w: WeatherNow }) {
  const cls = 'size-8 shrink-0 text-cocoa-soft';
  if (w.summary === 'thunderstorms') return <CloudLightning aria-hidden="true" className={cls} />;
  if (w.summary === 'rain' || w.summary === 'drizzle' || w.rain_pct >= 60) return <CloudRain aria-hidden="true" className={cls} />;
  if (w.summary === 'clear') return <Sun aria-hidden="true" className={cls} />;
  return <Cloud aria-hidden="true" className={cls} />;
}

export function WeatherCard({ state, usingDefault, onUseLocation, locError }: {
  state: WeatherState;
  usingDefault: boolean;
  onUseLocation: () => void;
  locError: string | null;
}) {
  if (state.status === 'loading') {
    return <Card tone="blue" flat className="h-[84px] animate-pulse" aria-label="Loading weather" />;
  }
  if (state.status === 'unavailable') {
    return (
      <Card tone="blue" flat>
        <p className="text-label font-bold">Weather is unavailable right now</p>
        <p className="text-caption text-cocoa-soft">Today’s outfit ignores the weather for now.</p>
      </Card>
    );
  }
  const w = state.weather;
  return (
    <Card tone="blue" flat className="flex items-center justify-between gap-3">
      <div>
        <p className="text-body font-bold">{w.place ?? 'Your area'} · {Math.round(w.temp_c)}°C, {w.summary}</p>
        <p className="text-caption text-cocoa-soft">
          {w.rain_pct >= 30 && w.rain_from_hour !== null ? `${w.rain_pct}% rain after ${hour12(w.rain_from_hour)} · ` : ''}
          feels like {Math.round(w.feels_c)}°
        </p>
        {usingDefault && (
          <button type="button" onClick={onUseLocation} className="mt-1 text-micro font-bold text-gold-deep underline">
            Use my location
          </button>
        )}
        {locError && <p className="mt-1 text-micro text-cocoa-soft">{locError}</p>}
      </div>
      <Icon w={w} />
    </Card>
  );
}
