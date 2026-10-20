import { useState } from 'react';
import { Button } from '../../components/Button';
import { Mira, type MiraExpression } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { cx } from '../../lib/cx';

const STEPS: ReadonlyArray<{ mira: MiraExpression; room: string; title: string; body: string }> = [
  { mira: 'hello', room: 'Mirror', title: 'One selfie, read on your phone',
    body: 'Mira reads your face shape and colors right on your phone. The photo never leaves it, and only a few numbers are saved.' },
  { mira: 'closet-pick', room: 'Closet', title: 'Your own clothes, tagged for you',
    body: 'Snap the pieces you reach for most. Mira cuts them out and notes the type, colors and whether they’re in your palette.' },
  { mira: 'found-it', room: 'Looks', title: 'Outfits with a reason',
    body: 'Every look comes from your closet with a “why”: the weather, the occasion, your palette. Plan a week or a whole trip.' },
  { mira: 'streak', room: 'Diary', title: 'See what you really wear',
    body: 'Log what you wore and Mira shows your streaks, your most-worn colors and pieces ready for an outing.' },
];

const key = (userId: string) => `aura.tour_done.${userId}`;

export function tourSeen(userId: string): boolean {
  try {
    return localStorage.getItem(key(userId)) === '1';
  } catch {
    return true; // no storage: don't show it on every launch
  }
}

function markSeen(userId: string) {
  try {
    localStorage.setItem(key(userId), '1');
  } catch {
    /* fine */
  }
}

/** Four quick cards on first launch. Skippable, shown once per account on this device. */
export function Tour({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;
  const finish = () => {
    markSeen(userId);
    onDone();
  };

  return (
    <Screen centered footer={
      <>
        <Button fullWidth onClick={() => (last ? finish() : setI(i + 1))}>{last ? 'Let’s go' : 'Next'}</Button>
        {!last && <Button variant="ghost" fullWidth onClick={finish}>Skip the tour</Button>}
      </>
    }>
      <p className="text-micro font-bold uppercase tracking-wide text-cocoa-soft">{step.room}</p>
      <Mira expression={step.mira} size="xl" className="mt-4" />
      <h1 className="mt-6 font-display text-h2 font-semibold" aria-live="polite">{step.title}</h1>
      <p className="mt-2 text-body text-cocoa-soft">{step.body}</p>
      <div className="mt-6 flex gap-2" aria-label={`Step ${i + 1} of ${STEPS.length}`} role="img">
        {STEPS.map((_, n) => (
          <span key={n} className={cx('h-2 rounded-pill transition-all', n === i ? 'w-6 bg-gold' : 'w-2 bg-track')} />
        ))}
      </div>
    </Screen>
  );
}
