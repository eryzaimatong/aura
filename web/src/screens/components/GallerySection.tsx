import type { ReactNode } from 'react';

export function GallerySection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-h3">{title}</h2>
        {note && <p className="text-caption text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export function StateLabel({ children }: { children: ReactNode }) {
  return <p className="text-micro font-bold uppercase tracking-wide text-muted">{children}</p>;
}
