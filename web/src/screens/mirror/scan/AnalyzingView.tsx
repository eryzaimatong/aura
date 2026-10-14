import { Card } from '../../../components/Card';
import { Mira } from '../../../components/Mira';
import { Screen } from '../../../components/Screen';
import { cx } from '../../../lib/cx';

const STEPS = ['Face landmarks', 'Face shape', 'Skin tone and undertone', 'Color season'] as const;
const LINES = ['finding you…', 'measuring gently…', 'reading your colors…', 'almost there'] as const;

export type ScanStep = 0 | 1 | 2 | 3;

export function AnalyzingView({ step }: { step: ScanStep }) {
  const progress = ((step + 0.5) / STEPS.length) * 100;
  return (
    <Screen>
      <div className="flex flex-col items-center pt-8 text-center">
        <Mira expression="thinking" size="lg" />
        <h1 className="mt-6 font-display text-h2 font-semibold">Reading your features…</h1>
      </div>

      <div
        role="progressbar"
        aria-label="Analysis progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="mt-6 h-3 w-full overflow-hidden rounded-pill bg-track"
      >
        <div className="h-full rounded-pill bg-gold transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>

      <Card className="mt-6">
        <ol className="flex flex-col gap-3">
          {STEPS.map((label, i) => {
            const status = i < step ? 'done' : i === step ? 'now' : 'next';
            return (
              <li key={label} className="flex items-center gap-3" aria-current={status === 'now' ? 'step' : undefined}>
                <span aria-hidden="true" className={cx('size-5 shrink-0 rounded-pill', status === 'next' ? 'bg-sand' : 'bg-gold')} />
                <span className={cx('flex-1 text-body', status === 'next' ? 'text-cocoa-soft' : 'text-cocoa')}>{label}</span>
                <span className="text-body text-cocoa-soft">
                  {status === 'done' && <span aria-label="done">✓</span>}
                  {status === 'now' && <span aria-label="in progress">…</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      <p className="mt-6 text-center font-mira text-h3 text-cocoa-soft" aria-live="polite">
        {LINES[step]} ✦
      </p>
    </Screen>
  );
}
