import React, { useState, useRef, useEffect } from 'react';
import { IconClose } from '../common/Icon';

interface EstimateNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  initialName?: string;
}

export const EstimateNameModal: React.FC<EstimateNameModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialName = ''
}) => {
  const [estimateName, setEstimateName] = useState(initialName);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEstimateName(initialName);
    }
  }, [isOpen, initialName]);

  useEffect(() => {
    if (modalRef.current && isOpen) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      if (firstElement) {
        firstElement.focus();
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    if (estimateName.trim()) {
      onConfirm(estimateName.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
        <div className="modal-header">
          <h2>Создание сметы</h2>
          <button onClick={onClose} className="close-btn" aria-label="Закрыть">
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          <div className="meta-field">
            <label htmlFor="estimate-name">Название сметы</label>
            <input
              type="text"
              id="estimate-name"
              value={estimateName}
              onChange={e => setEstimateName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите название сметы"
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            Отмена
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!estimateName.trim()}
          >
            Создать смету
          </button>
        </div>
      </div>
    </div>
  );
};
