import React, { useRef, useEffect, useState } from 'react';
import { PhotoViewerModalProps } from '../../types';
import { IconClose, IconTrash, IconChevronLeft, IconChevronRight } from '../common/Icon';
import VirtualizedPhotoGrid from '../photos/VirtualizedPhotoGrid';

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ photo, onClose, onDelete }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [scale, setScale] = useState(1);
    const [startDist, setStartDist] = useState<number | null>(null);
    const [startScale, setStartScale] = useState(1);
    const [startX, setStartX] = useState<number | null>(null);
    const [deltaX, setDeltaX] = useState(0);
    const [showContext, setShowContext] = useState(false);
    const longPressTimer = useRef<number | null>(null);

    useEffect(() => {
        if (modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            if (firstElement) {
                firstElement.focus();
            }
        }
    }, []);

    const currentPhoto = photo.photos[currentPhotoIndex];

    const handlePrevious = () => {
        setCurrentPhotoIndex(prev => prev > 0 ? prev - 1 : photo.photos.length - 1);
    };

    const handleNext = () => {
        setCurrentPhotoIndex(prev => prev < photo.photos.length - 1 ? prev + 1 : 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            handlePrevious();
        } else if (e.key === 'ArrowRight') {
            handleNext();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    // Preload neighbors
    useEffect(() => {
        const preload = (src: string) => { const i = new Image(); i.src = src; };
        const next = photo.photos[(currentPhotoIndex + 1) % photo.photos.length]?.url;
        const prev = photo.photos[(currentPhotoIndex - 1 + photo.photos.length) % photo.photos.length]?.url;
        next && preload(next);
        prev && preload(prev);
    }, [currentPhotoIndex, photo.photos]);

    // Touch gestures: swipe and pinch
    const onTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            setStartX(e.touches[0].clientX);
            setDeltaX(0);
            // long press
            if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
            longPressTimer.current = window.setTimeout(() => setShowContext(true), 600);
        } else if (e.touches.length === 2) {
            const [a, b] = e.touches;
            const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
            setStartDist(dist);
            setStartScale(scale);
        }
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && startX !== null) {
            setDeltaX(e.touches[0].clientX - startX);
        } else if (e.touches.length === 2 && startDist) {
            const [a, b] = e.touches;
            const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
            const factor = dist / startDist;
            setScale(Math.min(4, Math.max(1, startScale * factor)));
        }
    };

    const onTouchEnd = () => {
        if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
        if (Math.abs(deltaX) > 50 && scale === 1) {
            deltaX > 0 ? handlePrevious() : handleNext();
        }
        setStartX(null);
        setStartDist(null);
        setDeltaX(0);
    };

    return (
        <div className="modal-overlay photo-viewer-overlay" onClick={onClose}>
            <div className="photo-viewer-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef} onKeyDown={handleKeyDown}>
                <div className="photo-viewer-header">
                    <h3>{photo.title}</h3>
                    <span className="photo-counter">
                        {currentPhotoIndex + 1} из {photo.photos.length}
                    </span>
                </div>
                
                <div className="photo-viewer-main"
                     onTouchStart={onTouchStart}
                     onTouchMove={onTouchMove}
                     onTouchEnd={onTouchEnd}
                >
                    {photo.photos.length > 1 && (
                        <button 
                            className="photo-nav-btn prev-btn" 
                            onClick={handlePrevious}
                            aria-label="Предыдущее фото"
                        >
                            <IconChevronLeft />
                        </button>
                    )}
                    
                    <div className="photo-container">
                        <img
                          src={currentPhoto.url}
                          alt={currentPhoto.caption || 'Фото из отчета'}
                          style={{ transform: `scale(${scale})`, transition: 'transform 0.1s ease-out' }}
                          onDoubleClick={() => setScale(s => (s !== 1 ? 1 : 2))}
                        />
                        {currentPhoto.caption && (
                            <p className="photo-viewer-caption">{currentPhoto.caption}</p>
                        )}
                    </div>
                    
                    {photo.photos.length > 1 && (
                        <button 
                            className="photo-nav-btn next-btn" 
                            onClick={handleNext}
                            aria-label="Следующее фото"
                        >
                            <IconChevronRight />
                        </button>
                    )}
                </div>

                {showContext && (
                    <div
                        style={{ position: 'absolute', bottom: 20, right: 20, background: 'rgba(0,0,0,0.75)', color: 'var(--primary-text-color)', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 12 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="delete-photo-btn" onClick={() => onDelete(photo.id)} aria-label="Удалить фотоотчет" style={{ background: 'transparent', border: '1px solid color-mix(in srgb, var(--primary-text-color) 35%, transparent)', color: 'var(--primary-text-color)', borderRadius: 6, padding: '6px 10px' }}>Удалить</button>
                        <button className="close-btn" onClick={() => setShowContext(false)} aria-label="Закрыть" style={{ background: 'transparent', border: '1px solid color-mix(in srgb, var(--primary-text-color) 35%, transparent)', color: 'var(--primary-text-color)', borderRadius: 6, padding: '6px 10px' }}>Закрыть</button>
                    </div>
                )}

                {photo.photos.length > 1 && (
                    photo.photos.length > 80 ? (
                        <div style={{ height: 260, borderTop: '1px solid var(--border-color)' }}>
                            <VirtualizedPhotoGrid
                                photos={photo.photos}
                                itemSize={80}
                                gap={8}
                                onItemClick={(i) => setCurrentPhotoIndex(i)}
                            />
                        </div>
                    ) : (
                        <div className="photo-thumbnails">
                            {photo.photos.map((photoItem, index) => (
                                <button
                                    key={index}
                                    className={`photo-thumbnail-btn ${index === currentPhotoIndex ? 'active' : ''}`}
                                    onClick={() => setCurrentPhotoIndex(index)}
                                >
                                    <img loading="lazy" src={photoItem.url} alt={photoItem.caption || `Фото ${index + 1}`} />
                                </button>
                            ))}
                        </div>
                    )
                )}

                <div className="photo-viewer-actions">
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                    <button onClick={() => onDelete(photo.id)} className="delete-photo-btn" aria-label="Удалить фотоотчет"><IconTrash/></button>
                </div>
            </div>
        </div>
    );
};
