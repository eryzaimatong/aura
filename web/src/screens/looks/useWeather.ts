import { useCallback, useEffect, useState } from 'react';
import { getWeather, type WeatherNow } from '../../lib/api';
import { requestCoords, savedCoords, type Coords } from '../../lib/location';

export type WeatherState = { status: 'loading' } | { status: 'ready'; weather: WeatherNow } | { status: 'unavailable' };

/** Today's weather for the saved coarse location, or Metro Manila. */
export function useWeather() {
  const [coords, setCoords] = useState<Coords | null>(() => savedCoords());
  const [state, setState] = useState<WeatherState>({ status: 'loading' });
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getWeather(coords)
      .then((weather) => !cancelled && setState({ status: 'ready', weather }))
      // Weather is a nice-to-have: outfits still generate without it.
      .catch(() => !cancelled && setState({ status: 'unavailable' }));
    return () => {
      cancelled = true;
    };
  }, [coords]);

  const useMyLocation = useCallback(() => {
    setLocError(null);
    requestCoords().then(setCoords).catch((err: Error) => setLocError(err.message));
  }, []);

  return { state, usingDefault: coords === null, useMyLocation, locError };
}
