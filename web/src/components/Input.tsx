import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Helper text under the field. Hidden while an error is shown. */
  hint?: string;
  /** Puts the field in its error state and announces the message. */
  error?: string;
  /** Keep the label for screen readers but don't show it (e.g. search fields). */
  hideLabel?: boolean;
}

/** Text field with three states: default, focus (gold ring) and error. */
export function Input({ label, hint, error, hideLabel = false, className, disabled, ...rest }: InputProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <label htmlFor={id} className={cx('text-label text-cocoa-soft', hideLabel && 'sr-only')}>
        {label}
      </label>
      <input
        id={id}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={cx(
          'h-[52px] w-full rounded-md border-2 bg-paper px-5 text-body text-cocoa transition-colors',
          'placeholder:text-muted focus:outline-none',
          'disabled:cursor-not-allowed disabled:bg-sand disabled:text-muted',
          error ? 'border-danger focus:border-danger' : 'border-track focus:border-gold',
        )}
        {...rest}
      />
      {note && (
        <p id={noteId} role={error ? 'alert' : undefined} className={cx('text-caption', error ? 'text-danger' : 'text-muted')}>
          {note}
        </p>
      )}
    </div>
  );
}
