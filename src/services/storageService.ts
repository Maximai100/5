import { 
    Project, Estimate, FinanceEntry, PhotoReport, Document, WorkStage, Note, 
    InventoryItem, InventoryNote, Task, Tool, Consumable, LibraryItem, CompanyProfile 
} from '../types';

// Storage keys
const STORAGE_KEYS = {
    PROJECTS: 'projects',
    ESTIMATES: 'estimates',
    FINANCE_ENTRIES: 'financeEntries',
    PHOTO_REPORTS: 'photoReports',
    DOCUMENTS: 'documents',
    WORK_STAGES: 'workStages',
    NOTES: 'notes',
    INVENTORY_ITEMS: 'inventoryItems',
    INVENTORY_NOTES: 'inventoryNotes',
    TASKS: 'tasks',
    TOOLS: 'tools',
    CONSUMABLES: 'consumables',
    LIBRARY_ITEMS: 'libraryItems',
    COMPANY_PROFILE: 'companyProfile',
    SCRATCHPAD: 'scratchpad',
    GLOBAL_DOCUMENTS: 'globalDocuments',
    ACTIVE_ESTIMATE_ID: 'activeEstimateId',
    ACTIVE_PROJECT_ID: 'activeProjectId',
    ACTIVE_VIEW: 'activeView',
    THEME_MODE: 'themeMode',
    PROJECT_STATUS_FILTER: 'projectStatusFilter',
    ESTIMATE_TEMPLATES: 'estimateTemplates',
    CALCULATOR_STATE: 'calculatorState'
} as const;

// Кеш для быстрого доступа к данным
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// TTL для кеша (в миллисекундах)
const CACHE_TTL = {
    ESTIMATES: 30000, // 30 секунд
    PROJECTS: 60000,  // 1 минута
    FINANCE: 30000,   // 30 секунд
    DEFAULT: 15000    // 15 секунд
};

// Функция для получения данных из кеша
const getFromCache = <T>(key: string, defaultValue: T): T | null => {
    const cached = dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
    }
    if (cached) {
        dataCache.delete(key);
    }
    return null;
};

// Функция для сохранения данных в кеш
const setToCache = (key: string, data: any, ttl: number = CACHE_TTL.DEFAULT) => {
    dataCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
    });
};

// Функция для очистки кеша
const clearCache = (key?: string) => {
    if (key) {
        dataCache.delete(key);
    } else {
        dataCache.clear();
    }
};

