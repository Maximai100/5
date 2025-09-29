import React from 'react';
import { ProjectsListViewProps, Project, ProjectStatus } from '../../types';
import { IconPlus, IconFolder } from '../common/Icon';
import { ListItem } from '../ui/ListItem';

export const ProjectsListView: React.FC<ProjectsListViewProps> = ({
    handleOpenProjectModal, projectStatusFilter, setProjectStatusFilter, projectSearch, setProjectSearch,
    handleInputFocus, filteredProjects, projects, setActiveProjectId, setActiveView
}) => {
    console.log('🔍 ProjectsListView: Компонент рендерится');
    console.log('🔍 ProjectsListView: projects:', projects);
    console.log('🔍 ProjectsListView: projects.length:', projects?.length);
    console.log('🔍 ProjectsListView: filteredProjects:', filteredProjects);
    console.log('🔍 ProjectsListView: filteredProjects.length:', filteredProjects?.length);
    console.log('🔍 ProjectsListView: projectStatusFilter:', projectStatusFilter);
    console.log('🔍 ProjectsListView: projectSearch:', projectSearch);
    
    return (
    <>
        <header className="projects-list-header">
            <h1>Проекты</h1>
            <div className="header-actions">
                <button onClick={() => handleOpenProjectModal(null)} className="header-btn" aria-label="Новый проект"><IconPlus/></button>
            </div>
        </header>
        <main>
            <div className="project-filters">
                <div className="toggle-switch">
                    <button onClick={() => setProjectStatusFilter('all')} className={projectStatusFilter === 'all' ? 'active' : ''} title="Все проекты">Все</button>
                    <button onClick={() => setProjectStatusFilter('planned')} className={projectStatusFilter === 'planned' ? 'active' : ''} title="Планируются">План</button>
                    <button onClick={() => setProjectStatusFilter('in_progress')} className={projectStatusFilter === 'in_progress' ? 'active' : ''} title="В работе">Работа</button>
                    <button onClick={() => setProjectStatusFilter('on_hold')} className={projectStatusFilter === 'on_hold' ? 'active' : ''} title="На паузе">Пауза</button>
                    <button onClick={() => setProjectStatusFilter('completed')} className={projectStatusFilter === 'completed' ? 'active' : ''} title="Завершены">Готово</button>
                    <button onClick={() => setProjectStatusFilter('cancelled')} className={projectStatusFilter === 'cancelled' ? 'active' : ''} title="Отменены">Отмена</button>
                </div>
                <input type="search" placeholder="Поиск по проектам..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)} onFocus={handleInputFocus} />
            </div>
            <div className="projects-list">
                {filteredProjects.length > 0 ? filteredProjects.map((project: Project) => (
                    <ListItem
                        key={project.id}
                        icon={<IconFolder />}
                        title={project.name}
                        subtitle={`${project.client || 'Клиент не указан'} • ${project.address || 'Адрес не указан'}`}
                        onClick={() => { setActiveProjectId(project.id); setActiveView('projectDetail'); }}
                    />
                )) : (
                    <div className="empty-state-container">
                        <IconFolder />
                        <p>У вас пока нет проектов. Начните свой первый проект прямо сейчас!</p>
                        <button onClick={() => handleOpenProjectModal(null)} className="btn btn-primary">+ Создать новый проект</button>
                    </div>
                )}
            </div>
        </main>
    </>
);
};