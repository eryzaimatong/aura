import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '../../../components/Card';
import { cx } from '../../../lib/cx';
import type { AuraCardRow, ScanRow } from '../../../lib/database.types';
import { pct, RATIO_LABELS } from '../../../lib/seasons';
import type { UserSet } from '../useCurrentCard';

/** Hard rule 10: confidence is always visible; tap to see the numbers behind it. */
export function ConfidencePanel({ card, scan, userSet }: { card: AuraCardRow; scan: ScanRow | null; userSet: UserSet }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  // A field the user corrected shows as theirs — the stored model confidence no longer describes it.
  const shapeLine = userSet.faceShape ? 'Face shape: set by you' : `Face shape confidence ${pct(card.shape_conf)}`;
  const colorLine = userSet.colors
    ? 'Colors: set by you'
    : card.season_conf == null
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
        className="flex w-full items-start justify-between gap-3 rounded-sm text-left focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-deep"
      >
        <span>
          <span className="block text-body font-bold">{shapeLine}</span>
          <span className="block text-caption text-cocoa-soft">{colorLine}</span>
          <span className="mt-1 block text-micro text-muted">Tap to see which measurements decided it</span>
        </span>
        <ChevronDown aria-hidden="true" size={20} className={cx('mt-1 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div id={detailsId} className="mt-4 border-t-2 border-sand pt-4">
          {scan ? (
            <dl className="flex flex-col gap-2 text-label">
              {/* Fixed order: Postgres jsonb doesn't keep key order. */}
              {Object.entries(RATIO_LABELS).map(([key, label]) => {
                const value = scan.landmark_ratios[key];
                return value == null ? null : (
                  <div key={key} className="flex justify-between">
                    <dt className="text-cocoa-soft">{label}</dt>
                    <dd className="font-bold">{value.toFixed(2)}</dd>
                  </div>
                );
              })}
              <div className="flex justify-between">
                <dt className="text-cocoa-soft">Lighting quality</dt>
                <dd className="font-bold">{pct(scan.lighting_score)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-caption text-cocoa-soft">The measurements for this card were deleted.</p>
          )}
          <p className="mt-3 text-micro text-muted">
            Read on your phone from landmark proportions and cheek color.{' '}
            {scan?.model_version.startsWith('fs-rules') !== false
              ? 'This is Mira’s first, rule-based reading.'
              : `Face shape from Mira’s trained model (${scan.model_version.split('+')[0]}); colors are still rule-based.`}
          </p>
        </div>
      )}
    </Card>
  );
}
