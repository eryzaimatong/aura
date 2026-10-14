import { Card } from '../../components/Card';
import { cx } from '../../lib/cx';
import type { ColourShare } from '../../lib/diary';

/** Single series → no legend; the busiest week is highlighted and is the only direct label. */
export function WeekBars({ weeks }: { weeks: number[] }) {
  const max = Math.max(1, ...weeks);
  const peak = weeks.indexOf(Math.max(...weeks));
  const total = weeks.reduce((a, b) => a + b, 0);
  return (
    <Card>
      <h2 className="text-label font-bold">Wears per week</h2>
      {total === 0 ? (
        <p className="mt-2 text-caption text-cocoa-soft">No wears logged this month yet.</p>
      ) : (
        <>
          <div className="mt-4 flex h-32 items-end justify-between gap-3" aria-hidden="true">
            {weeks.map((n, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`Week ${i + 1}: ${n} wears`}>
                {i === peak && <span className="text-micro font-bold text-cocoa">{n}</span>}
                <div
                  className={cx('w-full max-w-10 rounded-t-[6px]', i === peak ? 'bg-gold' : 'bg-track')}
                  // Data-driven height; a sliver keeps empty weeks visible on the baseline.
                  style={{ height: `${Math.max(4, (n / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between gap-3 border-t-2 border-sand pt-1" aria-hidden="true">
            {weeks.map((_, i) => <span key={i} className="flex-1 text-center text-micro text-cocoa-soft">W{i + 1}</span>)}
          </div>
          <table className="sr-only">
            <caption>Wears per week this month</caption>
            <tbody>{weeks.map((n, i) => <tr key={i}><th scope="row">Week {i + 1}</th><td>{n}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </Card>
  );
}

/** Bars filled with each colour itself (data, not a palette); labels stay in text ink. */
export function ColourBars({ colours }: { colours: ColourShare[] }) {
  const max = Math.max(1, ...colours.map((c) => c.wears));
  return (
    <Card>
      <h2 className="text-label font-bold">Most worn colors</h2>
      {colours.length === 0 ? (
        <p className="mt-2 text-caption text-cocoa-soft">Colors show up here once you log a few wears.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {colours.map((c) => (
            <li key={c.name} className="flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-pill bg-track" role="img" aria-label={`${c.name}: ${c.wears} wears`}>
                <div className="h-full rounded-pill border border-paper" style={{ width: `${(c.wears / max) * 100}%`, backgroundColor: c.hex }} />
              </div>
              <span className="w-24 text-right text-caption text-cocoa">{c.name} · {c.wears}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
