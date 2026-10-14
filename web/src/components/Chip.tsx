import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  selected?: boolean;
}

/** A toggleable filter/choice chip. Selected chips fill lilac. */
export function Chip({ selected = false, type = 'button', className, children, ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        'inline-flex h-10 shrink-0 items-center justify-center rounded-pill px-4 text-label font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep',
        'disabled:pointer-events-none disabled:opacity-50',
        selected
          ? 'border-2 border-lilac bg-lilac text-cocoa'
          : 'border-2 border-track bg-paper text-cocoa-soft hover:bg-sand',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
