import React, { useState, useRef, useEffect } from 'react';
import { AddToolModalProps, ToolCondition } from '../../types';
import { IconClose } from '../common/Icon';

const conditionMap: Record<ToolCondition, string> = {
    excellent: 'Отличное',
    good: 'Хорошее',
    needs_service: 'Требует обслуживания',
    in_repair: 'В ремонте',
};

export const AddToolModal: React.FC<AddToolModalProps> = ({ onClose, onSave, projects = [] }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [condition, setCondition] = useState<ToolCondition>('excellent');
    const [notes, setNotes] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = () => {
        if (!name.trim()) {
            // Or show an alert
            return;
        }
        
        const toolData = {
            name,
            category: category || undefined,
            condition,
            notes: notes || undefined,
            image_url: imagePreview || undefined,
            purchase_date: purchaseDate || undefined,
            purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        };
        
        onSave(toolData, imageFile || undefined);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header">
                    <h2>Добавить инструмент</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose /></button>
                </div>
                <div className="modal-body">
                    <label>Название инструмента *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Например, 'Перфоратор Bosch'"
                        required
                    />
                    
                    <label>Категория</label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Например, 'Электроинструмент'"
                    />
                    
                    <label>Состояние</label>
                    <select value={condition} onChange={(e) => setCondition(e.target.value as ToolCondition)}>
                        {Object.entries(conditionMap).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                        ))}
                    </select>
                    
                    <label>Заметки</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Дополнительная информация об инструменте"
                        rows={3}
                    />
                    
                    <label>Изображение</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                backgroundColor: 'var(--input-bg)',
                                color: 'var(--text-color)',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            📷 Выбрать изображение
                        </button>
                        
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Предпросмотр</label>
                        {imagePreview ? (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <img
                                    src={imagePreview}
                                    alt="Предпросмотр изображения инструмента"
                                    style={{
                                        width: '200px',
                                        height: '150px',
                                        borderRadius: '8px',
                                        objectFit: 'cover',
                                        border: '1px solid var(--border-color)'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        background: 'var(--danger-color)',
                                        color: 'var(--primary-text-color)',
                                        opacity: 0.9,
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <div 
                                style={{
                                    width: '200px',
                                    height: '150px',
                                    border: '2px dashed var(--border-color)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-secondary)',
                                    fontSize: '14px',
                                    backgroundColor: 'var(--input-bg)'
                                }}
                            >
                                Изображение не выбрано
                            </div>
                        )}
                    </div>
                    
                    <label>Дата покупки</label>
                    <input
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                    
                    <label>Цена покупки</label>
                    <input
                        type="number"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                    />
                </div>
                <div className="modal-footer" style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'var(--secondary-bg-color)'
                }}>
                    <button 
                        onClick={handleSave} 
                        style={{ 
                            padding: '12px 32px',
                            backgroundColor: 'var(--primary-color)',
                            color: 'var(--primary-text-color)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};
