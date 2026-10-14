import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export interface ScreenProps {
  children: ReactNode;
  /** Pinned to the bottom of the screen — primary and secondary actions. */
  footer?: ReactNode;
  /** Vertically centre the content (welcome, splash, error screens). */
  centered?: boolean;
  className?: string;
}

/** Mobile screen column: 390 max width, 24px gutters, actions pinned to the bottom. */
export function Screen({ children, footer, centered = false, className }: ScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col px-gutter pt-12 pb-8">
      <div className={cx('flex flex-1 flex-col', centered && 'items-center justify-center text-center', className)}>
        {children}
      </div>
      {footer && <div className="mt-8 flex flex-col gap-3">{footer}</div>}
    </main>
  );
}
