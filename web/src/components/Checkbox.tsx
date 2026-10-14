import { useId, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cx } from '../lib/cx';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Agreement row: sand card, gold-deep box, label text beside it. */
export function Checkbox({ checked, onChange, children, disabled = false, className }: CheckboxProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cx(
        'flex cursor-pointer items-start gap-3 rounded-md bg-sand p-4',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-deep',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className={cx(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[6px] border-2 border-gold-deep transition-colors',
          checked ? 'bg-gold-deep text-paper' : 'bg-paper',
        )}
      >
        {checked && <Check size={16} strokeWidth={3} />}
      </span>
      <span className="text-body text-cocoa">{children}</span>
    </label>
  );
}
