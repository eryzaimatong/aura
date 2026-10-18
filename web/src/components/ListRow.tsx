import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cx } from '../lib/cx';

export interface ListRowProps {
  label: string;
  /** Right-hand value text, e.g. "Soft Summer" or "Change". */
  value?: ReactNode;
  hint?: string;
  onClick?: () => void;
  /** Not built yet: shown greyed with "Soon" instead of a dead link. */
  soon?: boolean;
  /** Replaces the value (e.g. a Toggle). */
  control?: ReactNode;
}

/** White settings/profile row: label left, value or control right. */
export function ListRow({ label, value, hint, onClick, soon = false, control }: ListRowProps) {
  const body = (
    <>
      <span className="flex min-w-0 flex-col text-left">
        <span className="text-body text-cocoa">{label}</span>
        {hint && <span className="text-micro text-cocoa-soft">{hint}</span>}
      </span>
      {control ?? (
        <span className="flex shrink-0 items-center gap-1 text-label text-cocoa-soft">
          {soon ? <span className="rounded-pill bg-sand px-2 py-0.5 text-micro font-bold">Soon</span> : value}
          {onClick && !soon && <ChevronRight aria-hidden="true" size={16} />}
        </span>
      )}
    </>
  );
  const cls = cx('flex w-full items-center justify-between gap-3 rounded-md bg-paper px-4 py-4 shadow-soft', soon && 'opacity-60');

  if (onClick && !soon) {
    return (
      <button type="button" onClick={onClick}
        className={cx(cls, 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep')}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

export function ListSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-label font-bold">{title}</h2>
      {children}
    </section>
  );
}
