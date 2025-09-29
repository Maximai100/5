import React, { useState } from 'react';
import { ListItem } from '../ui/ListItem';
import { IconTrendingUp, IconMessageSquare, IconDocument } from '../common/Icon';
import { Project } from '../../types';
import { ProjectSelectionModal } from '../modals/ProjectSelectionModal';

interface ReportsHubScreenProps {
  onOpenProjectReport: (project: Project) => void;
  onOpenClientReport: (project: Project) => void;
  onOpenOverallReport: () => void;
  projects: Project[];
}

export const ReportsHubScreen: React.FC<ReportsHubScreenProps> = ({ onOpenProjectReport, onOpenClientReport, onOpenOverallReport, projects }) => {
  const [isProjectReportModalOpen, setIsProjectReportModalOpen] = useState(false);
  const [isClientReportModalOpen, setIsClientReportModalOpen] = useState(false);

  const handleProjectReportClick = () => {
    setIsProjectReportModalOpen(true);
  };

  const handleClientReportClick = () => {
    setIsClientReportModalOpen(true);
  };

  const handleOverallReportClick = () => {
    console.log('handleOverallReportClick вызвана!');
    onOpenOverallReport();
  };

  return (
    <>
      <header className="projects-list-header">
        <h1>Центр Отчетов</h1>
      </header>
      <main className="project-detail-main" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-m)' }}>
        <ListItem
          icon={<IconTrendingUp />}
          title="Финансовый отчет по проекту"
          subtitle="Прибыль и расходы по одному объекту"
          onClick={handleProjectReportClick}
        />
        <ListItem
          icon={<IconMessageSquare />}
          title="Отчет для клиента"
          subtitle="Создать понятную сводку для заказчика"
          onClick={handleClientReportClick}
        />
        <ListItem
          icon={<IconDocument />}
          title="Общий финансовый отчет"
          subtitle="Аналитика по всем проектам за период"
          onClick={handleOverallReportClick}
        />
      </main>

      {/* Модальное окно выбора проекта для финансового отчета */}
      <ProjectSelectionModal
        isOpen={isProjectReportModalOpen}
        projects={projects}
        title="Выберите проект для финансового отчета"
        onSelectProject={(project) => {
          onOpenProjectReport(project);
          setIsProjectReportModalOpen(false);
        }}
        onClose={() => setIsProjectReportModalOpen(false)}
      />

      {/* Модальное окно выбора проекта для клиентского отчета */}
      <ProjectSelectionModal
        isOpen={isClientReportModalOpen}
        projects={projects}
        title="Выберите проект для отчета клиенту"
        onSelectProject={(project) => {
          onOpenClientReport(project);
          setIsClientReportModalOpen(false);
        }}
        onClose={() => setIsClientReportModalOpen(false)}
      />
    </>
  );
};
