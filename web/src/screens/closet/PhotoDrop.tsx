import { useId, type ReactNode } from 'react';
import { Camera } from 'lucide-react';
import { cx } from '../../lib/cx';

export interface PhotoDropProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  title: string;
  subtitle?: string;
  /** Shown instead of the prompt (e.g. the cut-out preview). */
  children?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Dashed gold box: tap to photograph (phone camera) or pick from the gallery. */
export function PhotoDrop({ onFiles, multiple = false, title, subtitle, children, disabled, className }: PhotoDropProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cx(
        'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gold-deep bg-paper p-6 text-center',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-deep',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <input
        id={id}
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
      {children ?? (
        <>
          <span className="flex size-14 items-center justify-center rounded-sm bg-sand text-cocoa">
            <Camera aria-hidden="true" size={26} />
          </span>
          <span className="text-body font-bold">{title}</span>
          {subtitle && <span className="text-caption text-cocoa-soft">{subtitle}</span>}
        </>
      )}
    </label>
  );
}