// Generic storage functions
export const storageService = {
    // Get data from localStorage with fallback
    get<T>(key: string, defaultValue: T): T {
        try {
            const item = localStorage.getItem(key);
            if (!item) {
                return defaultValue;
            }
            
            // Для строковых значений (например, themeMode) проверяем, что это валидный JSON
            if (typeof defaultValue === 'string') {
                try {
                    const parsed = JSON.parse(item);
                    return typeof parsed === 'string' ? (parsed as T) : defaultValue;
                } catch {
                    // Если не удается распарсить как JSON, но это строка, возвращаем как есть
                    return item as T;
                }
            }
            
            return JSON.parse(item);
        } catch (error) {
            console.error(`Error reading from localStorage key "${key}":`, error);
            // Очищаем некорректное значение
            localStorage.removeItem(key);
            return defaultValue;
        }
    },

    // Set data to localStorage
    set<T>(key: string, value: T): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            // Также сохраняем в кеш для быстрого доступа
            setToCache(key, value);
        } catch (error) {
            console.error(`Error writing to localStorage key "${key}":`, error);
        }
    },
    
    // Get data with cache fallback
    getCached<T>(key: string, defaultValue: T): T {
        // Сначала проверяем кеш
        const cached = getFromCache(key, defaultValue);
        if (cached !== null) {
            return cached;
        }
        
        // Если нет в кеше, получаем из localStorage
        const result = this.get(key, defaultValue);
        
        // Сохраняем в кеш
        setToCache(key, result);
        
        return result;
    },
    
    // Clear cache
    clearCache: clearCache,

    // Remove data from localStorage
    remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing from localStorage key "${key}":`, error);
        }
    },

    // Clear all app data
    clear(): void {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    },

    // Export all data as JSON
    exportData(): string {
        try {
            const data: Record<string, any> = {};
            Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
                const value = localStorage.getItem(key);
                if (value) {
                    data[name] = JSON.parse(value);
                }
            });
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Error exporting data:', error);
            throw new Error('Не удалось экспортировать данные');
        }
    },

    // Import data from JSON
    importData(jsonData: string): void {
        try {
            const data = JSON.parse(jsonData);
            Object.entries(data).forEach(([name, value]) => {
                const key = STORAGE_KEYS[name as keyof typeof STORAGE_KEYS];
                if (key) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            });
        } catch (error) {
            console.error('Error importing data:', error);
            throw new Error('Не удалось импортировать данные. Проверьте формат файла.');
        }
    }
};

// Specific data accessors
export const dataService = {
    // Projects
    getProjects(): Project[] {
        return storageService.get(STORAGE_KEYS.PROJECTS, []);
    },

    setProjects(projects: Project[]): void {
        storageService.set(STORAGE_KEYS.PROJECTS, projects);
    },

    // Estimates
    getEstimates(): Estimate[] {
        return storageService.get(STORAGE_KEYS.ESTIMATES, []);
    },

    setEstimates(estimates: Estimate[]): void {
        storageService.set(STORAGE_KEYS.ESTIMATES, estimates);
    },

    // Finance Entries
    getFinanceEntries(): FinanceEntry[] {
        return storageService.get(STORAGE_KEYS.FINANCE_ENTRIES, []);
    },

    setFinanceEntries(entries: FinanceEntry[]): void {
        storageService.set(STORAGE_KEYS.FINANCE_ENTRIES, entries);
    },

    // Photo Reports
    getPhotoReports(): PhotoReport[] {
        return storageService.get(STORAGE_KEYS.PHOTO_REPORTS, []);
    },

    setPhotoReports(reports: PhotoReport[]): void {
        storageService.set(STORAGE_KEYS.PHOTO_REPORTS, reports);
    },

    // Documents
    getDocuments(): Document[] {
        return storageService.get(STORAGE_KEYS.DOCUMENTS, []);
    },

    setDocuments(documents: Document[]): void {
        storageService.set(STORAGE_KEYS.DOCUMENTS, documents);
    },

    // Work Stages
    getWorkStages(): WorkStage[] {
        return storageService.get(STORAGE_KEYS.WORK_STAGES, []);
    },

    setWorkStages(stages: WorkStage[]): void {
        storageService.set(STORAGE_KEYS.WORK_STAGES, stages);
    },

    // Notes
    getNotes(): Note[] {
        return storageService.get(STORAGE_KEYS.NOTES, []);
    },

    setNotes(notes: Note[]): void {
        storageService.set(STORAGE_KEYS.NOTES, notes);
    },

    // Inventory Items
    getInventoryItems(): InventoryItem[] {
        return storageService.get(STORAGE_KEYS.INVENTORY_ITEMS, []);
    },

    setInventoryItems(items: InventoryItem[]): void {
        storageService.set(STORAGE_KEYS.INVENTORY_ITEMS, items);
    },

    // Inventory Notes
    getInventoryNotes(): InventoryNote[] {
        return storageService.get(STORAGE_KEYS.INVENTORY_NOTES, []);
    },

    setInventoryNotes(notes: InventoryNote[]): void {
        storageService.set(STORAGE_KEYS.INVENTORY_NOTES, notes);
    },

    // Tasks
    getTasks(): Task[] {
        return storageService.get(STORAGE_KEYS.TASKS, []);
    },

    setTasks(tasks: Task[]): void {
        storageService.set(STORAGE_KEYS.TASKS, tasks);
    },

    // Tools
    getTools(): Tool[] {
        return storageService.get(STORAGE_KEYS.TOOLS, []);
    },

    setTools(tools: Tool[]): void {
        storageService.set(STORAGE_KEYS.TOOLS, tools);
    },

    // Consumables
    getConsumables(): Consumable[] {
        return storageService.get(STORAGE_KEYS.CONSUMABLES, []);
    },

    setConsumables(consumables: Consumable[]): void {
        storageService.set(STORAGE_KEYS.CONSUMABLES, consumables);
    },

    // Library Items
    getLibraryItems(): LibraryItem[] {
        return storageService.get(STORAGE_KEYS.LIBRARY_ITEMS, []);
    },

    setLibraryItems(items: LibraryItem[]): void {
        storageService.set(STORAGE_KEYS.LIBRARY_ITEMS, items);
    },

    // Company Profile
    getCompanyProfile(): CompanyProfile {
        return storageService.get(STORAGE_KEYS.COMPANY_PROFILE, {
            name: '',
            details: '',
            logo: null
        });
    },

    setCompanyProfile(profile: CompanyProfile): void {
        storageService.set(STORAGE_KEYS.COMPANY_PROFILE, profile);
    },

    // Scratchpad
    getScratchpad(): string {
        return storageService.get(STORAGE_KEYS.SCRATCHPAD, '');
    },

    setScratchpad(content: string): void {
        storageService.set(STORAGE_KEYS.SCRATCHPAD, content);
    },

    // Global Documents
    getGlobalDocuments(): Document[] {
        return storageService.get(STORAGE_KEYS.GLOBAL_DOCUMENTS, []);
    },

    setGlobalDocuments(documents: Document[]): void {
        storageService.set(STORAGE_KEYS.GLOBAL_DOCUMENTS, documents);
    },

    // App State
    getActiveEstimateId(): string | null {
        return storageService.get(STORAGE_KEYS.ACTIVE_ESTIMATE_ID, null);
    },

    setActiveEstimateId(id: string | null): void {
        storageService.set(STORAGE_KEYS.ACTIVE_ESTIMATE_ID, id);
    },

    getActiveProjectId(): string | null {
        return storageService.get(STORAGE_KEYS.ACTIVE_PROJECT_ID, null);
    },

    setActiveProjectId(id: string | null): void {
        storageService.set(STORAGE_KEYS.ACTIVE_PROJECT_ID, id);
    },

    getActiveView(): string {
        return storageService.get(STORAGE_KEYS.ACTIVE_VIEW, 'workspace');
    },

    setActiveView(view: string): void {
        storageService.set(STORAGE_KEYS.ACTIVE_VIEW, view);
    },

    getThemeMode(): 'light' | 'dark' {
        // По умолчанию — тёмная тема
        return storageService.get(STORAGE_KEYS.THEME_MODE, 'dark');
    },

    setThemeMode(mode: 'light' | 'dark'): void {
        storageService.set(STORAGE_KEYS.THEME_MODE, mode);
    },

    getProjectStatusFilter(): 'all' | 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' {
        return storageService.get(STORAGE_KEYS.PROJECT_STATUS_FILTER, 'all');
    },

    setProjectStatusFilter(filter: 'all' | 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'): void {
        storageService.set(STORAGE_KEYS.PROJECT_STATUS_FILTER, filter);
    },

    // Estimate Templates
    getEstimateTemplates(): Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId' | 'createdAt' | 'updatedAt'>[] {
        return storageService.get(STORAGE_KEYS.ESTIMATE_TEMPLATES, []);
    },

    setEstimateTemplates(templates: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId' | 'createdAt' | 'updatedAt'>[]): void {
        storageService.set(STORAGE_KEYS.ESTIMATE_TEMPLATES, templates);
    },

    // Calculator State
    getCalculatorState(): { step: number; activeRoomId: number; rooms: any[] } {
        const defaultState = { step: 1, activeRoomId: 0, rooms: [] };
        const savedState = storageService.get(STORAGE_KEYS.CALCULATOR_STATE, defaultState);
        
        // Ensure all required properties exist (for backward compatibility)
        return {
            step: savedState.step || defaultState.step,
            activeRoomId: savedState.activeRoomId || defaultState.activeRoomId,
            rooms: Array.isArray(savedState.rooms) ? savedState.rooms : defaultState.rooms
        };
    },

    setCalculatorState(state: { step: number; activeRoomId: number; rooms: any[] }): void {
        storageService.set(STORAGE_KEYS.CALCULATOR_STATE, state);
    }
};

// Utility functions for data operations
export const dataUtils = {
    // Generate new ID
    generateId(): string {
        return crypto.randomUUID();
    },

    // Get current timestamp
    getCurrentTimestamp(): string {
        return new Date().toISOString();
    },

    // Update timestamps for entity
    updateTimestamps<T extends { updatedAt: string }>(entity: T): T {
        return {
            ...entity,
            updatedAt: this.getCurrentTimestamp()
        };
    },

    // Create new entity with timestamps
    createEntity<T extends { id: string; createdAt: string; updatedAt: string }>(
        data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
    ): T {
        const now = this.getCurrentTimestamp();
        return {
            ...data,
            id: this.generateId(),
            createdAt: now,
            updatedAt: now
        } as T;
    }
};
