import { useNavigate } from 'react-router';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Mira } from '../../../components/Mira';
import { Screen } from '../../../components/Screen';
import type { LightingIssue } from '../../../lib/face/color';
import { pct } from '../../../lib/seasons';

const WHY: Record<LightingIssue, string> = {
  warm_cast: 'the light is too warm to read your undertone reliably',
  cool_cast: 'the light is too blue to read your undertone reliably',
  dim: 'the light is too dim to read your colors reliably',
  harsh: 'the light is so bright that parts of your face are washed out',
  uneven: 'one side of your face is in shadow, so the colors read unevenly',
};

export interface LowLightViewProps {
  colorConf: number;
  shapeConf: number;
  issue: LightingIssue | null;
  onRetake: () => void;
}

/** Hard rule 10: low colour confidence is shown, and "continue" goes to the quiz — never a guess. */
export function LowLightView({ colorConf, shapeConf, issue, onRetake }: LowLightViewProps) {
  const navigate = useNavigate();
  return (
    <Screen
      footer={
        <>
          <Button fullWidth onClick={onRetake}>
            Retake in better light
          </Button>
          <Button variant="outline" fullWidth onClick={() => navigate('/mirror/quiz', { replace: true })}>
            Continue anyway
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center pt-8 text-center">
        <Mira expression="worried" size="lg" />
        <h1 className="mt-6 font-display text-h2 font-semibold">Your colors may be off</h1>
        <p className="mt-2 text-body text-cocoa-soft">
          I found your face, but {issue ? WHY[issue] : 'the colors were hard to read'}.
        </p>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between text-label">
          <span>Color confidence</span>
          <span className="font-bold text-danger">{pct(colorConf)}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-track" aria-hidden="true">
          <div className="h-full rounded-pill bg-coral" style={{ width: `${Math.round(colorConf * 100)}%` }} />
        </div>
        <p className="mt-2 text-caption text-cocoa-soft">
          Face shape was read at {pct(shapeConf)}. You can keep that and finish your colors with three quick questions.
        </p>
      </Card>

      <Card tone="sand" flat className="mt-4">
        <p className="font-mira text-h3 text-cocoa-soft">Daylight near a window gives the most accurate reading ✦</p>
      </Card>
    </Screen>
  );
}
