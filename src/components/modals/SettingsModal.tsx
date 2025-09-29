import React, { useRef, useEffect } from 'react';
import { CompanyProfile, SettingsModalProps } from '../../types';
import { IconClose } from '../common/Icon';

export const SettingsModal: React.FC<SettingsModalProps> = ({ profile, onClose, onProfileChange, onLogoChange, onRemoveLogo, onSave, onInputFocus, onLogout }) => {
    const modalRef = useRef<HTMLDivElement>(null);

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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header">
                    <h2>Профиль компании</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-body">
                    <label>Название компании</label>
                    <input type="text" value={profile.name} onChange={(e) => onProfileChange('name', e.target.value)} onFocus={onInputFocus} placeholder="Ваше ИП или название" />
                    <label>Реквизиты / Контакты</label>
                    <textarea value={profile.details} onChange={(e) => onProfileChange('details', e.target.value)} onFocus={onInputFocus} placeholder="Телефон, адрес, email..." rows={3} />
                    <label>Логотип</label>
                    {profile.logo ? (
                        <div className="logo-preview-container">
                            <img 
                                src={(() => {
                                    const logoUrl = profile.logo;
                                    if (!logoUrl) return '';
                                    
                                    // Проверяем, не содержит ли URL multipart/form-data
                                    if (logoUrl.includes('multipart') || logoUrl.includes('form-data')) {
                                        console.error('❌ Обнаружен неправильный URL с multipart/form-data в модальном окне:', logoUrl);
                                        console.error('❌ Не отображаем логотип');
                                        return '';
                                    }
                                    
                                    return logoUrl;
                                })()}
                                alt="Предпросмотр логотипа" 
                                className="logo-preview"
                                onLoad={(e) => {
                                    console.log('✅ Логотип в модальном окне загружен успешно:', e.currentTarget.src);
                                }}
                                onError={(e) => {
                                    const currentSrc = e.currentTarget.src;
                                    console.error('❌ Ошибка загрузки логотипа в модальном окне:', currentSrc);
                                    
                                    // Проверяем, не является ли это ложным срабатыванием
                                    if (currentSrc.includes('multipart') || currentSrc.includes('form-data')) {
                                        console.error('❌ URL содержит multipart/form-data - это ожидаемая ошибка');
                                        console.error('❌ Возможно, URL содержит multipart/form-data');
                                        return;
                                    }
                                    
                                    // Проверяем, не является ли это пустым URL
                                    if (!currentSrc || currentSrc === '') {
                                        console.error('❌ Пустой URL логотипа - это ожидаемое поведение');
                                        return;
                                    }
                                    
                                    console.error('❌ Неожиданная ошибка загрузки логотипа');
                                }}
                            />
                            <button onClick={onRemoveLogo} className="btn btn-tertiary remove-logo-btn">Удалить</button>
                        </div>
                    ) : (
                        <input type="file" accept="image/png, image/jpeg" onChange={onLogoChange} />
                    )}
                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                    <button onClick={onSave} className="btn btn-primary">Сохранить</button>
                    <button onClick={onLogout} className="btn btn-secondary">Выйти</button>
                </div>
            </div>
        </div>
    );
};