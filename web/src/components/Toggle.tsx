import { cx } from '../lib/cx';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name (the visible label usually sits beside it). */
  label: string;
  disabled?: boolean;
}

/** Gold switch, as on the Settings mockup. */
export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-8 w-14 shrink-0 rounded-pill transition-colors disabled:opacity-50',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep',
        checked ? 'bg-gold' : 'bg-track',
      )}
    >
      <span
        aria-hidden="true"
        className={cx('absolute top-1 size-6 rounded-pill bg-paper shadow-soft transition-[left]', checked ? 'left-7' : 'left-1')}
      />
    </button>
  );
}
