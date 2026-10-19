import { Heart, Scissors, Sparkles } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { cx } from '../../lib/cx';
import type { VanityRec } from '../../lib/vanity';

function Thumb({ rec }: { rec: VanityRec }) {
  if (rec.swatches.length > 0) {
    return (
      <div className="flex size-20 shrink-0 flex-wrap content-center items-center justify-center gap-1 rounded-sm bg-tint-lilac p-2" aria-hidden="true">
        {rec.swatches.slice(0, 5).map((hex) => (
          // Shade swatches are data, not design tokens.
          <span key={hex} style={{ backgroundColor: hex }}
            className={cx('rounded-pill border-2 border-paper shadow-soft', rec.swatches.length === 1 ? 'size-12' : 'size-6')} />
        ))}
      </div>
    );
  }
  const Icon = rec.icon === 'hair' ? Scissors : Sparkles;
  return (
    <div className="flex size-20 shrink-0 items-center justify-center rounded-sm bg-tint-lilac text-lilac" aria-hidden="true">
      <Icon size={28} />
    </div>
  );
}

/** One pick: thumbnail, title, "Why:" line (hard rule 7), Save / Not for me. */
export function RecCard({ rec, onSave, onDismiss, busy }: {
  rec: VanityRec;
  onSave: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  return (
    <Card className="flex gap-3">
      <Thumb rec={rec} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <p className="text-label font-bold">{rec.title}</p>
          <p className="text-caption text-cocoa-soft">Why: {rec.reason}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={onSave}
            icon={<Heart size={14} className={rec.saved ? 'fill-blush text-blush' : ''} />} aria-pressed={rec.saved}>
            {rec.saved ? 'Saved' : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onDismiss}>Not for me</Button>
        </div>
      </div>
    </Card>
  );
}
