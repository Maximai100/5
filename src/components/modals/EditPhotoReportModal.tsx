import React, { useRef, useEffect, useState } from 'react';
import { PhotoReport } from '../../types';
import { useFileStorage } from '../../hooks/useFileStorage';
import { IconClose, IconPlus, IconTrash, IconEdit } from '../common/Icon';

interface PhotoItem {
    file?: File;
    preview?: string;
    caption: string;
    url?: string;
    path?: string;
    isExisting?: boolean; // Флаг для существующих фотографий
}

interface EditPhotoReportModalProps {
    photoReport: PhotoReport;
    onClose: () => void;
    onSave: (updatedPhotoReport: PhotoReport) => void;
    showAlert: (message: string, type?: 'success' | 'error') => void;
    workStages?: import('../../types').WorkStage[];
}

export const EditPhotoReportModal: React.FC<EditPhotoReportModalProps> = ({ 
    photoReport, 
    onClose, 
    onSave, 
    showAlert,
    workStages,
}) => {
    const [title, setTitle] = useState(photoReport.title);
    const [tags, setTags] = useState<string[]>(photoReport.tags || []);
    const [stage, setStage] = useState<string>(photoReport.stage || '');
    const [photos, setPhotos] = useState<PhotoItem[]>(() => 
        photoReport.photos.map(photo => ({
            url: photo.url,
            path: photo.path,
            caption: photo.caption,
            isExisting: true
        }))
    );
    const [uploadProgress, setUploadProgress] = useState<{current: number; total: number} | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadFileWithFallback, updatePhotoReport, deletePhotoFromStorage, isUploading } = useFileStorage();

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = e.target?.result as string;
                    setPhotos(prev => [...prev, {
                        file,
                        preview,
                        caption: '',
                        isExisting: false
                    }]);
                };
                reader.readAsDataURL(file);
            }
        });

        // Очищаем input для возможности повторного выбора тех же файлов
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCaptionChange = (index: number, caption: string) => {
        setPhotos(prev => prev.map((photo, i) => 
            i === index ? { ...photo, caption } : photo
        ));
    };

    const handleRemovePhoto = async (index: number) => {
        const photoToRemove = photos[index];
        
        // Если это существующая фотография, удаляем её из Storage
        if (photoToRemove.isExisting && photoToRemove.path) {
            try {
                await deletePhotoFromStorage(photoToRemove.path);
            } catch (error) {
                console.warn('Ошибка удаления фотографии из Storage:', error);
            }
        }
        
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    // Drag & drop reordering
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const handleDragStart = (index: number) => { dragItem.current = index; };
    const handleDragEnter = (index: number) => { dragOverItem.current = index; };
    const handleDragEnd = () => {
        const from = dragItem.current;
        const to = dragOverItem.current;
        dragItem.current = null;
        dragOverItem.current = null;
        if (from === null || to === null || from === to) return;
        setPhotos(prev => {
            const copy = [...prev];
            const [moved] = copy.splice(from, 1);
            copy.splice(to, 0, moved);
            return copy;
        });
    };

    const handleSave = async () => {
        if (!title.trim()) {
            showAlert('Введите название фотоотчета', 'error');
            return;
        }

        if (photos.length === 0) {
            showAlert('Добавьте хотя бы одну фотографию', 'error');
            return;
        }

        try {
            // Разделяем существующие и новые фотографии
            const existingPhotos = photos.filter(photo => photo.isExisting);
            const newPhotos = photos.filter(photo => !photo.isExisting && photo.file);
            
            // Сначала добавляем существующие фотографии
            const updatedPhotos = existingPhotos.map(photo => ({
                url: photo.url!,
                path: photo.path!,
                caption: photo.caption
            }));

            // Параллельно загружаем новые фотографии
            if (newPhotos.length > 0) {
                setUploadProgress({ current: 0, total: newPhotos.length });
                
                const uploadPromises = newPhotos.map(async (photo, index) => {
                    try {
                        const uploadResult = await uploadFileWithFallback('photos', photo.file!);
                        if (uploadResult.error) {
                            throw new Error(`Ошибка загрузки фотографии: ${uploadResult.error}`);
                        }
                        
                        // Обновляем прогресс
                        setUploadProgress(prev => prev ? { ...prev, current: prev.current + 1 } : null);
                        
                        return {
                            url: uploadResult.publicUrl,
                            path: uploadResult.path,
                            caption: photo.caption
                        };
                    } catch (error) {
                        console.error('Ошибка загрузки фотографии:', error);
                        throw error;
                    }
                });

                // Ждем завершения всех загрузок
                const uploadResults = await Promise.allSettled(uploadPromises);
                
                // Проверяем результаты загрузки
                const failedUploads = uploadResults.filter(result => result.status === 'rejected');
                if (failedUploads.length > 0) {
                    const errorMessage = failedUploads[0].status === 'rejected' 
                        ? failedUploads[0].reason.message 
                        : 'Ошибка загрузки фотографий';
                    showAlert(errorMessage, 'error');
                    return;
                }

                // Добавляем успешно загруженные фотографии
                const successfulUploads = uploadResults
                    .filter((result): result is PromiseFulfilledResult<{url: string; path: string; caption: string}> => 
                        result.status === 'fulfilled')
                    .map(result => result.value);
                
                updatedPhotos.push(...successfulUploads);
            }

            const updatedPhotoReport: PhotoReport = {
                ...photoReport,
                title: title.trim(),
                tags,
                stage: stage.trim() || undefined,
                photos: updatedPhotos,
                updatedAt: new Date().toISOString()
            };

            // Обновляем в базе данных
            await updatePhotoReport(photoReport.id, {
                title: title.trim(),
                photos: updatedPhotos
            });

            onSave(updatedPhotoReport);
            showAlert('Фотоотчет успешно обновлен', 'success');
            setUploadProgress(null);
            onClose();
        } catch (error) {
            console.error('Ошибка при обновлении фотоотчета:', error);
            showAlert('Ошибка при обновлении фотоотчета', 'error');
            setUploadProgress(null);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card photo-report-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header">
                    <h2>Редактировать фотоотчет</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Закрыть">
                        <IconClose />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label htmlFor="title">Название фотоотчета</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Введите название фотоотчета"
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Категории</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {['фундамент','стены','отделка'].map(opt => (
                                <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                    <input
                                        type="checkbox"
                                        checked={tags.includes(opt)}
                                        onChange={(e) => {
                                            setTags(prev => e.target.checked ? [...prev, opt] : prev.filter(t => t !== opt));
                                        }}
                                    />
                                    <span>{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="stage">Этап работ</label>
                        {workStages && workStages.length > 0 ? (
                            <select id="stage" className="form-input" value={stage} onChange={(e) => setStage(e.target.value)}>
                                <option value="">Без этапа</option>
                                {workStages.map(ws => (
                                    <option key={ws.id} value={ws.title}>{ws.title}</option>
                                ))}
                            </select>
                        ) : (
                            <input id="stage" type="text" value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Напр., Черновые, Чистовые, Фундамент" className="form-input" />
                        )}
                    </div>

                    <div className="form-group">
                        <label>Фотографии</label>
                        <div className="photo-upload-area">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <button
                                type="button"
                                className="add-photo-btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                <IconPlus />
                                Добавить фотографии
                            </button>
                        </div>

                        {photos.length > 0 && (
                            <div className="photos-preview">
                                {photos.map((photo, index) => (
                                    <div
                                        key={index}
                                        className="photo-preview-item"
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragEnter={() => handleDragEnter(index)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <div className="photo-preview">
                                            <img 
                                                src={photo.preview || photo.url} 
                                                alt={`Фото ${index + 1}`}
                                            />
                                            <button
                                                className="remove-photo-btn"
                                                onClick={() => handleRemovePhoto(index)}
                                                aria-label="Удалить фотографию"
                                            >
                                                <IconTrash />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={photo.caption}
                                            onChange={(e) => handleCaptionChange(index, e.target.value)}
                                            placeholder="Подпись к фото"
                                            className="photo-caption-input"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={onClose}
                        disabled={isUploading}
                    >
                        Отмена
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={handleSave}
                        disabled={isUploading || !title.trim() || photos.length === 0}
                    >
                        {isUploading ? (
                            uploadProgress ? 
                                `Загрузка ${uploadProgress.current}/${uploadProgress.total}...` : 
                                'Сохранение...'
                        ) : 'Сохранить изменения'}
                    </button>
                </div>
            </div>
        </div>
    );
};
