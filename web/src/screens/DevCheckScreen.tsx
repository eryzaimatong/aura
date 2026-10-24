import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getHealth } from '../lib/api';
import { supabase } from '../lib/supabase';

type Check = { state: 'pending' } | { state: 'ok'; detail: string } | { state: 'fail'; detail: string };

const SWATCHES = [
  'bg-cream', 'bg-paper', 'bg-sand', 'bg-track', 'bg-gold', 'bg-gold-deep', 'bg-butter',
  'bg-lilac', 'bg-blush', 'bg-coral', 'bg-sage', 'bg-danger', 'bg-success',
  'bg-opal-pink', 'bg-opal-lilac', 'bg-opal-blue',
  'bg-tint-lilac', 'bg-tint-sage', 'bg-tint-peach', 'bg-tint-blue', 'bg-tint-pink',
] as const;

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function StatusRow({ label, check }: { label: string; check: Check }) {
  const tone = check.state === 'ok' ? 'text-success' : check.state === 'fail' ? 'text-danger' : 'text-muted';
  const text = check.state === 'pending' ? 'checking…' : check.detail;
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-label font-bold">{label}</span>
      <span className={`text-caption ${tone}`}>{text}</span>
    </div>
  );
}

export function DevCheckScreen() {
  const [api, setApi] = useState<Check>({ state: 'pending' });
  const [db, setDb] = useState<Check>({ state: 'pending' });

  useEffect(() => {
    getHealth()
      .then((h) => setApi({ state: 'ok', detail: `${h.status} · v${h.version}` }))
      .catch((err: unknown) => setApi({ state: 'fail', detail: errorText(err) }));

    // products is the one table anon can read, so it proves URL + key + grants.
    // A GET (not HEAD) so failures carry Postgres's message instead of an empty string.
    supabase
      .from('products')
      .select('id')
      .limit(1)
      .then(({ error, status }) =>
        setDb(
          error
            ? { state: 'fail', detail: error.message || `HTTP ${status}` }
            : { state: 'ok', detail: 'reachable · products readable' },
        ),
      );
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-[390px] px-gutter py-10">
      <h1 className="font-display text-display font-semibold">AURA</h1>
      <p className="font-mira text-h3 text-cocoa-soft">what suits you, gently</p>

      <section className="mt-8 rounded-lg bg-paper p-6 shadow-card">
        <h2 className="font-display text-h3">Skeleton check</h2>
        <StatusRow label="API /health" check={api} />
        <StatusRow label="Supabase" check={db} />
      </section>

      <section className="mt-6 rounded-md border-2 border-gold bg-paper p-6 shadow-soft">
        <h2 className="font-display text-h3">Tokens</h2>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {SWATCHES.map((cls) => (
            <div key={cls} title={cls} className={`aspect-square rounded-sm shadow-soft ${cls}`} />
          ))}
        </div>
        <p className="mt-4 text-caption text-muted">Fredoka · Nunito · Caveat, all bundled locally.</p>
      </section>

      {import.meta.env.DEV && (
        <Link to="/components" className="mt-6 block text-center text-label font-bold text-cocoa underline">
          Open the component gallery
        </Link>
      )}
    </main>
  );
}
