import { useState } from 'react';
import { Ghost } from 'lucide-react';
import { cx } from '../lib/cx';

export const MIRA_EXPRESSIONS = [
  'hello', 'found-it', 'wink', 'closet-pick', 'streak', 'sleepy',
  'worried', 'love', 'thinking', 'surprised', 'shy',
] as const;

export type MiraExpression = (typeof MIRA_EXPRESSIONS)[number];
export type MiraSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<MiraSize, string> = {
  sm: 'size-12',
  md: 'size-24',
  lg: 'size-40',
  xl: 'size-56',
};

export interface MiraProps {
  expression: MiraExpression;
  size?: MiraSize;
  /** Set when Mira carries meaning on her own; otherwise she's decorative and hidden from screen readers. */
  label?: string;
  className?: string;
}

/** Mira, the mirror ghost. Artwork lives at /public/mira/<expression>.png. */
export function Mira({ expression, size = 'md', label, className }: MiraProps) {
  const src = `${import.meta.env.BASE_URL}mira/${expression}.png`;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };

  if (failedSrc === src) {
    // Artwork not dropped in yet — keep the layout stable instead of a broken image.
    return (
      <div
        {...a11y}
        className={cx('flex flex-col items-center justify-center gap-1 rounded-md bg-tint-lilac text-lilac', SIZES[size], className)}
      >
        <Ghost aria-hidden="true" className="size-1/3" />
        {size !== 'sm' && <span className="text-micro text-muted">{expression}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
      onError={() => setFailedSrc(src)}
      className={cx('object-contain select-none', SIZES[size], className)}
    />
  );
}
