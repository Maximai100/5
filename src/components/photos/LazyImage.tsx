import React, { useEffect, useRef, useState } from 'react';
import { getOrCreateThumbnail } from '../../utils/thumbnailCache';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className, ...rest }) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [thumb, setThumb] = useState<string | undefined>(undefined);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    if (imgRef.current && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setInView(true);
              observer?.disconnect();
            }
          });
        },
        { rootMargin: '200px' }
      );
      observer.observe(imgRef.current);
    } else {
      // Fallback: load immediately
      setInView(true);
    }
    return () => observer?.disconnect();
  }, [src]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await getOrCreateThumbnail(src);
        if (!cancelled) setThumb(t);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  const handleLoad = () => setLoaded(true);

  const cls = ['lazy-image', className, !loaded ? 'blur-up' : ''].filter(Boolean).join(' ');

  return (
    <img
      ref={imgRef}
      src={inView ? src : thumb || src}
      alt={alt}
      loading="lazy"
      className={cls}
      onLoad={handleLoad}
      {...rest}
    />
  );
};

export default LazyImage;

