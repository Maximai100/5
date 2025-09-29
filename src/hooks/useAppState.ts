import { useState, useEffect, useCallback, startTransition } from 'react';
import { ThemeMode } from '../types';
import { dataService } from '../services/storageService';

export const useAppState = () => {
    // App navigation state
    const [activeView, setActiveView] = useState<string>(() => {
        const savedView = dataService.getActiveView();
        // Если сохраненный вид - estimate, но нет активной сметы, переходим к workspace
        if (savedView === 'estimate' && !dataService.getActiveEstimateId()) {
            return 'workspace';
        }
        // Если сохраненный вид - projectDetail, но нет активного проекта, переходим к projects
        if (savedView === 'projectDetail' && !dataService.getActiveProjectId()) {
            return 'projects';
        }
        return savedView;
    });
    const [activeProjectId, setActiveProjectId] = useState<string | null>(() => dataService.getActiveProjectId());
    
    const [activeEstimateId, setActiveEstimateId] = useState<string | null>(() => dataService.getActiveEstimateId());
    
    // Theme state
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => dataService.getThemeMode());
    
    // UI state
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [draggingItem, setDraggingItem] = useState<number | null>(null);
    
    // Modal states
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showEstimatesListModal, setShowEstimatesListModal] = useState(false);
    const [estimatesListModalFromProject, setEstimatesListModalFromProject] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [showFinanceEntryModal, setShowFinanceEntryModal] = useState(false);
    const [showPhotoReportModal, setShowPhotoReportModal] = useState(false);
    const [showPhotoViewerModal, setShowPhotoViewerModal] = useState(false);
    const [showShoppingListModal, setShowShoppingListModal] = useState(false);
    const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
    const [showWorkStageModal, setShowWorkStageModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showActGenerationModal, setShowActGenerationModal] = useState(false);
    const [showAISuggestModal, setShowAISuggestModal] = useState(false);
    const [showAddToolModal, setShowAddToolModal] = useState(false);
    const [showToolDetailsModal, setShowToolDetailsModal] = useState(false);
    const [showScratchpadModal, setShowScratchpadModal] = useState(false);
    const [showGlobalDocumentModal, setShowGlobalDocumentModal] = useState(false);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    
    // Modal data
    const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
    const [selectedWorkStage, setSelectedWorkStage] = useState<any>(null);
    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [selectedTool, setSelectedTool] = useState<any>(null);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [actTotalAmount, setActTotalAmount] = useState<number>(0);
    const [scratchpadData, setScratchpadData] = useState<any>(null);
    
    // Search and filter states
    const [projectSearch, setProjectSearch] = useState('');
    const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'>('all');
    
    // Initial state is read synchronously from localStorage via useState initializers above
    
    // Save state to localStorage when it changes
    useEffect(() => {
        dataService.setActiveView(activeView);
    }, [activeView]);
    
    useEffect(() => {
        dataService.setActiveProjectId(activeProjectId);
    }, [activeProjectId]);
    
    useEffect(() => {
        dataService.setActiveEstimateId(activeEstimateId);
    }, [activeEstimateId]);
    
    useEffect(() => {
        dataService.setThemeMode(themeMode);
    }, [themeMode]);
    
    // Theme management
    const handleThemeChange = useCallback(() => {
        const newTheme = themeMode === 'light' ? 'dark' : 'light';
        setThemeMode(newTheme);
        document.body.classList.toggle('dark-theme', newTheme === 'dark');
    }, [themeMode]);
    
    // Apply theme on mount and change
    useEffect(() => {
        document.body.classList.toggle('dark-theme', themeMode === 'dark');
    }, [themeMode]);
    
    // Navigation helpers
    const navigateToView = useCallback((view: string, data?: any) => {
        setActiveView(view);
        // Если переданы данные для scratchpad, сохраняем их
        if (view === 'scratchpad' && data) {
            setScratchpadData(data);
        }
    }, []);
    
    const navigateToProject = useCallback((projectId: string) => {
        setActiveProjectId(projectId);
        setActiveView('projectDetail');
    }, []);
    
    const navigateToEstimate = useCallback((estimateId: string) => {
        setActiveEstimateId(estimateId);
        setActiveView('estimate');
    }, []);
    
    const goBack = useCallback(() => {
        if (activeView === 'projectDetail') {
            setActiveView('projects');
            // НЕ сбрасываем activeProjectId, чтобы можно было вернуться к проекту
        } else if (activeView === 'projectTasks') {
            // Возвращаемся в детали проекта, если есть активный проект
            if (activeProjectId) {
                setActiveView('projectDetail');
            } else {
                setActiveView('projects');
            }
        } else if (activeView === 'allTasks') {
            // Возвращаемся на главный экран
            setActiveView('workspace');
        } else if (activeView === 'estimate') {
            if (activeProjectId) {
                setActiveView('projectDetail');
            } else {
                setActiveView('workspace');
            }
            setActiveEstimateId(null);
        } else if (activeView === 'inventory') {
            setActiveView('workspace');
        } else if (activeView === 'reports') {
            setActiveView('workspace');
        } else if (activeView === 'scratchpad') {
            // Возвращаемся к предыдущему экрану в зависимости от контекста
            const previousView = scratchpadData?.previousView;
            if (previousView) {
                setActiveView(previousView);
            } else if (activeProjectId) {
                setActiveView('projectDetail');
            } else {
                setActiveView('workspace');
            }
        } else {
            setActiveView('workspace');
        }
    }, [activeView, activeProjectId]);
    
    // Modal helpers
    const openModal = useCallback((modalName: string, data?: any) => {
        startTransition(() => {
            switch (modalName) {
                case 'settings':
                    setShowSettingsModal(true);
                    break;
                case 'estimatesList':
                    setShowEstimatesListModal(true);
                    setEstimatesListModalFromProject(data?.fromProject || false);
                    break;
                case 'library':
                    setShowLibraryModal(true);
                    break;
                case 'newProject':
                    setSelectedProject(data || null);
                    setShowNewProjectModal(true);
                    break;
                case 'financeEntry':
                    setShowFinanceEntryModal(true);
                    break;
                case 'photoReport':
                    setShowPhotoReportModal(true);
                    break;
                case 'photoViewer':
                    setSelectedPhoto(data);
                    setShowPhotoViewerModal(true);
                    break;
                case 'shoppingList':
                    setShowShoppingListModal(true);
                    break;
                case 'documentUpload':
                    setShowDocumentUploadModal(true);
                    break;
                case 'workStage':
                    setSelectedWorkStage(data || null);
                    setShowWorkStageModal(true);
                    break;
                case 'note':
                    setSelectedNote(data || null);
                    setShowNoteModal(true);
                    break;
                case 'actGeneration':
                    setActTotalAmount(data || 0);
                    setShowActGenerationModal(true);
                    break;
                case 'aiSuggest':
                    setShowAISuggestModal(true);
                    break;
                case 'addTool':
                    setSelectedTool(data || null);
                    setShowAddToolModal(true);
                    break;
                case 'toolDetails':
                    setSelectedTool(data || null);
                    setShowToolDetailsModal(true);
                    break;
                case 'scratchpad':
                    setScratchpadData(data || null);
                    setShowScratchpadModal(true);
                    break;
                case 'globalDocument':
                    setShowGlobalDocumentModal(true);
                    break;
                case 'addTask':
                    setSelectedProject(data || null);
                    setShowAddTaskModal(true);
                    break;
                case 'editTask':
                    setSelectedTask(data || null);
                    setShowEditTaskModal(true);
                    break;
            }
        });
    }, []);
    
    const closeModal = useCallback((modalName: string) => {
        switch (modalName) {
            case 'settings':
                setShowSettingsModal(false);
                break;
            case 'estimatesList':
                setShowEstimatesListModal(false);
                setEstimatesListModalFromProject(false);
                break;
            case 'library':
                setShowLibraryModal(false);
                break;
            case 'newProject':
                setShowNewProjectModal(false);
                setSelectedProject(null);
                break;
            case 'financeEntry':
                setShowFinanceEntryModal(false);
                break;
            case 'photoReport':
                setShowPhotoReportModal(false);
                break;
            case 'photoViewer':
                setShowPhotoViewerModal(false);
                setSelectedPhoto(null);
                break;
            case 'shoppingList':
                setShowShoppingListModal(false);
                break;
            case 'documentUpload':
                setShowDocumentUploadModal(false);
                break;
            case 'workStage':
                setShowWorkStageModal(false);
                setSelectedWorkStage(null);
                break;
            case 'note':
                setShowNoteModal(false);
                setSelectedNote(null);
                break;
            case 'actGeneration':
                setShowActGenerationModal(false);
                setActTotalAmount(0);
                break;
            case 'aiSuggest':
                setShowAISuggestModal(false);
                break;
            case 'addTool':
                setShowAddToolModal(false);
                setSelectedTool(null);
                break;
            case 'toolDetails':
                setShowToolDetailsModal(false);
                setSelectedTool(null);
                break;
            case 'scratchpad':
                setShowScratchpadModal(false);
                setScratchpadData(null);
                break;
            case 'globalDocument':
                setShowGlobalDocumentModal(false);
                break;
            case 'addTask':
                setShowAddTaskModal(false);
                setSelectedProject(null);
                break;
            case 'editTask':
                setShowEditTaskModal(false);
                setSelectedTask(null);
                break;
        }
    }, []);
    
    // Loading state helpers
    const setLoading = useCallback((type: 'saving' | 'pdf', loading: boolean) => {
        if (type === 'saving') {
            setIsSaving(loading);
        } else if (type === 'pdf') {
            setIsPdfLoading(loading);
        }
    }, []);
    
    // Функция для принудительного обновления данных
    const refreshData = useCallback(() => {
        // Эта функция будет переопределена в App.tsx для обновления всех хуков
    }, []);
    
    return {
        // State
        activeView,
        activeProjectId,
        activeEstimateId,
        themeMode,
        isDirty,
        isSaving,
        isPdfLoading,
        draggingItem,
        projectSearch,
        projectStatusFilter,
        
        // Modal states
        showSettingsModal,
        showEstimatesListModal,
        showLibraryModal,
        showNewProjectModal,
        showFinanceEntryModal,
        showPhotoReportModal,
        showPhotoViewerModal,
        showShoppingListModal,
        showDocumentUploadModal,
        showWorkStageModal,
        showNoteModal,
        showActGenerationModal,
        showAISuggestModal,
        showAddToolModal,
        showToolDetailsModal,
        showScratchpadModal,
        showGlobalDocumentModal,
        showAddTaskModal,
        showEditTaskModal,
        
        // Modal data
        selectedPhoto,
        selectedWorkStage,
        selectedNote,
        selectedProject,
        selectedTool,
        selectedTask,
        actTotalAmount,
        scratchpadData,
        
        // Actions
        setActiveView,
        setActiveProjectId,
        setActiveEstimateId,
        setProjectSearch,
        setProjectStatusFilter,
        setIsDirty,
        setLoading,
        setDraggingItem,
        setSelectedProject,
        
        // Navigation
        navigateToView,
        navigateToProject,
        navigateToEstimate,
        goBack,
        
        // Theme
        handleThemeChange,
        
        // Modals
        openModal,
        closeModal,
        estimatesListModalFromProject,
        
        // Data refresh
        refreshData
    };
};
