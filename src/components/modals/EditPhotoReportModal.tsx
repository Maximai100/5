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
}

export const EditPhotoReportModal: React.FC<EditPhotoReportModalProps> = ({ 
    photoReport, 
    onClose, 
    onSave, 
    showAlert 
}) => {
    const [title, setTitle] = useState(photoReport.title);
    const [photos, setPhotos] = useState<PhotoItem[]>(() => 
        photoReport.photos.map(photo => ({
            url: photo.url,
            path: photo.path,
            caption: photo.caption,
            isExisting: true
        }))
    );
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
            const updatedPhotos = [];
            
            // Обрабатываем существующие фотографии
            for (const photo of photos) {
                if (photo.isExisting) {
                    // Существующая фотография - просто добавляем в массив
                    updatedPhotos.push({
                        url: photo.url!,
                        path: photo.path!,
                        caption: photo.caption
                    });
                } else if (photo.file) {
                    // Новая фотография - загружаем
                    const uploadResult = await uploadFileWithFallback('photos', photo.file);
                    if (uploadResult.error) {
                        showAlert(`Ошибка загрузки фотографии: ${uploadResult.error}`, 'error');
                        return;
                    }
                    updatedPhotos.push({
                        url: uploadResult.publicUrl,
                        path: uploadResult.path,
                        caption: photo.caption
                    });
                }
            }

            const updatedPhotoReport: PhotoReport = {
                ...photoReport,
                title: title.trim(),
                photos: updatedPhotos,
                updatedAt: new Date().toISOString()
            };

            await updatePhotoReport(photoReport.id, {
                title: title.trim(),
                photos: updatedPhotos
            });

            onSave(updatedPhotoReport);
            showAlert('Фотоотчет успешно обновлен', 'success');
            onClose();
        } catch (error) {
            console.error('Ошибка при обновлении фотоотчета:', error);
            showAlert('Ошибка при обновлении фотоотчета', 'error');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content photo-report-modal" onClick={e => e.stopPropagation()} ref={modalRef}>
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
                                    <div key={index} className="photo-preview-item">
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
                        {isUploading ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                </div>
            </div>
        </div>
    );
};
