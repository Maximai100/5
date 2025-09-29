export type ProjectStatus = 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type ToolLocation = 'on_base' | 'in_repair' | 'on_project';
export type FinanceCategory = 'materials' | 'labor' | 'transport' | 'tools_rental' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ToolCondition = 'excellent' | 'good' | 'needs_service' | 'in_repair';
export type WorkStageStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type ItemType = 'material' | 'work';
export type LibraryItemCategory = 'electrics' | 'plumbing' | 'finishing_materials';
export type NoteContext = 'global' | 'project' | 'inventory_tools' | 'inventory_consumables';

export interface ProjectFinancials {
    estimateTotal: number;
    paidTotal: number;
    expensesTotal: number;
    expensesBreakdown: { categoryName: string; amount: number }[];
    profit: number;
    profitability: number;
    cashFlowEntries: { date: string; type: 'income' | 'expense'; amount: number; description: string }[];
}

export interface ProjectTasksScreenProps {
    tasks: Task[];
    projects: Project[];
    projectId: string | null;
    onAddTask: (title: string, projectId: string | null, priority?: string, dueDate?: string | null) => void;
    onUpdateTask: (task: Task) => void;
    onToggleTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    onBack?: () => void;
}

export interface InventoryScreenProps {
    tools: Tool[];
    projects: Project[];
    consumables: Consumable[];
    onToolClick: (tool: Tool) => void;
    onUpdateTool: (tool: Tool) => void;
    onOpenAddToolModal: () => void;
    onAddConsumable: (consumable: Omit<Consumable, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onUpdateConsumable: (consumable: Consumable) => void;
    onDeleteConsumable: (id: string) => void;
    onOpenToolDetailsModal: (tool: Tool) => void;
    notesHook: {
        getNote: (context: NoteContext, entityId?: string | null) => string;
        saveNote: (context: NoteContext, content: string, entityId?: string | null) => Promise<void>;
    };
}

export interface ToolDetailsScreenProps {
    tool: Partial<Tool>;
    onSave: (tool: Partial<Tool>) => void;
    onBack: () => void;
    onDelete: (id: string) => void;
}

export type ConsumableLocation = 'on_base' | 'on_project' | 'to_buy';

export interface Consumable {
    id: string; // Генерируется UUID
    name: string;
    quantity: number;
    unit?: string;
    location?: ConsumableLocation;
    projectId?: string | null;
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface Tool {
    id: string; // Генерируется UUID
    name: string;
    category?: string;
    condition?: ToolCondition;
    location?: ToolLocation;
    notes?: string;
    image_url?: string; // URL-адрес изображения (соответствует Supabase)
    purchase_date?: string; // ISO 8601 format (соответствует Supabase)
    purchase_price?: number; // соответствует Supabase
    purchaseDate?: string; // ISO 8601 format (для совместимости)
    purchasePrice?: number; // для совместимости
    projectId?: string | null; // Required if location is 'on_project'
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface Note {
    id: string; // Генерируется UUID
    userId: string; // Ссылка на auth.users
    content: string; // Содержимое заметки
    context: NoteContext; // Контекст заметки
    entityId?: string | null; // ID связанной сущности (например, project_id)
    projectId?: string; // ID проекта (для совместимости)
    text?: string; // Текст заметки (для совместимости)
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface Project {
    id: string; // Генерируется UUID
    name: string;
    client: string;
    address: string;
    status: ProjectStatus;
    scratchpad?: string;
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface Task {
    id: string; // Генерируется UUID
    title: string;
    description?: string; // Описание задачи
    projectId: string | null;
    isCompleted: boolean;
    priority: TaskPriority;
    tags: string[];
    dueDate: string | null; // ISO 8601 format
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface Item {
    id: string; // Генерируется UUID
    name: string;
    quantity: number;
    price: number;
    unit: string;
    image: string | null; // URL-адрес изображения
    type: ItemType;
}

export interface LibraryItem {
    id: string; // Генерируется UUID
    name: string;
    price: number;
    unit: string;
    category?: LibraryItemCategory;
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface CompanyProfile {
    name: string;
    details: string;
    logo: string | null; // URL-адрес изображения
}

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'completed';

export type ThemeMode = 'light' | 'dark';

export interface Estimate {
    id: string; // Генерируется UUID
    clientInfo: string;
    items: Item[];
    discount: number;
    discountType: 'percent' | 'fixed';
    tax: number;
    number: string; // Генерируется в формате 'ГГГГ-ННН', где ННН - порядковый номер для года
    date: string; // ISO 8601 format
    status: EstimateStatus;
    project_id: string | null;
    user_id: string; // ID пользователя
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface FinanceEntry {
    id: string; // Генерируется UUID
    projectId: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string; // ISO 8601 format
    category?: FinanceCategory;
    receipt_url?: string; // URL чека или изображения
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface PhotoReport {
    id: string; // Генерируется UUID
    projectId: string;
    title: string;
    // Доп. метаданные для группировки и фильтрации
    tags?: string[]; // Теги/категории (например: фундамент, стены, отделка)
    stage?: string; // Этап работ (свободный текст или ID этапа)
    photos: Array<{
        url: string;
        path: string;
        caption: string;
    }>; // Массив объектов с информацией о фотографиях
    date: string; // ISO 8601 format
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface Document {
    id: string; // Генерируется UUID
    projectId?: string;
    name: string;
    fileUrl: string; // URL to the stored file
    storagePath: string; // Путь к файлу в Supabase Storage
    date: string; // ISO 8601 format
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface WorkStage {
    id: string; // Генерируется UUID
    projectId: string;
    title: string;
    description: string;
    startDate: string; // ISO 8601 format
    endDate?: string; // ISO 8601 format
    status: WorkStageStatus;
    progress: number; // Прогресс в процентах от 0 до 100
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}


export interface InventoryItem {
    id: string; // Генерируется UUID
    name: string;
    category: string;
    status: 'available' | 'in_use' | 'maintenance' | 'retired';
    location?: string;
    notes?: string;
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface InventoryNote {
    id: string; // Генерируется UUID
    toolId: string;
    text: string;
    date: string; // ISO 8601 format
}

export interface CalculationResults {
    subtotal: number;
    materialsTotal: number;
    workTotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
}

// Modal Props
export interface SettingsModalProps {
    onClose: () => void;
    profile: CompanyProfile;
    onProfileChange: (field: keyof CompanyProfile, value: string) => void;
    onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveLogo: () => void;
    onSave: () => void;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    onLogout: () => void;
}

export type EstimateTemplate = {
  id: string; // Уникальный ID для шаблона
  name: string; // Название сметы
  items: Item[];
  discount: number;
  discountType: 'percent' | 'fixed';
  tax: number;
  lastModified: number;
};

export interface EstimatesListModalProps {
    onClose: () => void;
    estimates: Estimate[];
    templates: EstimateTemplate[];
    activeEstimateId: string | null;
    statusMap: Record<EstimateStatus, { text: string; color: string; textColor: string; }>;
    formatCurrency: (value: number) => string;
    onLoadEstimate: (id: string) => void;
    onDeleteEstimate: (id: string) => void;
    onStatusChange: (id: string, status: EstimateStatus) => void;
    onSaveAsTemplate: (id: string) => void;
    onDeleteTemplate: (templateId: string) => void;
    onNewEstimate: (template?: EstimateTemplate) => void;
    onCopyToProject?: (id: string) => void;
    isFromProject?: boolean;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
}

export interface LibraryModalProps {
    onClose: () => void;
    libraryItems: LibraryItem[];
    onAddLibraryItem: (item: Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onUpdateLibraryItem: (id: string, item: Partial<Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    onDeleteLibraryItem: (id: string) => void;
    onAddItemToEstimate: (item: LibraryItem) => void;
    formatCurrency: (value: number) => string;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    showConfirm: (message: string, callback: (ok: boolean) => void) => void;
    showAlert: (message: string) => void;
}

export interface NewProjectModalProps {
    project: Partial<Project> | null;
    onClose: () => void;
    onProjectChange: (project: Partial<Project> | null) => void;
    onSave: () => void;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
}

export interface FinanceEntryModalProps {
    onClose: () => void;
    onSave: (entry: Omit<FinanceEntry, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>, receiptFile?: File) => void;
    showAlert: (message: string) => void;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    initial?: FinanceEntry; // для режима редактирования
}

export interface ImageViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    title: string;
    alt?: string;
}

export interface PhotoReportModalProps {
    onClose: () => void;
    onSave: (photoReport: {
        id: string;
        title: string;
        tags?: string[];
        stage?: string;
        photos: Array<{
            url: string;
            path: string;
            caption: string;
        }>;
        date: string;
    }) => void;
    showAlert: (message: string) => void;
    projectId: string; // ID проекта для фотоотчета
    workStages?: WorkStage[]; // Этапы проекта для селектора
}

export interface PhotoViewerModalProps {
    photo: PhotoReport;
    onClose: () => void;
    onDelete: (id: string) => void;
}

export interface ShoppingListModalProps {
    items: Item[];
    onClose: () => void;
    showAlert: (message: string) => void;
}

export interface DocumentUploadModalProps {
    onClose: () => void;
    onSave: (name: string, fileUrl: string) => void;
    showAlert: (message: string) => void;
    projectId?: string | null; // ID проекта (null для глобальных документов)
}

export interface WorkStageModalProps {
    stage: Partial<WorkStage> | null;
    onClose: () => void;
    onSave: (stage: Omit<WorkStage, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => void;
    showAlert: (message: string) => void;
}

export interface NoteModalProps {
    note: Partial<Note> | null;
    onClose: () => void;
    onSave: (text: string) => void;
    showAlert: (message: string) => void;
}

export interface ActGenerationModalProps {
    onClose: () => void;
    project: Project;
    profile: CompanyProfile;
    totalAmount: number;
    workStages: WorkStage[];
    showAlert: (message: string) => void;
}

export interface AISuggestModalProps {
    onClose: () => void;
    onAddItems: (items: Omit<Item, 'id' | 'image' | 'type'>[]) => void;
    showAlert: (message: string) => void;
}

export interface AddToolModalProps {
    onClose: () => void;
    onSave: (tool: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>, imageFile?: File) => void;
    projects?: Project[];
}

export interface ToolDetailsModalProps {
    tool: Tool | null;
    onClose: () => void;
    onSave: (tool: Tool, imageFile?: File) => void;
    onDelete: (toolId: string) => void;
    projects: Project[];
}

export interface ConsumableDetailsModalProps {
    consumable: Consumable | null;
    onClose: () => void;
    onSave: (consumable: Consumable) => void;
    onDelete: (consumableId: string) => void;
    projects?: Project[];
}

// View Props
export interface EstimateViewProps {
    currentEstimateProjectId: string | null;
    handleBackToProject: () => void;
    clientInfo: string;
    setClientInfo: (value: string) => void;
    setIsDirty: (value: boolean) => void;
    handleThemeChange: () => void;
    themeIcon: () => React.ReactElement;
    themeMode: ThemeMode;
    onOpenLibraryModal: () => void;
    onOpenEstimatesListModal: () => void;
    onOpenSettingsModal: () => void;
    onOpenAISuggestModal: () => void;
    estimateNumber: string;
    setEstimateNumber: (value: string) => void;
    estimateDate: string;
    setEstimateDate: (value: string) => void;
    handleInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    items: Item[];
    dragItem: React.MutableRefObject<number | null>;
    dragOverItem: React.MutableRefObject<number | null>;
    handleDragSort: () => void;
    draggingItem: number | null;
    setDraggingItem: (value: number | null) => void;
    fileInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
    handleItemImageChange: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveItemImage: (id: string) => void;
    handleRemoveItem: (id: string) => void;
    handleItemChange: (id: string, field: keyof Item, value: string | number) => void;
    formatCurrency: (value: number) => string;
    handleAddItem: () => void;
    discount: number;
    setDiscount: (value: number) => void;
    discountType: 'percent' | 'fixed';
    setDiscountType: (value: 'percent' | 'fixed') => void;
    tax: number;
    setTax: (value: number) => void;
    calculation: CalculationResults;
    handleSave: () => void;
    isDirty: boolean;
    isPdfLoading: boolean;
    isSaving: boolean;
    handleExportPDF: () => void;
    onNewEstimate: (template?: EstimateTemplate) => void;
}

export interface ProjectsListViewProps {
    handleOpenProjectModal: (project: Partial<Project> | null) => void;
    projectStatusFilter: ProjectStatus;
    setProjectStatusFilter: (value: ProjectStatus) => void;
    projectSearch: string;
    setProjectSearch: (value: string) => void;
    handleInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    filteredProjects: Project[];
    projects: Project[];
    setActiveProjectId: (value: string | null) => void;
    setActiveView: (value: string) => void;
}

export interface ProjectDetailViewProps {
    activeProject: Project;
    estimates: Estimate[];
    financeEntries: FinanceEntry[];
    photoReports: PhotoReport[];
    documents: Document[];
    workStages: WorkStage[];
    tasks: Task[];
    financials: ProjectFinancials;
    formatCurrency: (value: number) => string;
    statusMap: Record<EstimateStatus, { text: string; color: string; textColor: string; }>;
    setActiveView: (value: string) => void;
    setActiveProjectId: (value: string | null) => void;
    handleOpenProjectModal: (project: Partial<Project> | null) => void;
    handleDeleteProject: (id: string) => void;
    handleLoadEstimate: (id: string) => void;
    handleAddNewEstimateForProject: () => void;
    handleDeleteProjectEstimate: (id: string) => void;
    onOpenFinanceModal: () => void;
    onDeleteFinanceEntry: (id: string) => void;
    onOpenPhotoReportModal: () => void;
    onViewPhoto: (photo: PhotoReport) => void;
    onOpenDocumentModal: () => void;
    onDeleteDocument: (id: string) => void;
    onOpenWorkStageModal: (stage: Partial<WorkStage> | null) => void;
    onDeleteWorkStage: (id: string) => void;
    onOpenNoteModal: (note: Partial<Note> | null) => void;
    onDeleteNote: (id: string) => void;
    onOpenActModal: (total: number) => void;
    onNavigateToTasks: () => void;
    onProjectScratchpadChange: (projectId: string, content: string) => void;
    onExportWorkSchedulePDF: (project: Project, workStages: WorkStage[]) => void;
    onExportProjectFinancesPDF?: (project: Project, financeEntries: FinanceEntry[]) => void;
    onOpenEstimatesListModal: (data?: any) => void;
    notesHook: {
        getNote: (context: NoteContext, entityId?: string | null) => string;
        saveNote: (context: NoteContext, content: string, entityId?: string | null) => Promise<void>;
    };
    tasksHook: {
        tasks: Task[];
        addTask: (taskData: { title: string; projectId?: string | null; priority?: 'low' | 'medium' | 'high' | 'urgent'; tags?: string[]; dueDate?: string | null }) => Promise<Task | null>;
        updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
        deleteTask: (taskId: string) => Promise<boolean>;
        toggleTask: (taskId: string) => Promise<Task | null>;
        getTasksByProject: (projectId: string | null) => Task[];
        getGeneralTasks: () => Task[];
        loading: boolean;
        error: string | null;
        fetchAllTasks: (session: any) => Promise<void>;
        clearError: () => void;
    };
    appState: {
        openModal: (modalType: string, data?: any) => void;
        closeModal: (modalType: string) => void;
    };
    projectDataHook?: {
        loadProjectData: (projectId: string) => Promise<void>;
        financeEntries: FinanceEntry[];
        workStages: WorkStage[];
        addFinanceEntry: (projectId: string, entryData: Omit<FinanceEntry, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>, receiptFile?: File) => Promise<FinanceEntry>;
        updateFinanceEntry: (id: string, updates: Partial<FinanceEntry>, receiptFile?: File) => Promise<void>;
        deleteFinanceEntry: (id: string) => Promise<void>;
        getFinanceEntriesByProject: (projectId: string) => FinanceEntry[];
        addWorkStage: (projectId: string, stageData: Omit<WorkStage, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => Promise<WorkStage>;
        updateWorkStage: (id: string, updates: Partial<WorkStage>) => Promise<void>;
        deleteWorkStage: (id: string) => Promise<void>;
        getWorkStagesByProject: (projectId: string) => WorkStage[];
        calculateProjectFinancials: (projectId: string, estimates: any[]) => ProjectFinancials;
        loading: boolean;
        error: string | null;
    };
}

export interface InventoryViewProps {
    tools: Tool[];
    projects: Project[];
    onToolClick: (tool: Tool) => void;
    onUpdateTool: (tool: Tool) => void;
    onOpenAddToolModal: () => void;
}

export interface ReportsViewProps {
    projects: Project[];
    estimates: Estimate[];
    financeEntries: FinanceEntry[];
    formatCurrency: (value: number) => string;
    setActiveView: (value: string) => void;
}

export interface WorkspaceViewProps {
    scratchpad: string;
    globalDocuments: Document[];
    onScratchpadChange: (text: string) => void;
    onOpenGlobalDocumentModal: () => void;
    onDeleteGlobalDocument: (id: string) => void;
    onOpenScratchpad: () => void;
    notesHook: {
        getNote: (context: NoteContext, entityId?: string | null) => string;
        saveNote: (context: NoteContext, content: string, entityId?: string | null) => Promise<void>;
    };
}

export interface ScratchpadViewProps {
    content: string;
    onSave: (text: string) => void;
    onBack: () => void;
}

declare global {
    interface Window {
        Telegram?: TelegramWebApp;
    }
}

export interface TelegramWebApp {
    initData: string;
    initDataUnsafe: any;
    version: string;
    platform: string;
    colorScheme: 'light' | 'dark';
    themeParams: any;
    isExpanded: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
    headerColor: string;
    backgroundColor: string;
    isClosingConfirmationEnabled: boolean;
    BackButton: any;
    MainButton: any;
    HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
    };
    ready: () => void;
    expand: () => void;
    close: () => void;
    sendData: (data: string) => void;
    enableClosingConfirmation: () => void;
    disableClosingConfirmation: () => void;
    disableVerticalSwipes: () => void;
}
