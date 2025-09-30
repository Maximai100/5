import React, { useState, useMemo } from 'react';
import { Task, Project, ProjectTasksScreenProps } from '../../types';
import { IconPlus, IconFilter, IconChevronRight } from '../common/Icon';
import TaskDetailsModal from '../modals/TaskDetailsModal';
import { ListItem } from '../ui/ListItem';
import { formatDueDate } from '../../utils';
import { TaskFilterModal } from '../modals/TaskFilterModal';
import { AddTaskModal } from '../modals/AddTaskModal';

const priorityMap: Record<string, { color: string, name: string }> = {
    low:   { color: 'var(--priority-low)', name: 'Низкий' },
    medium:{ color: 'var(--priority-medium)', name: 'Средний' },
    high:  { color: 'var(--priority-high)', name: 'Высокий' },
    urgent:{ color: 'var(--priority-urgent)', name: 'Срочный' },
};

// Рендер реализован ниже через универсальный ListItem

export const ProjectTasksScreen: React.FC<ProjectTasksScreenProps> = ({ tasks, projects, projectId, onAddTask, onUpdateTask, onToggleTask, onDeleteTask, onBack }) => {
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<{ projectId: string | null; tag: string | null; }>({ projectId: null, tag: null });

    const handleSaveTask = (title: string, selectedProjectId: string | number | null, priority?: string, dueDate?: string | null) => {
        onAddTask(title, selectedProjectId?.toString() || null, priority, dueDate);
    };

    const handleSelectTaskForEdit = (task: Task) => {
        setEditingTask(task);
    };

    const handleUpdateTask = (updatedTask: Task) => {
        onUpdateTask(updatedTask);
        setEditingTask(null);
    };

    const availableProjects = useMemo(() => {
        const projectIds = [...new Set(tasks.map(t => t.projectId).filter(Boolean))];
        return projectIds.map(projectId => {
            const project = projects.find(p => p.id === projectId);
            return { id: projectId!, name: project?.name || `Проект ${projectId}` };
        });
    }, [tasks, projects]);
    const availableTags = useMemo(() => [...new Set(tasks.flatMap(t => t.tags || []))], [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const projectMatch = !activeFilters.projectId || task.projectId === activeFilters.projectId;
            const tagMatch = !activeFilters.tag || (task.tags && task.tags.includes(activeFilters.tag));
            return projectMatch && tagMatch;
        });
    }, [tasks, activeFilters]);

    const groupedTasks = useMemo(() => {
        const groups = {
            overdue: [] as Task[],
            today: [] as Task[],
            upcoming: [] as Task[],
            completed: [] as Task[],
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        filteredTasks.forEach(task => {
            if (task.isCompleted) {
                groups.completed.push(task);
                return;
            }

            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0, 0, 0, 0);

                if (dueDate.getTime() < today.getTime()) {
                    groups.overdue.push(task);
                } else if (dueDate.getTime() === today.getTime()) {
                    groups.today.push(task);
                } else {
                    groups.upcoming.push(task);
                }
            } else {
                groups.upcoming.push(task);
            }
        });

        return groups;
    }, [filteredTasks]);

    // Модалка редактирования будет отрисована внизу return

    return (
        <>
            <header className="projects-list-header">
                <div className="header-left">
                    {projectId && onBack && (
                        <button onClick={onBack} className="back-btn" aria-label="Назад">
                            <IconChevronRight style={{transform: 'rotate(180deg)'}} />
                        </button>
                    )}
                    <h1>{projectId ? `Задачи проекта "${projects.find(p => p.id === projectId)?.name || 'Неизвестный проект'}"` : 'Все задачи'}</h1>
                </div>
                <div className="header-actions">
                    <button onClick={() => setIsFilterModalOpen(true)} className="header-btn" aria-label="Фильтр"><IconFilter /></button>
                    <button onClick={() => setIsAddTaskModalOpen(true)} className="header-btn" aria-label="Новая задача"><IconPlus /></button>
                </div>
            </header>
            <main>
                <div className="card project-section">
                    <div className="project-section-body">
                        {filteredTasks.length === 0 && tasks.length > 0 ? (
                             <p className="empty-list-message">Задачи, соответствующие фильтру, не найдены.</p>
                        ) : tasks.length === 0 ? (
                            <p className="empty-list-message">Задач пока нет.</p>
                        ) : (
                            <div className="task-groups-container">
                                {groupedTasks.upcoming.length > 0 && (
                                    <div className="task-group">
                                        <ul className="task-list">
                                            {groupedTasks.upcoming.map(task => (
                                                <ListItem
                                                    key={task.id}
                                                    icon={<></>}
                                                    onIconClick={() => onToggleTask(task.id)}
                                                    iconChecked={task.isCompleted}
                                                    iconBgColor={priorityMap[task.priority || 'medium'].color}
                                                    title={task.title}
                                                    subtitle={`${projects.find(p => p.id === task.projectId)?.name || ''}${task.dueDate ? ' • ' + formatDueDate(task.dueDate) : ''}`}
                                                    onClick={() => handleSelectTaskForEdit(task)}
                                                    onDelete={() => onDeleteTask(task.id)}
                                                />
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {groupedTasks.today.length > 0 && (
                                    <div className="task-group">
                                        <h4>Сегодня</h4>
                                        <ul className="task-list">
                                            {groupedTasks.today.map(task => (
                                                <ListItem
                                                    key={task.id}
                                                    icon={<></>}
                                                    onIconClick={() => onToggleTask(task.id)}
                                                    iconChecked={task.isCompleted}
                                                    iconBgColor={priorityMap[task.priority || 'medium'].color}
                                                    title={task.title}
                                                    subtitle={`${projects.find(p => p.id === task.projectId)?.name || ''}${task.dueDate ? ' • ' + formatDueDate(task.dueDate) : ''}`}
                                                    onClick={() => handleSelectTaskForEdit(task)}
                                                    onDelete={() => onDeleteTask(task.id)}
                                                />
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {groupedTasks.overdue.length > 0 && (
                                    <div className="task-group">
                                        <h4>Просроченные</h4>
                                        <ul className="task-list">
                                            {groupedTasks.overdue.map(task => (
                                                <ListItem
                                                    key={task.id}
                                                    icon={<></>}
                                                    onIconClick={() => onToggleTask(task.id)}
                                                    iconChecked={task.isCompleted}
                                                    iconBgColor={priorityMap[task.priority || 'medium'].color}
                                                    title={task.title}
                                                    subtitle={`${projects.find(p => p.id === task.projectId)?.name || ''}${task.dueDate ? ' • ' + formatDueDate(task.dueDate) : ''}`}
                                                    onClick={() => handleSelectTaskForEdit(task)}
                                                    onDelete={() => onDeleteTask(task.id)}
                                                />
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {groupedTasks.completed.length > 0 && (
                                    <div className="task-group">
                                        <h4>Выполненные</h4>
                                        <ul className="task-list">
                                            {groupedTasks.completed.map(task => (
                                                <ListItem
                                                    key={task.id}
                                                    icon={<></>}
                                                    onIconClick={() => onToggleTask(task.id)}
                                                    iconChecked={true}
                                                    iconBgColor={priorityMap[task.priority || 'medium'].color}
                                                    title={task.title}
                                                    titleStrike={true}
                                                    subtitle={`${projects.find(p => p.id === task.projectId)?.name || ''}${task.dueDate ? ' • ' + formatDueDate(task.dueDate) : ''}`}
                                                    onClick={() => handleSelectTaskForEdit(task)}
                                                    onDelete={() => onDeleteTask(task.id)}
                                                />
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            {isFilterModalOpen && (
                <TaskFilterModal 
                    onClose={() => setIsFilterModalOpen(false)}
                    onApplyFilters={setActiveFilters}
                    availableProjects={availableProjects}
                    availableTags={availableTags}
                    currentFilters={activeFilters}
                />
            )}
            {isAddTaskModalOpen && (
                <AddTaskModal 
                    onClose={() => setIsAddTaskModalOpen(false)}
                    onSave={handleSaveTask}
                    projects={projects}
                    initialProjectId={projectId}
                />
            )}
            {editingTask && (
                <TaskDetailsModal
                    task={editingTask}
                    onClose={() => setEditingTask(null)}
                    onSave={handleUpdateTask}
                />
            )}
        </>
    );
};
