import { useState } from 'react';
import { Shirt } from 'lucide-react';
import { cx } from '../../lib/cx';

/** A garment cut-out on a soft tint; a calm placeholder if the photo can't load. */
export function ItemPhoto({ src, alt, className }: { src: string | undefined; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cx('flex items-center justify-center overflow-hidden rounded-md bg-tint-lilac', className)}>
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="size-full object-contain p-2" />
      ) : (
        <Shirt aria-hidden="true" className="size-1/3 text-lilac" />
      )}
    </div>
  );
}
