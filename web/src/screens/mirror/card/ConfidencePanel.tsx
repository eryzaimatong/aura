import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '../../../components/Card';
import { cx } from '../../../lib/cx';
import type { AuraCardRow, ScanRow } from '../../../lib/database.types';
import { pct, RATIO_LABELS } from '../../../lib/seasons';

/** Hard rule 10: confidence is always visible; tap to see the numbers behind it. */
export function ConfidencePanel({ card, scan }: { card: AuraCardRow; scan: ScanRow | null }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const colorLine =
    card.season_conf == null
      ? 'Color: not read yet'
      : card.source === 'quiz'
        ? `Colors from your quiz answers · ${pct(card.season_conf)}`
        : `Color confidence ${pct(card.season_conf)}`;

  return (
    <Card>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-body font-bold">Face shape confidence {pct(card.shape_conf)}</span>
          <span className="block text-caption text-cocoa-soft">{colorLine}</span>
          <span className="mt-1 block text-micro text-muted">Tap to see which measurements decided it</span>
        </span>
        <ChevronDown aria-hidden="true" size={20} className={cx('mt-1 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div id={detailsId} className="mt-4 border-t-2 border-sand pt-4">
          {scan ? (
            <dl className="flex flex-col gap-2 text-label">
              {Object.entries(scan.landmark_ratios).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <dt className="text-cocoa-soft">{RATIO_LABELS[key] ?? key}</dt>
                  <dd className="font-bold">{value.toFixed(2)}</dd>
                </div>
              ))}
              <div className="flex justify-between">
                <dt className="text-cocoa-soft">Lighting quality</dt>
                <dd className="font-bold">{pct(scan.lighting_score)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-caption text-cocoa-soft">The measurements for this card were deleted.</p>
          )}
          <p className="mt-3 text-micro text-muted">
            Read on your phone from landmark proportions and cheek color. This is Mira’s first, rule-based reading — a trained model is on the way.
          </p>
        </div>
      )}
    </Card>
  );
}
