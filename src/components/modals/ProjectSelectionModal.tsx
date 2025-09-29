import React, { useRef, useEffect } from 'react';
import { IconClose } from '../common/Icon';

interface Project {
  id: string;
  name: string;
  client: string;
  address: string;
}

interface ProjectSelectionModalProps {
  isOpen: boolean;
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onClose: () => void;
  title: string;
}

export const ProjectSelectionModal: React.FC<ProjectSelectionModalProps> = ({
  isOpen,
  projects,
  onSelectProject,
  onClose,
  title
}) => {
  console.log('ProjectSelectionModal рендерится, isOpen:', isOpen);
  const modalRef = useRef<HTMLDivElement>(null);

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
  
  if (!isOpen) {
    console.log('ProjectSelectionModal не отображается, isOpen:', isOpen);
    return null;
  }
  
  console.log('ProjectSelectionModal отображается!');
  
  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="close-btn" aria-label="Закрыть">
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          {projects.length > 0 ? (
            <div className="project-list">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="project-item"
                  onClick={() => onSelectProject(project)}
                >
                  <div className="project-name">{project.name}</div>
                  <div className="project-details">
                    {project.client} • {project.address}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-projects">Проекты не найдены</p>
          )}
        </div>
      </div>
    </div>
  );
};
