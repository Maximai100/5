import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LazyImage from './LazyImage';

type Photo = { url: string; caption?: string };

interface VirtualizedPhotoGridProps {
  photos: Photo[];
  itemSize?: number; // square size px
  gap?: number;
  onItemClick?: (index: number) => void;
  className?: string;
}

// Simple virtualization for large photo grids. Renders only visible rows.
export const VirtualizedPhotoGrid: React.FC<VirtualizedPhotoGridProps> = ({
  photos,
  itemSize = 120,
  gap = 8,
  onItemClick,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const [viewportW, setViewportW] = useState(0);

  const onScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setViewportH(el.clientHeight);
    setViewportW(el.clientWidth);
    const ro = new ResizeObserver(() => {
      setViewportH(el.clientHeight);
      setViewportW(el.clientWidth);
    });
    ro.observe(el);
    el.addEventListener('scroll', onScroll);
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', onScroll);
    };
  }, [onScroll]);

  const columns = Math.max(1, Math.floor((viewportW + gap) / (itemSize + gap)));
  const rowHeight = itemSize + gap;
  const totalRows = Math.ceil(photos.length / columns);
  const totalHeight = totalRows * rowHeight + gap;

  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportH) / rowHeight) + 2);
  const startIndex = startRow * columns;
  const endIndex = Math.min(photos.length, endRow * columns);

  const visible = useMemo(() => photos.slice(startIndex, endIndex), [photos, startIndex, endIndex]);

  return (
    <div
      ref={containerRef}
      className={['virtualized-photo-grid', className].filter(Boolean).join(' ')}
      style={{
        position: 'relative',
        overflow: 'auto',
        height: '100%',
      }}
    >
      <div style={{ position: 'relative', height: totalHeight }}>
        {visible.map((p, i) => {
          const realIndex = startIndex + i;
          const row = Math.floor(realIndex / columns);
          const col = realIndex % columns;
          const top = row * rowHeight + gap;
          const left = col * (itemSize + gap) + gap;
          return (
            <div
              key={realIndex}
              style={{ position: 'absolute', top, left, width: itemSize, height: itemSize, borderRadius: 8, overflow: 'hidden' }}
              onClick={() => onItemClick?.(realIndex)}
            >
              <LazyImage src={p.url} alt={p.caption || 'Фото'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedPhotoGrid;

