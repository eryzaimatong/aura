import type { HTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export type CardTone = 'paper' | 'sand' | 'lilac' | 'sage' | 'peach' | 'blue' | 'pink' | 'opal';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  /** 2px gold outline — the only hard border in the visual language. */
  emphasis?: boolean;
  /** Flat cards (tints, callouts) skip the shadow. */
  flat?: boolean;
}

const TONES: Record<CardTone, string> = {
  paper: 'bg-paper',
  sand: 'bg-sand',
  lilac: 'bg-tint-lilac',
  sage: 'bg-tint-sage',
  peach: 'bg-tint-peach',
  blue: 'bg-tint-blue',
  pink: 'bg-tint-pink',
  opal: 'bg-linear-to-br from-opal-pink via-opal-lilac to-opal-blue',
};

export function Card({ tone = 'paper', emphasis = false, flat = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-md p-4',
        TONES[tone],
        emphasis && 'border-2 border-gold',
        !flat && 'shadow-soft',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
