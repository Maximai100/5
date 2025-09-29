import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Estimate, EstimatesListModalProps, EstimateStatus, EstimateTemplate } from '../../types';
import { IconClose, IconClipboard, IconTrash } from '../common/Icon';
import { useProjectContext } from '../../context/ProjectContext';

export const EstimatesListModal: React.FC<EstimatesListModalProps> = ({ onClose, estimates, templates, activeEstimateId, statusMap, formatCurrency, onLoadEstimate, onDeleteEstimate, onStatusChange, onSaveAsTemplate, onDeleteTemplate, onNewEstimate, onCopyToProject, isFromProject, onInputFocus }) => {
    const [activeTab, setActiveTab] = useState<'estimates' | 'templates'>('estimates');
    const [estimatesSearch, setEstimatesSearch] = useState('');
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

    const filteredEstimates = useMemo(() => {
        // Применяем поиск ко всем сметам
        return estimates.filter(e => 
            e.number.toLowerCase().includes(estimatesSearch.toLowerCase()) || 
            (e.clientInfo && e.clientInfo.toLowerCase().includes(estimatesSearch.toLowerCase()))
        );
    }, [estimates, estimatesSearch]);
    const filteredTemplates = useMemo(() => {

        if (!estimatesSearch.trim()) {
            // Если поиск пустой, показываем все шаблоны
            const result = templates.map((t, i) => ({ ...t, index: i }));

            return result;
        }
        // Если есть поиск, фильтруем по названиям позиций
        const result = templates.map((t, i) => ({ ...t, index: i })).filter(t => 
            t.items.some(item => item.name.toLowerCase().includes(estimatesSearch.toLowerCase()))
        );

        return result;
    }, [templates, estimatesSearch]);

    const { activeProjectId } = useProjectContext();

    const handleSelectTemplate = (template: EstimateTemplate) => {

      // Передаем только необходимые поля шаблона в handleNewEstimate
      const templateData: EstimateTemplate = {
        id: template.id,
        name: template.name,
        items: template.items || [],
        discount: template.discount || 0,
        discountType: template.discountType || 'percent',
        tax: template.tax || 0,
        lastModified: template.lastModified
      };

      onNewEstimate(templateData); // Вызываем родительскую функцию с данными шаблона
    };

    return (
        <div className="modal-overlay" onClick={() => { onClose(); setEstimatesSearch(''); }}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header">
                    <h2>Мои документы</h2>
                    <button onClick={() => { onClose(); setEstimatesSearch(''); }} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-tabs">
                    <button className={activeTab === 'estimates' ? 'active' : ''} onClick={() => setActiveTab('estimates')}>Сметы ({estimates.length})</button>
                    <button className={activeTab === 'templates' ? 'active' : ''} onClick={() => setActiveTab('templates')}>Шаблоны ({templates.length})</button>
                </div>
                <div className="modal-body estimates-modal-list">
                    <input type="search" placeholder="Поиск..." value={estimatesSearch} onChange={e => setEstimatesSearch(e.target.value)} onFocus={onInputFocus} className="modal-search-input" />
                    {activeTab === 'estimates' && ( <>
                        {filteredEstimates.length === 0 ? <p className="no-results-message">{estimates.length > 0 ? 'Ничего не найдено.' : 'Сохраненных смет нет.'}</p> :
                            filteredEstimates.map(e => ( <div key={e.id} className={`list-item ${e.id === activeEstimateId ? 'active' : ''}`}>
                                <div className="list-item-info">
                                    <strong>{e.clientInfo || e.number || 'Без названия'}</strong>
                                    <div className="estimate-meta">
                                        <span className="estimate-date">{new Date(e.date).toLocaleDateString('ru-RU')}</span>
                                        <span className="status-badge" style={{ backgroundColor: statusMap[e.status].color, color: statusMap[e.status].textColor }}>{statusMap[e.status].text}</span>
                                    </div>
                                </div>
                                <div className="list-item-actions">
                                    <select value={e.status} onChange={(ev) => onStatusChange(e.id, ev.target.value as EstimateStatus)} onClick={ev => ev.stopPropagation()} className="status-select">
                                        {Object.entries(statusMap).map(([k, v]) => (<option key={k} value={k}>{v.text}</option>))}
                                    </select>
                                    <button onClick={() => onSaveAsTemplate(e.id)} className="btn btn-secondary" title="Сохранить как шаблон"><IconClipboard/></button>
                                    {isFromProject && onCopyToProject ? (
                                        <button onClick={() => onCopyToProject(e.id)} className="btn btn-primary" title="Добавить в проект">Добавить</button>
                                    ) : (
                                        <button onClick={() => onLoadEstimate(e.id)} className="btn btn-secondary">Загрузить</button>
                                    )}
                                    <button onClick={() => onDeleteEstimate(e.id)} className="btn btn-tertiary"><IconTrash/></button>
                                </div>
                            </div>))
                        }
                    </>)}
                    {activeTab === 'templates' && ( <>
                         {filteredTemplates.length === 0 ? <p className="no-results-message">{templates.length > 0 ? 'Ничего не найдено.' : 'Шаблонов нет.'}</p> :
                            filteredTemplates.map(t => ( <div key={t.id} className="list-item">
                                <div className="list-item-info"><strong>{t.name}</strong><span>{t.items.length} поз., Итого: {formatCurrency(t.items.reduce((acc, i) => acc + i.price * i.quantity, 0))}</span></div>
                                <div className="list-item-actions"><button onClick={() => { handleSelectTemplate(t); onClose(); }} className="btn btn-primary">Использовать</button><button onClick={() => onDeleteTemplate(t.id)} className="btn btn-tertiary"><IconTrash/></button></div>
                            </div>))
                        }
                    </>)}
                </div>

            </div>
        </div>
    );
};