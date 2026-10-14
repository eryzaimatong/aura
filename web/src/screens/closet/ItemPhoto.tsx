import { useState } from 'react';
import { Shirt } from 'lucide-react';
import { cx } from '../../lib/cx';

export interface ItemPhotoProps {
  src: string | undefined;
  alt: string;
  /** Background tint token class. */
  tint?: string;
  className?: string;
}

/** A garment cut-out on a soft tint; a calm placeholder if the photo can't load. */
export function ItemPhoto({ src, alt, tint = 'bg-tint-lilac', className }: ItemPhotoProps) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cx('flex items-center justify-center overflow-hidden rounded-md', tint, className)}>
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="size-full object-contain p-2" />
      ) : (
        <Shirt aria-hidden="true" className="size-1/3 text-lilac" />
      )}
    </div>
  );
}
