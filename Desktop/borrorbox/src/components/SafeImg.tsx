import React, { useState } from 'react';
import { Package } from 'lucide-react';

interface SafeImgProps {
  src?: string | null;
  alt: string;
  /** Classes for the rendered <img> (and shared sizing for the fallback). */
  className?: string;
  /** Optional extra classes for the fallback container. */
  fallbackClassName?: string;
}

/**
 * Image that degrades to a neutral placeholder when the source is missing
 * or fails to load — keeps the BorrowBox layout intact with no broken icons.
 */
export const SafeImg: React.FC<SafeImgProps> = ({
  src,
  alt,
  className = '',
  fallbackClassName = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`bg-stone-100 text-stone-400 flex items-center justify-center shrink-0 ${className} ${fallbackClassName}`}
        aria-label={alt}
      >
        <Package className="w-4 h-4" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
