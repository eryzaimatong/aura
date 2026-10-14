import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Rendered before the label, e.g. a lucide icon. */
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-gold text-cocoa hover:bg-gold-deep hover:text-paper',
  ghost: 'bg-sand text-cocoa-soft hover:bg-track',
  outline: 'border-2 border-gold-deep bg-transparent text-cocoa hover:bg-sand',
  danger: 'border-2 border-danger bg-transparent text-danger hover:bg-tint-pink',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'h-12 px-6 text-body',
  sm: 'h-10 px-4 text-label',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-pill font-body font-bold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon && <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
