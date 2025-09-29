
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { dataService } from '../../services/storageService';
import { useEstimates } from '../../hooks/useEstimates';
import { useProjectContext } from '../../context/ProjectContext';
import { supabase } from '../../supabaseClient';
import { copyToClipboard, tg } from '../../utils';
import type { Session } from '@supabase/supabase-js';
import { ProjectSelectionModal } from '../modals/ProjectSelectionModal';
import { EstimateNameModal } from '../modals/EstimateNameModal';

declare global {
    interface Window {
        jspdf: {
            jsPDF: typeof jsPDF;
        }
    }
}


/**
 * Safely shows an alert. Falls back to browser's alert if Telegram API is unavailable or outdated.
 * @param message The message to display.
 * @param callback Optional callback to be executed after the alert is closed.
 */
const safeShowAlert = (message: string, callback?: () => void) => {
    alert(message);
    if (callback) {
        callback();
    }
};

/**
 * Safely shows a confirmation dialog. Falls back to browser's confirm if Telegram API is unavailable or outdated.
 * @param message The message to display.
 * @param callback Callback to be executed with the result (true for OK, false for Cancel).
 */
const safeShowConfirm = (message: string, callback: (ok: boolean) => void) => {
    callback(window.confirm(message));
};

// --- ICON COMPONENTS ---
const Icon = ({ children, className = '', ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => <div className={`icon-wrapper ${className}`} {...props}>{children}</div>;
const IconPlus = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></Icon>;
const IconClose = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></Icon>;
const IconTrash = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></Icon>;
const IconChevronRight = (props: React.HTMLAttributes<HTMLDivElement>) => <Icon {...props}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></Icon>;
const IconSun = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg></Icon>;
const IconMoon = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></Icon>;
const IconImage = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></Icon>;
const IconSave = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg></Icon>;
const IconFolderOpen = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></Icon>;
const IconPdf = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M10.29 15.71c.24-.24.44-.53.6-.86s.24-.71.24-1.13c0-.42-.08-.79-.24-1.11s-.36-.58-.6-.8c-.24-.22-.53-.39-.86-.51s-.71-.18-1.12-.18c-.48 0-.91.07-1.29.2s-.7.3-1.01.52c-.31.22-.56.49-.75.81s-.29.69-.29 1.1c0 .51.12.95.35 1.33s.53.69.9.91c.37.22.78.33 1.22.33.53 0 1.01-.11 1.44-.34s.78-.54 1.05-.94zM8.3 15.3v-3.68h1.12c.31 0 .58.04.81.13s.42.22.58.4c.16.18.28.39.36.64s.12.52.12.81c0 .28-.04.54-.12.78s-.2.46-.36.64c-.16.18-.35.32-.58.42s-.49.16-.81.16H8.3z"></path></svg></Icon>;
const IconLibrary = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 14.5V4.5A2.5 2.5 0 0 1 6.5 2z"></path></svg></Icon>;
const IconClipboard = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg></Icon>;

type ThemeMode = 'light' | 'dark';

// --- START OF CALCULATOR DATA TYPES & UTILS ---

type Unit = 'm' | 'cm';
const conversionFactors: Record<Unit, number> = { m: 1, cm: 100 };

const convertToMeters = (value: string, fromUnit: Unit): number => {
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num)) return 0;
    return num / conversionFactors[fromUnit];
};


interface Opening {
    id: number;
    width: string;
    height: string;
    count: string;
    type: 'window' | 'door';
    sillHeight?: string;
    includeSillArea?: boolean;
}

interface ExclusionZone {
    id: number;
    name: string;
    width: string;
    height: string;
    count: string;
    affectsWallArea: boolean;
    affectsPerimeter: boolean;
}

interface GeometricElement {
    id: number;
    type: 'niche' | 'protrusion' | 'column';
    width: string;   // For rectangle
    depth: string;   // For rectangle
    diameter: string; // For cylinder
    height: string;
    count: string;
}

interface RoomData {
    id: number;
    name: string;
    length: string;
    width: string;
    height: string;
    openings: Opening[];
    exclusions: ExclusionZone[];
    geometricElements: GeometricElement[];
    unit: Unit;
}

interface SavedEstimate {
    id: number;
    name: string;
    date: string;
    rooms: RoomData[];
}

interface MaterialResult {
    quantity: string;
    cost: number;
    unit?: string; // Добавляем единицу измерения
    details: Record<string, string>;
    isGroup?: boolean;
    items?: {
        name: string;
        quantity: string;
        cost: number;
        unit?: string; // Добавляем единицу измерения для элементов группы
    }[];
    showNote: boolean;
    text: string;
}
type MaterialCategory = 'plaster' | 'putty' | 'paint' | 'wallpaper' | 'tile' | 'flooring' | 'screed' | 'skirting' | 'drywall' | 'arbitrary';

interface SavedMaterial {
    id: number;
    name: string;
    category: MaterialCategory;
    params: Record<string, string>;
}

interface MaterialCalculatorProps {
    onResultChange: (name: string, result: MaterialResult | null) => void;
    name: string;
    materials: SavedMaterial[];
}

interface ArbitraryMaterialCalculatorProps {
    onResultChange: (name: string, result: MaterialResult | null) => void;
    name: string;
    materials: SavedMaterial[];
    onSaveMaterial: (material: Omit<SavedMaterial, 'id'>) => void;
}

const MATERIAL_ORDER = [
    'Черновая штукатурка (Стены)', 'Черновая штукатурка (Потолок)',
    'Финишная шпаклевка (Стены)', 'Финишная шпаклевка (Потолок)',
    'Гипсокартон (Каркас)', 'Краска / Грунтовка', 'Обои', 'Плитка',
    'Ламинат / Напольные покрытия', 'Стяжка / Наливной пол', 'Плинтус',
    'Произвольные материалы'
];

const calculateRoomMetrics = (room: RoomData) => {
    const lengthM = convertToMeters(room.length, room.unit);
    const widthM = convertToMeters(room.width, room.unit);
    const heightM = convertToMeters(room.height, room.unit);
    const floorArea = lengthM * widthM;
    const perimeter = (lengthM + widthM) * 2;
    const grossWallArea = perimeter * heightM;

    const modifiedTotalOpeningsArea = room.openings.reduce((sum, op) => {
        const w = convertToMeters(op.width, room.unit);
        const h = convertToMeters(op.height, room.unit);
        const count = parseInt(op.count.replace(',', '.'), 10) || 0;
        if (op.type === 'window' && op.includeSillArea && op.sillHeight) {
            const sillH = convertToMeters(op.sillHeight, room.unit);
            return sum + w * Math.max(0, h - sillH) * count;
        }
        return sum + w * h * count;
    }, 0);

    const totalOpeningsArea = room.openings.reduce((sum, op) => {
        const w = convertToMeters(op.width, room.unit);
        const h = convertToMeters(op.height, room.unit);
        return sum + w * h * (parseInt(op.count.replace(',', '.'), 10) || 0);
    }, 0);
    
    const totalExclusionWallArea = room.exclusions
        .filter(ex => ex.affectsWallArea)
        .reduce((sum, ex) => {
            const w = convertToMeters(ex.width, room.unit);
            const h = convertToMeters(ex.height, room.unit);
            return sum + w * h * (parseInt(ex.count.replace(',', '.'), 10) || 0);
        }, 0);

    const totalExclusionPerimeterLength = room.exclusions
        .filter(ex => ex.affectsPerimeter)
        .reduce((sum, ex) => {
            const w = convertToMeters(ex.width, room.unit);
            return sum + w * (parseInt(ex.count.replace(',', '.'), 10) || 0);
        }, 0);

    let adjustedFloorArea = floorArea;
    let adjustedPerimeter = perimeter;
    let adjustedNetWallArea = grossWallArea - modifiedTotalOpeningsArea - totalExclusionWallArea;

    let geometryWallAreaChange = 0;
    room.geometricElements.forEach(el => {
        const count = parseInt(el.count.replace(',', '.'), 10) || 0;
        if (count === 0) return;
        const h = convertToMeters(el.height, room.unit);
        let areaChange = 0;

        if (el.type === 'column') {
            const diameter = convertToMeters(el.diameter, room.unit);
            if (diameter > 0) {
                areaChange = (Math.PI * diameter * h) * count;
                adjustedPerimeter += (Math.PI * diameter) * count;
                const radius = diameter / 2;
                adjustedFloorArea -= (Math.PI * radius * radius) * count;
            }
        } else { // Niche or Protrusion
            const width = convertToMeters(el.width, room.unit);
            const depth = convertToMeters(el.depth, room.unit);
            if (width > 0 && depth > 0) {
                if (el.type === 'niche') {
                    areaChange = (width * h + 2 * depth * h) * count;
                    adjustedPerimeter += (2 * depth) * count;
                } else { // Protrusion
                    areaChange = (2 * depth * h) * count;
                    adjustedPerimeter += (2 * depth) * count;
                }
            }
        }
        adjustedNetWallArea += areaChange;
        geometryWallAreaChange += areaChange;
    });

    const netWallArea = Math.max(0, adjustedNetWallArea);
    const finalPerimeter = Math.max(0, adjustedPerimeter);
    const finalFloorArea = Math.max(0, adjustedFloorArea);

    const totalDoorWidth = room.openings.filter(op => op.type === 'door').reduce((sum, op) => {
        const w = convertToMeters(op.width, room.unit);
        return sum + w * (parseInt(op.count.replace(',', '.'), 10) || 0);
    }, 0);
    return { 
        floorArea: finalFloorArea, 
        perimeter: finalPerimeter, 
        grossWallArea, 
        totalOpeningsArea, 
        netWallArea, 
        totalDoorWidth, 
        height: heightM, 
        totalExclusionPerimeterLength,
        totalExclusionWallArea,
        geometryWallAreaChange
    };
};

// --- START OF UI COMPONENTS ---

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="tooltip-container">
        <span className="tooltip-icon">i</span>
        <div className="tooltip-text">{text}</div>
    </div>
);


const CalcInput = React.forwardRef<
    HTMLInputElement,
    {
        label: string;
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        id: string;
        unit?: string;
        error?: string;
        tooltip?: string;
        type?: 'number' | 'text';
    } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>
>(({ label, value, onChange, id, unit, error, tooltip, type = 'number', ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (type === 'number') {
            e.target.value = e.target.value.replace(/,/, '.');
        }
        onChange(e);
    };
    
    const displayUnit = unit === 'm' ? 'м' : unit === 'cm' ? 'см' : unit;
    
    return (
        <div className="calc-input-group">
            <div className="calc-label-wrapper">
                 <label htmlFor={id}>{label}</label>
                 {tooltip && <Tooltip text={tooltip} />}
            </div>
            <div className="calc-input-wrapper">
                <input
                    ref={ref}
                    id={id}
                    type={type}
                    value={value}
                    onChange={handleChange}
                    min={type === 'number' ? "0" : undefined}
                    step={type === 'number' ? (props.step || "0.01") : undefined}
                    className={error ? 'invalid' : ''}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                    {...props}
                />
                {unit && <span className="calc-input-unit">{displayUnit}</span>}
            </div>
            <p id={`${id}-error`} className="error-message">{error || ''}</p>
        </div>
    );
});


// Custom hook for bag-based material calculations
const useBagCalculation = (
    area: number,
    initialThickness: string,
    initialConsumption: string,
    initialBagWeight: string,
    initialMargin: string,
    initialPrice: string
) => {
    const [thickness, setThickness] = useState(initialThickness);
    const [consumption, setConsumption] = useState(initialConsumption);
    const [bagWeight, setBagWeight] = useState(initialBagWeight);
    const [margin, setMargin] = useState(initialMargin);
    const [price, setPrice] = useState(initialPrice);

    const result = useMemo(() => {
        const nArea = area || 0;
        const nThickness = parseFloat(thickness.replace(',', '.')) || 0;
        const nConsumption = parseFloat(consumption.replace(',', '.')) || 0;
        const nBagWeight = parseFloat(bagWeight.replace(',', '.')) || 1;
        const nMargin = parseFloat(margin.replace(',', '.')) || 0;
        const nPrice = parseFloat(price.replace(',', '.')) || 0;

        if (nArea === 0 || nBagWeight === 0) return null;

        const totalWeight = nArea * nThickness * nConsumption * (1 + nMargin / 100);
        const bags = Math.ceil(totalWeight / nBagWeight);

        if (bags === 0) return null;

        const totalCost = bags * nPrice;
        
        const quantityText = `${totalWeight.toFixed(2)} кг (≈ ${bags} меш.)`;
        const costText = nPrice > 0 ? ` - ${totalCost.toFixed(2)} ₽` : '';

        return {
            quantity: quantityText,
            cost: totalCost,
            unit: 'меш.', // Изменяем на упаковочную единицу
            details: {
                "Количество": quantityText,
                "Стоимость": `${totalCost.toFixed(2)} ₽`,
                "Цена за мешок": `${nPrice.toFixed(2)} ₽`,
                "Всего мешков": `${bags} шт.`
            },
            showNote: bags > 0,
            text: quantityText + costText,
        };
    }, [area, thickness, consumption, bagWeight, margin, price]);

    return {
        thickness, setThickness,
        consumption, setConsumption,
        bagWeight, setBagWeight,
        margin, setMargin,
        price, setPrice,
        result
    };
};


// --- START OF MATERIAL CALCULATOR COMPONENTS ---

const PlasterCalculator: React.FC<{ area: number } & MaterialCalculatorProps> = ({ area, name, onResultChange, materials }) => {
    const {
        thickness, setThickness,
        consumption, setConsumption,
        bagWeight, setBagWeight,
        margin, setMargin,
        price, setPrice,
        result
    } = useBagCalculation(area, '10', '1.2', '30', '10', '0');
    
    useEffect(() => { onResultChange(name, result); }, [result, name, onResultChange]);

    const handleMaterialSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const matId = parseInt(e.target.value, 10);
        if (!matId) return;
        const material = materials.find(m => m.id === matId);
        if (material) {
            setThickness(material.params.thickness || '10');
            setConsumption(material.params.consumption || '1.2');
            setBagWeight(material.params.bagWeight || '30');
            setPrice(material.params.price || '0');
        }
    };

    return (
        <div className="card material-calculator-card">
            <h4>{name}</h4>
            <div className="library-select-group">
                <label htmlFor={`${name}-library`}>Выбрать из библиотеки</label>
                <select id={`${name}-library`} onChange={handleMaterialSelect}>
                    <option value="">Свой материал</option>
                    {materials.filter(m=>m.category === 'plaster').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <CalcInput id={`${name}-thickness`} label="Средняя толщина слоя" unit="мм" value={thickness} onChange={e => setThickness(e.target.value)} />
            <CalcInput id={`${name}-consumption`} label="Расход смеси на 1мм/м²" unit="кг" value={consumption} onChange={e => setConsumption(e.target.value)} tooltip="Расход указывается на упаковке материала" />
            <CalcInput id={`${name}-bagweight`} label="Вес мешка" unit="кг" value={bagWeight} onChange={e => setBagWeight(e.target.value)} />
            <CalcInput id={`${name}-margin`} label="Запас" unit="%" value={margin} onChange={e => setMargin(e.target.value)} />
            <CalcInput id={`${name}-price`} label="Цена за мешок" unit="₽" value={price} onChange={e => setPrice(e.target.value)} />
            {result && (
                <>
                    <div className="calc-result"><strong>{result?.text}</strong></div>
                    {result?.showNote && <p className="calc-note">Кол-во мешков округлено в большую сторону</p>}
                </>
            )}
        </div>
    );
};

const PuttyCalculator: React.FC<{ area: number } & MaterialCalculatorProps> = ({ area, name, onResultChange, materials }) => {
    const {
        thickness, setThickness,
        consumption, setConsumption,
        bagWeight, setBagWeight,
        margin, setMargin,
        price, setPrice,
        result
    } = useBagCalculation(area, '1.5', '1.1', '25', '10', '0');

    useEffect(() => { onResultChange(name, result); }, [result, name, onResultChange]);
    
    const handleMaterialSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const matId = parseInt(e.target.value, 10);
        if (!matId) return;
        const material = materials.find(m => m.id === matId);
        if (material) {
            setThickness(material.params.thickness || '1.5');
            setConsumption(material.params.consumption || '1.1');
            setBagWeight(material.params.bagWeight || '25');
            setPrice(material.params.price || '0');
        }
    };

    return (
        <div className="card material-calculator-card">
            <h4>{name}</h4>
            <div className="library-select-group">
                <label htmlFor={`${name}-library`}>Выбрать из библиотеки</label>
                <select id={`${name}-library`} onChange={handleMaterialSelect}>
                    <option value="">Свой материал</option>
                    {materials.filter(m=>m.category === 'putty').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <CalcInput id={`${name}-thickness`} label="Средняя толщина слоя" unit="мм" value={thickness} onChange={e => setThickness(e.target.value)} />
            <CalcInput id={`${name}-consumption`} label="Расход смеси на 1мм/м²" unit="кг" value={consumption} onChange={e => setConsumption(e.target.value)} tooltip="Расход указывается на упаковке материала" />
            <CalcInput id={`${name}-bagweight`} label="Вес мешка" unit="кг" value={bagWeight} onChange={e => setBagWeight(e.target.value)} />
            <CalcInput id={`${name}-margin`} label="Запас" unit="%" value={margin} onChange={e => setMargin(e.target.value)} />
            <CalcInput id={`${name}-price`} label="Цена за мешок" unit="₽" value={price} onChange={e => setPrice(e.target.value)} />
            {result && (
                <>
                    <div className="calc-result"><strong>{result?.text}</strong></div>
                    {result?.showNote && <p className="calc-note">Кол-во мешков округлено в большую сторону</p>}
                </>
            )}
        </div>
    );
};

const PaintCalculator: React.FC<{ wallArea: number, floorArea: number } & MaterialCalculatorProps> = ({ wallArea, floorArea, name, onResultChange, materials }) => {
    const [surface, setSurface] = useState<'walls' | 'ceiling'>('walls');
    const [consumption, setConsumption] = useState('0.15');
    const [layers, setLayers] = useState('2');
    const [volume, setVolume] = useState('5');
    const [margin, setMargin] = useState('10');
    const [price, setPrice] = useState('0');

    const result = useMemo(() => {
        const area = surface === 'walls' ? wallArea : floorArea;
        const nConsumption = parseFloat(consumption.replace(',', '.')) || 0;
        const nLayers = parseInt(layers, 10) || 0;
        const nVolume = parseFloat(volume.replace(',', '.')) || 1;
        const nMargin = parseFloat(margin.replace(',', '.')) || 0;
        const nPrice = parseFloat(price.replace(',', '.')) || 0;

        if (area === 0 || nVolume === 0) return null;

        const totalLiters = area * nConsumption * nLayers * (1 + nMargin / 100);
        const cans = Math.ceil(totalLiters / nVolume);

        if (cans === 0) return null;

        const totalCost = cans * nPrice;

        const quantityText = `${totalLiters.toFixed(2)} л (≈ ${cans} банок)`;
        const costText = nPrice > 0 ? ` - ${totalCost.toFixed(2)} ₽` : '';
        
        return {
            quantity: quantityText,
            cost: totalCost,
            unit: 'банка', // Изменяем на упаковочную единицу
            details: {
                "Количество": quantityText,
                "Стоимость": `${totalCost.toFixed(2)} ₽`,
                "Цена за банку": `${nPrice.toFixed(2)} ₽`,
                "Всего банок": `${cans} шт.`
            },
            showNote: cans > 0,
            text: quantityText + costText,
        };
    }, [surface, wallArea, floorArea, consumption, layers, volume, margin, price]);
    
    useEffect(() => { onResultChange(name, result); }, [result, name, onResultChange]);

    const handleMaterialSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const matId = parseInt(e.target.value, 10);
        if (!matId) return;
        const material = materials.find(m => m.id === matId);
        if (material) {
            setConsumption(material.params.consumption || '0.15');
            setVolume(material.params.volume || '5');
            setPrice(material.params.price || '0');
        }
    };

    return (
        <div className="card material-calculator-card">
            <h4>{name}</h4>
            <div className="library-select-group">
                <label htmlFor={`${name}-library`}>Выбрать из библиотеки</label>
                <select id={`${name}-library`} onChange={handleMaterialSelect}>
                    <option value="">Свой материал</option>
                    {materials.filter(m=>m.category === 'paint').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div className="toggle-switch"><button onClick={() => setSurface('walls')} className={surface === 'walls' ? 'active' : ''}>Стены</button><button onClick={() => setSurface('ceiling')} className={surface === 'ceiling' ? 'active' : ''}>Потолок</button></div>
            <CalcInput id={`${name}-consumption`} label="Расход материала" unit="л/м²" value={consumption} onChange={e => setConsumption(e.target.value)} tooltip="Обычно 0.1-0.2 л/м² на один слой. Уточните на банке." />
            <CalcInput id={`${name}-layers`} label="Количество слоев" unit="шт." value={layers} onChange={e => setLayers(e.target.value)} step="1" />
            <CalcInput id={`${name}-volume`} label="Объем тары" unit="л" value={volume} onChange={e => setVolume(e.target.value)} />
            <CalcInput id={`${name}-margin`} label="Запас" unit="%" value={margin} onChange={e => setMargin(e.target.value)} step="1" />
            <CalcInput id={`${name}-price`} label="Цена за тару" unit="₽" value={price} onChange={e => setPrice(e.target.value)} />
            {result && (
                <>
                    <div className="calc-result"><strong>{result?.text}</strong></div>
                    {result?.showNote && <p className="calc-note">Кол-во банок округлено в большую сторону</p>}
                </>
            )}
        </div>
    );
};

const WallpaperCalculator: React.FC<{ perimeter: number, height: number } & MaterialCalculatorProps> = ({ perimeter, height, name, onResultChange, materials }) => {
    const [rollLength, setRollLength] = useState('10.05');
    const [rollWidth, setRollWidth] = useState('1.06');
    const [rapport, setRapport] = useState('0');
    const [trimAllowance, setTrimAllowance] = useState('10');
    const [margin, setMargin] = useState('5'); // Base margin on final roll count
    const [price, setPrice] = useState('0');

    const result = useMemo(() => {
        const nPerimeter = perimeter || 0;
        const nHeight = height || 0;
        const nRollLength = parseFloat(rollLength.replace(',', '.')) || 1;
        const nRollWidth = parseFloat(rollWidth.replace(',', '.')) || 1;
        const nRapportM = (parseFloat(rapport.replace(',', '.')) || 0) / 100;
        const nMargin = parseInt(margin, 10) || 0;
        const nTrimAllowanceM = (parseFloat(trimAllowance.replace(',', '.')) || 0) / 100;
        const nPrice = parseFloat(price.replace(',', '.')) || 0;

        if (nPerimeter === 0 || nHeight === 0 || nRollLength === 0 || nRollWidth === 0) return null;

        // More accurate calculation simulating roll cutting
        const totalStripsNeeded = Math.ceil(nPerimeter / nRollWidth);
        const stripLengthWithTrim = nHeight + nTrimAllowanceM;

        if (stripLengthWithTrim > nRollLength) {
             return {
                quantity: `Ошибка: высота потолка (+ припуск) больше длины рулона`,
                cost: 0, details: {}, showNote: false, text: `Ошибка: высота потолка (+ припуск) больше длины рулона`
            };
        }

        let rolls = 0;
        let stripsCut = 0;
        
        while (stripsCut < totalStripsNeeded) {
            rolls++;
            let currentRollLength = nRollLength;
            // Cut strips from the new roll
            while (currentRollLength >= stripLengthWithTrim) {
                // For the first strip from a roll, we only need the base height + trim
                let neededLength = stripLengthWithTrim;
                
                // For subsequent strips, we must account for pattern matching (rapport)
                if (nRapportM > 0) {
                     const repeatsInStrip = Math.ceil(stripLengthWithTrim / nRapportM);
                     neededLength = repeatsInStrip * nRapportM;
                }

                if (currentRollLength >= neededLength) {
                    currentRollLength -= neededLength;
                    stripsCut++;
                    if (stripsCut >= totalStripsNeeded) break;
                } else {
                    break; // Remainder is too small for another strip
                }
            }
        }
        
        const totalRolls = Math.ceil(rolls * (1 + nMargin / 100));
        
        if (totalRolls === 0) return null;

        const totalCost = totalRolls * nPrice;

        const quantityText = `≈ ${totalRolls} рул.`;
        const costText = nPrice > 0 ? ` - ${totalCost.toFixed(2)} ₽` : '';

        return {
            quantity: quantityText,
            cost: totalCost,
            unit: 'рулон', // Изменяем на упаковочную единицу
            details: {
                "Количество": quantityText || '',
                "Стоимость": `${totalCost.toFixed(2)} ₽`,
                "Цена за рулон": `${nPrice.toFixed(2)} ₽`,
                "Всего рулонов": `${totalRolls} шт.`
            } as Record<string, string>,
            showNote: totalRolls > 0,
            text: quantityText + costText
        };
    }, [perimeter, height, rollLength, rollWidth, rapport, trimAllowance, margin, price]);
    
    useEffect(() => { onResultChange(name, result); }, [result, name, onResultChange]);
    
    const handleMaterialSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const matId = parseInt(e.target.value, 10);
        if (!matId) return;
        const material = materials.find(m => m.id === matId);
        if (material) {
            setRollLength(material.params.rollLength || '10.05');
            setRollWidth(material.params.rollWidth || '1.06');
            setRapport(material.params.rapport || '0');
            setPrice(material.params.price || '0');
        }
    };

    return (
        <div className="card material-calculator-card">
            <h4>{name}</h4>
             <div className="library-select-group">
                <label htmlFor={`${name}-library`}>Выбрать из библиотеки</label>
                <select id={`${name}-library`} onChange={handleMaterialSelect}>
                    <option value="">Свой материал</option>
                    {materials.filter(m=>m.category === 'wallpaper').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <CalcInput id={`${name}-roll-length`} label="Длина рулона" unit="м" value={rollLength} onChange={e => setRollLength(e.target.value)} />
            <CalcInput id={`${name}-roll-width`} label="Ширина рулона" unit="м" value={rollWidth} onChange={e => setRollWidth(e.target.value)} />
            <CalcInput id={`${name}-trim`} label="Припуск на подрезку" unit="см" value={trimAllowance} onChange={e => setTrimAllowance(e.target.value)} tooltip="Общий припуск на одну полосу для выравнивания (сверху и снизу). Стандартно 5-10 см." />
            <CalcInput id={`${name}-rapport`} label="Раппорт (повтор рисунка)" unit="см" value={rapport} onChange={e => setRapport(e.target.value)} tooltip="Укажите 0, если рисунок не нужно совмещать." />
            <CalcInput id={`${name}-margin`} label="Доп. запас" unit="%" value={margin} onChange={e => setMargin(e.target.value)} step="1" tooltip="Дополнительный запас на случай брака или сложных участков."/>
            <CalcInput id={`${name}-price`} label="Цена за рулон" unit="₽" value={price} onChange={e => setPrice(e.target.value)} />
            {result && (
                <>
                    <div className="calc-result"><strong>{result?.text}</strong></div>
                    {result?.showNote && <p className="calc-note">Кол-во рулонов округлено в большую сторону</p>}
                </>
            )}
        </div>
    );
};

const LaminateCalculator: React.FC<{ floorArea: number } & MaterialCalculatorProps> = ({ floorArea, name, onResultChange, materials }) => {
    const [packArea, setPackArea] = useState('2.13');
    const [margin, setMargin] = useState('7');
    const [direction, setDirection] = useState<'along' | 'across'>('along');
    const [price, setPrice] = useState('0');

    useEffect(() => {
        setMargin(direction === 'along' ? '7' : '10');
    }, [direction]);

    const result = useMemo(() => {
        const nFloorArea = floorArea || 0;
        const nPackArea = parseFloat(packArea.replace(',', '.')) || 1;
        const nMargin = parseInt(margin, 10) || 0;
        const nPrice = parseFloat(price.replace(',', '.')) || 0;
        if (nFloorArea === 0 || nPackArea === 0) return null;

        const totalArea = nFloorArea * (1 + nMargin / 100);
        const packs = Math.ceil(totalArea / nPackArea);

        if (packs === 0) return null;

        const totalCost = packs * nPrice;

        const quantityText = `Ламинат: ${totalArea.toFixed(2)} м² (≈ ${packs} уп.)\nПодложка: ${totalArea.toFixed(2)} м²`;
        const costText = nPrice > 0 ? `\nОбщая стоимость: ${totalCost.toFixed(2)} ₽` : '';

        return {
            quantity: quantityText,
            cost: totalCost,
            unit: 'упаковка', // Изменяем на упаковочную единицу
            details: {
                "Ламинат": `${totalArea.toFixed(2)} м² (≈ ${packs} уп.)`,
                "Подложка": `${totalArea.toFixed(2)} м²`,
                "Стоимость": `${totalCost.toFixed(2)} ₽`,
                "Цена за упаковку": `${nPrice.toFixed(2)} ₽`
            },
            showNote: packs > 0,
            text: quantityText + costText
        };
    }, [floorArea, packArea, margin, price, direction]);

    useEffect(() => {
        onResultChange(name, result);
    }, [result, name, onResultChange]);
    
     const handleMaterialSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const matId = parseInt(e.target.value, 10);
        if (!matId) return;
        const material = materials.find(m => m.id === matId);
        if (material) {
            setPackArea(material.params.packArea || '2.13');
            setPrice(material.params.price || '0');
        }
    };

    return (
        <div className="card material-calculator-card">
            <h4>{name}</h4>
             <div className="library-select-group">
                <label htmlFor={`${name}-library`}>Выбрать из библиотеки</label>
                <select id={`${name}-library`} onChange={handleMaterialSelect}>
                    <option value="">Свой материал</option>
                    {materials.filter(m=>m.category === 'flooring').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div className="toggle-switch">
                <button onClick={() => setDirection('along')} className={direction === 'along' ? 'active' : ''}>Прямая укладка</button>
                <button onClick={() => setDirection('across')} className={direction === 'across' ? 'active' : ''}>Диагональная укладка</button>
            </div>
            <CalcInput id={`${name}-packarea`} label="Площадь в упаковке" unit="м²" value={packArea} onChange={e => setPackArea(e.target.value)} />
            <CalcInput id={`${name}-margin`} label="Запас на подрезку" unit="%" value={margin} onChange={e => setMargin(e.target.value)} step="1" tooltip="Рекомендуемый запас: 5-7% для прямой укладки, 10-15% для диагональной." />
            <CalcInput id={`${name}-price`} label="Цена за упаковку" unit="₽" value={price} onChange={e => setPrice(e.target.value)} />
            {result && (
                <>
                    <div className="calc-result"><strong>{result?.text}</strong></div>
                    {result?.showNote && <p className="calc-note">Кол-во упаковок округлено в большую сторону</p>}
                </>
            )}
        </div>
    );
};

const ScreedCalculator: React.FC<{ floorArea: number } & MaterialCalculatorProps> = ({ floorArea, name, onResultChange, materials }) => {
    const {
        thickness, setThickness,
        consumption, setConsumption,
        bagWeight, setBagWeight,
        margin, setMargin,
        price, setPrice,
        result
    } = useBagCalculation(floorArea, '10', '1.8', '25', '10', '0');

    useEffect(() => { onResultChange(name, result); }, [result, name, onResultChange]);
    
    const handleMaterialSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const matId = parseInt(e.target.value, 10);
        if (!matId) return;
        const material = materials.find(m => m.id === matId);
        if (material) {
            setThickness(material.params.thickness || '10');
            setConsumption(material.params.consumption || '1.8');
            setBagWeight(material.params.bagWeight || '25');
            setPrice(material.params.price || '0');
        }
    };


    return (
        <div className="card material-calculator-card">
            <h4>{name}</h4>
             <div className="library-select-group">
                <label htmlFor={`${name}-library`}>Выбрать из библиотеки</label>
                <select id={`${name}-library`} onChange={handleMaterialSelect}>
                    <option value="">Свой материал</option>
                    {materials.filter(m=>m.category === 'screed').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <CalcInput id={`${name}-thickness`} label="Толщина слоя" unit="мм" value={thickness} onChange={e => setThickness(e.target.value)} />
            <CalcInput id={`${name}-consumption`} label="Расход на 1 мм слоя" unit="кг/м²" value={consumption} onChange={e => setConsumption(e.target.value)} tooltip="Расход указывается на упаковке материала" />
            <CalcInput id={`${name}-bagweight`} label="Вес мешка" unit="кг" value={bagWeight} onChange={e => setBagWeight(e.target.value)} />
            <CalcInput id={`${name}-margin`} label="Запас" unit="%" value={margin} onChange={e => setMargin(e.target.value)} />
            <CalcInput id={`${name}-price`} label="Цена за мешок" unit="₽" value={price} onChange={e => setPrice(e.target.value)} />
            {result && (
                <>
                    <div className="calc-result"><strong>{result?.text}</strong></div>
                    {result?.showNote && <p className="calc-note">Кол-во мешков округлено в большую сторону</p>}
                </>
            )}
        </div>
    );
};


const SkirtingCalculator: React.FC<{ perimeter: number, totalDoorWidth: number, totalExclusionWidth: number } & MaterialCalculatorProps> = ({ perimeter, totalDoorWidth, totalExclusionWidth, name, onResultChange, materials }) => {
    const [skirtingLength, setSkirtingLength] = useState('2.5');
    const [margin, setMargin] = useState('10');
    const [price, setPrice] = useState('0');

    const result = useMemo(() => {
        const nPerimeter = perimeter || 0;
        const nDoorWidth = totalDoorWidth || 0;
        const nExclusionWidth = totalExclusionWidth || 0;
        const nSkirtingLength = parseFloat(skirtingLength.replace(',', '.')) || 1;
        const nMargin = parseInt(margin, 10) || 0;
        const nPrice = parseFloat(price.replace(',', '.')) || 0;

        const effectivePerimeter = nPerimeter - nDoorWidth - nExclusionWidth;
        if (effectivePerimeter <= 0 || nSkirtingLength === 0) return null;
        
        const totalLength = effectivePerimeter * (1 + nMargin / 100);
        const pieces = Math.ceil(totalLength / nSkirtingLength);

        if (pieces === 0) return null;

        const totalCost = pieces * nPrice;

        const quantityText = `${totalLength.toFixed(2)} м.п. (≈ ${pieces} шт.)`;
        const costText = nPrice > 0 ? ` - ${totalCost.toFixed(2)} ₽` : '';

        return {
            quantity: quantityText,
            cost: totalCost,
            unit: 'планка', // Изменяем на упаковочную единицу
            details: {
                "Количество": quantityText,
                "Стоимость": `${totalCost.toFixed(2)} ₽`,
                "Цена за планку": `${nPrice.toFixed(2)} ₽`,
                "Всего планок": `${pieces} шт.`
            },
            showNote: pieces > 0,
            text: quantityText + costText,
        };
    }, [perimeter, totalDoorWidth, totalExclusionWidth, skirtingLength, margin, price]);
    
    useEffect(() => { onResultChange(name, result); }, [result, name, onResultChange]);
    
    const handleMaterialSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const matId = parseInt(e.target.value, 10);
        if (!matId) return;
        const material = materials.find(m => m.id === matId);
        if (material) {
            setSkirtingLength(material.params.length || '2.5');
            setPrice(material.params.price || '0');
        }
    };

    return (
        <div className="card material-calculator-card">
            <h4>{name}</h4>
            <div className="library-select-group">
                <label htmlFor={`${name}-library`}>Выбрать из библиотеки</label>
                <select id={`${name}-library`} onChange={handleMaterialSelect}>
                    <option value="">Свой материал</option>
                    {materials.filter(m=>m.category === 'skirting').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <CalcInput id={`${name}-length`} label="Длина планки" unit="м" value={skirtingLength} onChange={e => setSkirtingLength(e.target.value)} />
            <CalcInput id={`${name}-margin`} label="Запас на подрезку" unit="%" value={margin} onChange={e => setMargin(e.target.value)} step="1" />
            <CalcInput id={`${name}-price`} label="Цена за планку" unit="₽" value={price} onChange={e => setPrice(e.target.value)} />
            {result && (
                <>
                    <div className="calc-result"><strong>{result?.text}</strong></div>
                    {result?.showNote && <p className="calc-note">Кол-во планок округлено в большую сторону</p>}
                </>
            )}
        </div>
    );
};

const TileCalculator: React.FC<{ wallArea: number, floorArea: number } & MaterialCalculatorProps> = ({ wallArea, floorArea, name, onResultChange, materials }) => {
    const [surface, setSurface] = useState<'walls' | 'floor'>('walls');
    const [tileWidth, setTileWidth] = useState('30');
    const [tileHeight, setTileHeight] = useState('60');
    const [groutWidth, setGroutWidth] = useState('2');
    const [margin, setMargin] = useState('10');
    const [pattern, setPattern] = useState<'straight' | 'diagonal'>('straight');
    const [packSize, setPackSize] = useState('10'); // tiles per pack
    const [price, setPrice] = useState('0');

    useEffect(() => {
        setMargin(pattern === 'straight' ? '10' : '15');
    }, [pattern]);

    const result = useMemo(() => {
        const area = surface === 'walls' ? wallArea : floorArea;
        const nTileWidthM = (parseFloat(tileWidth.replace(',', '.')) || 0) / 100;
        const nTileHeightM = (parseFloat(tileHeight.replace(',', '.')) || 0) / 100;
        const nGroutWidthM = (parseFloat(groutWidth.replace(',', '.')) || 0) / 1000;
        const nMargin = parseInt(margin, 10) || 0;
        const nPackSize = parseInt(packSize, 10) || 1;
        const nPrice = parseFloat(price.replace(',', '.')) || 0;
        
        if (area === 0 || nTileWidthM === 0 || nTileHeightM === 0 || nPackSize === 0) return null;
        
        const tileAreaWithGrout = (nTileWidthM + nGroutWidthM) * (nTileHeightM + nGroutWidthM);
        if (tileAreaWithGrout === 0) return null;

        const totalAreaNeeded = area * (1 + nMargin / 100);
        const totalTiles = Math.ceil(totalAreaNeeded / tileAreaWithGrout);
        const totalPacks = Math.ceil(totalTiles / nPackSize);

        if (totalPacks === 0) return null;

        const totalCost = totalPacks * nPrice;

        const quantityText = `≈ ${totalTiles} плиток / ${totalPacks} уп. (${totalAreaNeeded.toFixed(2)} м²)`;
        const costText = nPrice > 0 ? `\nОбщая стоимость: ${totalCost.toFixed(2)} ₽` : '';
        
        return {
            quantity: quantityText,
            cost: totalCost,
            details: {
                "Количество": `≈ ${totalTiles} плиток / ${totalPacks} уп.`,
                "Площадь с запасом": `${totalAreaNeeded.toFixed(2)} м²`,
                "Стоимость": `${totalCost.toFixed(2)} ₽`,
                "Цена за упаковку": `${nPrice.toFixed(2)} ₽`
            },
            showNote: totalPacks > 0,
            text: quantityText + costText
        };
    }, [surface, wallArea, floorArea, tileWidth, tileHeight, groutWidth, margin, packSize, pattern, price]);
    
    useEffect(() => { onResultChange(name, result); }, [result, name, onResultChange]);

    const handleMaterialSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const matId = parseInt(e.target.value, 10);
        if (!matId) return;
        const material = materials.find(m => m.id === matId);
        if (material) {
            setTileWidth(material.params.width || '30');
            setTileHeight(material.params.height || '60');
            setPackSize(material.params.packSize || '10');
            setPrice(material.params.price || '0');
        }
    };

    return (
        <div className="card material-calculator-card">
            <h4>{name}</h4>
            <div className="library-select-group">
                <label htmlFor={`${name}-library`}>Выбрать из библиотеки</label>
                <select id={`${name}-library`} onChange={handleMaterialSelect}>
                    <option value="">Свой материал</option>
                    {materials.filter(m=>m.category === 'tile').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div className="toggle-switch">
                <button onClick={() => setSurface('walls')} className={surface === 'walls' ? 'active' : ''}>Стены</button>
                <button onClick={() => setSurface('floor')} className={surface === 'floor' ? 'active' : ''}>Пол</button>
            </div>
             <div className="toggle-switch">
                <button onClick={() => setPattern('straight')} className={pattern === 'straight' ? 'active' : ''}>Прямая раскладка</button>
                <button onClick={() => setPattern('diagonal')} className={pattern === 'diagonal' ? 'active' : ''}>Диагональная раскладка</button>
            </div>
            <div className="tile-inputs-grid">
                <CalcInput id={`${name}-tile-width`} label="Ширина плитки" unit="см" value={tileWidth} onChange={e => setTileWidth(e.target.value)} />
                <CalcInput id={`${name}-tile-height`} label="Высота плитки" unit="см" value={tileHeight} onChange={e => setTileHeight(e.target.value)} />
            </div>
            <CalcInput id={`${name}-grout`} label="Ширина шва" unit="мм" value={groutWidth} onChange={e => setGroutWidth(e.target.value)} tooltip="Ширина шва влияет на общее кол-во плитки" />
            <CalcInput id={`${name}-packsize`} label="Плиток в упаковке" unit="шт." value={packSize} onChange={e => setPackSize(e.target.value)} step="1" />
            <CalcInput id={`${name}-margin`} label="Запас на подрезку" unit="%" value={margin} onChange={e => setMargin(e.target.value)} step="1" />
            <CalcInput id={`${name}-price`} label="Цена за упаковку" unit="₽" value={price} onChange={e => setPrice(e.target.value)} />
            {result && (
                <>
                    <div className="calc-result"><strong>{result?.text}</strong></div>
                    {result?.showNote && <p className="calc-note">Кол-во упаковок округлено в большую сторону</p>}
                </>
            )}
        </div>
    );
};

const DrywallCalculator: React.FC<{ wallArea: number, floorArea: number, perimeter: number } & MaterialCalculatorProps> = ({ wallArea, floorArea, perimeter, name, onResultChange, materials }) => {
    const [surface, setSurface] = useState<'walls' | 'ceiling'>('walls');
    const [sheetWidth, setSheetWidth] = useState('1.2');
    const [sheetLength, setSheetLength] = useState('2.5');
    const [margin, setMargin] = useState('15');
    // Note: Price is not included here as it's a complex multi-item calculator. 
    // Costing for this would require a more detailed breakdown.

    const results = useMemo(() => {
        const area = (surface === 'walls' ? wallArea : floorArea) || 0;
        const nSheetWidth = parseFloat(sheetWidth.replace(',', '.')) || 1;
        const nSheetLength = parseFloat(sheetLength.replace(',', '.')) || 1;
        const nMargin = parseInt(margin, 10) || 0;
        
        if (area === 0) return null;
        
        const sheetArea = nSheetWidth * nSheetLength;
        if (sheetArea === 0) return null;

        const areaWithMargin = area * (1 + nMargin / 100);
        
        const sheets = Math.ceil(areaWithMargin / sheetArea);
        if (sheets === 0) return null;

        const udProfile = Math.ceil(perimeter); // Guide profile
        const cdProfile = Math.ceil(area * 3); // Rack profile (rule of thumb)
        const screws = Math.ceil(area * 17); // Screws (rule of thumb)
        const tape = Math.ceil(area * 1.5); // Joint tape (rule of thumb)
        const putty = Math.ceil(area * 0.5); // Putty for joints (kg)

        const lines = [
            { label: 'Листы ГКЛ', value: `${sheets} шт.` },
            { label: 'Профиль направляющий (ПН)', value: `${udProfile} м.п.` },
            { label: 'Профиль стоечный (ПС)', value: `${cdProfile} м.п.` },
            { label: 'Саморезы', value: `${screws} шт.` },
            { label: 'Лента для швов (серпянка)', value: `${tape} м.п.` },
            { label: 'Шпаклевка для швов', value: `${putty} кг` },
        ];
        const quantityText = lines.map(r => `${r.label}: ${r.value}`).join('\n');

        return {
            lines,
            quantity: quantityText,
            cost: 0, // No cost calculation for this complex component
            details: lines.reduce((acc, curr) => ({...acc, [curr.label]: curr.value }), {}),
            showNote: lines.length > 0,
            text: `${lines.length} позиций`
        };
    }, [surface, wallArea, floorArea, perimeter, sheetWidth, sheetLength, margin]);
    
    useEffect(() => {
        onResultChange(name, results);
    }, [results, name, onResultChange]);
    
     const handleMaterialSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const matId = parseInt(e.target.value, 10);
        if (!matId) return;
        const material = materials.find(m => m.id === matId);
        if (material) {
            setSheetWidth(material.params.width || '1.2');
            setSheetLength(material.params.length || '2.5');
        }
    };


    return (
        <div className="card material-calculator-card">
            <h4>{name}</h4>
            <div className="library-select-group">
                <label htmlFor={`${name}-library`}>Выбрать из библиотеки</label>
                <select id={`${name}-library`} onChange={handleMaterialSelect}>
                    <option value="">Свой материал</option>
                    {materials.filter(m=>m.category === 'drywall').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div className="toggle-switch">
                <button onClick={() => setSurface('walls')} className={surface === 'walls' ? 'active' : ''}>Стены</button>
                <button onClick={() => setSurface('ceiling')} className={surface === 'ceiling' ? 'active' : ''}>Потолок</button>
            </div>
            <div className="tile-inputs-grid">
                 <CalcInput id={`${name}-sheet-width`} label="Ширина листа" unit="м" value={sheetWidth} onChange={e => setSheetWidth(e.target.value)} />
                 <CalcInput id={`${name}-sheet-length`} label="Длина листа" unit="м" value={sheetLength} onChange={e => setSheetLength(e.target.value)} />
            </div>
            <CalcInput id={`${name}-margin`} label="Запас" unit="%" value={margin} onChange={e => setMargin(e.target.value)} step="1" />
            
            {results && (
                <>
                    <div className="calc-result-group">
                        {results.lines.map(res => (
                            <div className="calc-result" key={res.label}>
                                <span>{res.label}</span>
                                <strong>{res.value}</strong>
                            </div>
                        ))}
                    </div>
                    {results.showNote && <p className="calc-note">Расчет профилей, крепежа и расходников является примерным.</p>}
                </>
            )}
        </div>
    );
};

interface ArbitraryMaterial {
    id: number;
    name: string;
    quantity: string;
    unit: string;
    price: string;
}

const ArbitraryMaterialsCalculator: React.FC<ArbitraryMaterialCalculatorProps> = ({ name, onResultChange, materials, onSaveMaterial }) => {
    const [items, setItems] = useState<ArbitraryMaterial[]>([]);
    const [justSavedIds, setJustSavedIds] = useState<Set<number>>(new Set());

    const handleAddItem = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = e.target.value;
        if (!selectedValue) return;

        if (selectedValue === 'new') {
            setItems(prev => [...prev, { id: Date.now(), name: '', quantity: '1', unit: 'шт.', price: '0' }]);
        } else {
            const matId = parseInt(selectedValue, 10);
            const material = materials.find(m => m.id === matId);
            if (material) {
                setItems(prev => [...prev, {
                    id: Date.now(),
                    name: material.name,
                    quantity: '1',
                    unit: material.params.unit || 'шт.',
                    price: material.params.price || '0',
                }]);
            }
        }
    };

    const handleRemoveItem = (id: number) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleItemChange = (id: number, field: keyof Omit<ArbitraryMaterial, 'id'>, value: string) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };
    
     const handleSaveToLibrary = (item: ArbitraryMaterial) => {
        if (!item.name.trim()) return;
        onSaveMaterial({
            name: item.name.trim(),
            category: 'arbitrary',
            params: {
                unit: item.unit,
                price: item.price
            }
        });
        setJustSavedIds(prev => new Set(prev).add(item.id));
        tg?.HapticFeedback.notificationOccurred('success');
    };

    const result = useMemo(() => {
        if (items.length === 0) return null;

        let totalCost = 0;
        const details: Record<string, string> = {};
        const resultItems: Exclude<MaterialResult['items'], undefined> = [];

        items.forEach((item, index) => {
            const nQuantity = parseFloat(item.quantity.replace(',', '.')) || 0;
            const nPrice = parseFloat(item.price.replace(',', '.')) || 0;
            const subtotal = nQuantity * nPrice;
            totalCost += subtotal;

            if (item.name.trim()) {
                const quantityText = `${nQuantity} ${item.unit || 'шт.'}`;
                resultItems.push({
                    name: item.name.trim(),
                    quantity: quantityText,
                    cost: subtotal
                });
                details[`${item.name.trim()} #${index + 1}`] = `${quantityText} x ${nPrice.toFixed(2)} ₽ = ${subtotal.toFixed(2)} ₽`;
            }
        });
        
        if (resultItems.length === 0) return null;

        return {
            quantity: `${resultItems.length} поз.`,
            cost: totalCost,
            details,
            isGroup: true,
            items: resultItems,
            showNote: resultItems.length > 0,
            text: `${resultItems.length} позиций - ${totalCost.toFixed(2)} ₽`
        };
    }, [items]);

    useEffect(() => {
        onResultChange(name, result);
    }, [result, name, onResultChange]);
    
    const libraryMaterials = useMemo(() => materials.filter(m => m.category === 'arbitrary'), [materials]);

    return (
        <div className="card material-calculator-card">
            <h4>{name}</h4>
             <div className="library-select-group">
                <label htmlFor={`${name}-library`}>Добавить материал в смету</label>
                <select id={`${name}-library`} onChange={handleAddItem} value="">
                    <option value="" disabled>Выберите или добавьте новый...</option>
                    <option value="new">➕ Добавить вручную</option>
                    {libraryMaterials.length > 0 && (
                        <optgroup label="Из библиотеки">
                            {libraryMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </optgroup>
                    )}
                </select>
            </div>
            <div className={`arbitrary-items-list ${items.length > 0 ? 'has-items' : ''}`}>
                {items.map(item => {
                    const isAlreadySaved = materials.some(m => m.category === 'arbitrary' && m.name.trim().toLowerCase() === item.name.trim().toLowerCase());
                    return (
                        <div key={item.id} className="arbitrary-item">
                            <div className="arbitrary-item-main">
                                <input
                                    type="text"
                                    className="arbitrary-name-input"
                                    placeholder="Название материала"
                                    value={item.name}
                                    onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                                />
                                <div className="arbitrary-item-fields">
                                <CalcInput id={`arb-qty-${item.id}`} label="Кол-во" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} />
                                <div className="calc-input-group">
                                        <div className="calc-label-wrapper"><label htmlFor={`arb-unit-${item.id}`}>Ед. изм.</label></div>
                                        <input id={`arb-unit-${item.id}`} type="text" value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} />
                                </div>
                                <CalcInput id={`arb-price-${item.id}`} label="Цена за ед." unit="₽" value={item.price} onChange={e => handleItemChange(item.id, 'price', e.target.value)} />
                                </div>
                            </div>
                             <div className="arbitrary-item-actions">
                                <button onClick={() => handleSaveToLibrary(item)} className="btn-tertiary" aria-label="Сохранить в библиотеку" disabled={!item.name.trim() || isAlreadySaved || justSavedIds.has(item.id)}><IconLibrary/></button>
                                <button onClick={() => handleRemoveItem(item.id)} className="btn-tertiary" aria-label="Удалить"><IconTrash/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
            {result && (
                 <div className="calc-result">
                    <span>Итого по произвольным:</span>
                    <strong>{result.cost.toFixed(2)} ₽</strong>
                </div>
            )}
        </div>
    );
};


// --- END OF MATERIAL CALCULATOR COMPONENTS ---


// --- START OF DECOMPOSED VIEW COMPONENTS ---

const RoomEditor: React.FC<{
    rooms: RoomData[];
    setRooms: React.Dispatch<React.SetStateAction<RoomData[]>>;
    activeRoomId: number;
    setActiveRoomId: (id: number) => void;
    errors: Record<string, Record<string, string>>;
    handleInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    onProceed: () => void;
}> = ({ rooms, setRooms, activeRoomId, setActiveRoomId, errors, handleInputFocus, onProceed }) => {
    const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
    const [editingRoomName, setEditingRoomName] = useState('');
    const renameInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (editingRoomId !== null && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [editingRoomId]);
    
    const activeRoom = useMemo(() => rooms.find(r => r.id === activeRoomId) || rooms[0], [rooms, activeRoomId]);
    const activeRoomCalculations = useMemo(() => activeRoom ? calculateRoomMetrics(activeRoom) : null, [activeRoom]);
    const activeRoomErrors = useMemo(() => errors[activeRoomId] || {}, [errors, activeRoomId]);

    if (!activeRoom || !activeRoomCalculations) return <div>Ошибка: помещение не найдено.</div>;

    const handleRoomChange = (roomId: number, field: keyof RoomData, value: string | number | Opening[] | ExclusionZone[] | GeometricElement[]) => {
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, [field]: value } : r));
    };

    const handleUnitChange = (newUnit: Unit) => {
        const { unit: oldUnit } = activeRoom;
        const convert = (valStr: string) => {
            if (!valStr.trim()) return '';
            const num = parseFloat(valStr.replace(',', '.'));
            if (isNaN(num)) return '';
            const valInMeters = num / conversionFactors[oldUnit];
            const convertedVal = valInMeters * conversionFactors[newUnit];
            return String(parseFloat(convertedVal.toPrecision(15)));
        };
        setRooms(prev => prev.map(r => r.id === activeRoomId ? {
            ...r,
            unit: newUnit,
            length: convert(r.length),
            width: convert(r.width),
            height: convert(r.height),
            openings: r.openings.map(op => ({...op, width: convert(op.width), height: convert(op.height), sillHeight: op.sillHeight ? convert(op.sillHeight) : undefined })),
            exclusions: r.exclusions.map(ex => ({...ex, width: convert(ex.width), height: convert(ex.height) })),
            geometricElements: r.geometricElements.map(el => ({...el, width: convert(el.width), depth: convert(el.depth), diameter: convert(el.diameter), height: convert(el.height)}))
        } : r));
    };

    const handleAddOpening = () => handleRoomChange(activeRoomId, 'openings', [...activeRoom.openings, { id: Date.now(), width: '', height: '', count: '1', type: 'window', includeSillArea: false, sillHeight: '' }]);
    const handleRemoveOpening = (id: number) => handleRoomChange(activeRoomId, 'openings', activeRoom.openings.filter(op => op.id !== id));
    const handleOpeningChange = (opId: number, field: keyof Omit<Opening, 'id'>, value: string | number | boolean) => {
        const newOpenings = activeRoom.openings.map(op => op.id === opId ? { ...op, [field]: value } : op);
        handleRoomChange(activeRoomId, 'openings', newOpenings);
    };

    const handleAddExclusion = () => handleRoomChange(activeRoomId, 'exclusions', [...activeRoom.exclusions, { id: Date.now(), name: '', width: '', height: '', count: '1', affectsPerimeter: true, affectsWallArea: true }]);
    const handleRemoveExclusion = (id: number) => handleRoomChange(activeRoomId, 'exclusions', activeRoom.exclusions.filter(ex => ex.id !== id));
    const handleExclusionChange = (exId: number, field: keyof Omit<ExclusionZone, 'id'>, value: string | number | boolean) => {
        const newExclusions = activeRoom.exclusions.map(ex => ex.id === exId ? { ...ex, [field]: value } : ex);
        handleRoomChange(activeRoomId, 'exclusions', newExclusions);
    };
    
    const handleAddGeometricElement = () => handleRoomChange(activeRoomId, 'geometricElements', [...activeRoom.geometricElements, { id: Date.now(), type: 'niche', width: '', depth: '', diameter: '', height: '', count: '1' }]);
    const handleRemoveGeometricElement = (id: number) => handleRoomChange(activeRoomId, 'geometricElements', activeRoom.geometricElements.filter(el => el.id !== id));
    const handleGeometricElementChange = (elId: number, field: keyof Omit<GeometricElement, 'id'>, value: any) => {
        const newElements = activeRoom.geometricElements.map(el => el.id === elId ? { ...el, [field]: value } : el);
        handleRoomChange(activeRoomId, 'geometricElements', newElements);
    };

    const handleAddRoom = () => {
        const newRoomId = Date.now();
        const newRoom: RoomData = {
            id: newRoomId, name: `Комната ${rooms.length + 1}`, length: '', width: '', height: '', openings: [], exclusions: [], geometricElements: [], unit: 'm',
        };
        setRooms(prev => [...prev, newRoom]);
        setActiveRoomId(newRoomId);
    };

    const handleRemoveRoom = (idToRemove: number) => {
        if (rooms.length <= 1) return;
        
        const roomToRemove = rooms.find(r => r.id === idToRemove);
        if (!roomToRemove) return;

        const hasData = roomToRemove.length.trim() !== '' ||
                        roomToRemove.width.trim() !== '' ||
                        roomToRemove.height.trim() !== '' ||
                        roomToRemove.openings.length > 0 ||
                        roomToRemove.exclusions.length > 0 ||
                        roomToRemove.geometricElements.length > 0;

        const message = hasData
            ? `Вы уверены, что хотите удалить "${roomToRemove.name}"? Все связанные с ней проемы, исключения и расчеты будут утеряны.`
            : `Удалить помещение "${roomToRemove.name}"?`;

        safeShowConfirm(message, (ok) => {
            if (ok) {
                setRooms(prev => {
                    const newRooms = prev.filter(r => r.id !== idToRemove);
                    if (activeRoomId === idToRemove) {
                        setActiveRoomId(newRooms[0]?.id || 0);
                    }
                    return newRooms;
                });
            }
        });
    };
    
    const handleRemoveRoomClick = (e: React.MouseEvent, roomId: number) => {
        e.stopPropagation();
        handleRemoveRoom(roomId);
    };
    
    const handleDoubleClickToRename = (e: React.MouseEvent, room: RoomData) => {
        e.stopPropagation();
        setEditingRoomId(room.id);
        setEditingRoomName(room.name);
    };
    
    const handleRenameInputBlur = (roomId: number) => {
        handleRenameRoom(roomId, editingRoomName);
        setEditingRoomId(null);
    };
    
    const handleRenameInputKeyDown = (e: React.KeyboardEvent, roomId: number) => {
        if (e.key === 'Enter') {
            handleRenameRoom(roomId, editingRoomName);
            setEditingRoomId(null);
        } else if (e.key === 'Escape') {
            setEditingRoomId(null);
        }
    };
    
    const handleRenameRoom = (id: number, newName: string) => {
        if (newName.trim()) {
            handleRoomChange(id, 'name', newName.trim());
        }
    };

    const roomPresets = [
        { name: '0.8×1.2', width: '0.8', length: '1.2', height: '2.5' }, { name: '1.5×1.7', width: '1.5', length: '1.7', height: '2.5' },
        { name: '1.5×2', width: '1.5', length: '2', height: '2.7' }, { name: '1.7×2', width: '1.7', length: '2', height: '2.5' },
        { name: '2×2', width: '2', length: '2', height: '2.7' }, { name: '2×3', width: '2', length: '3', height: '2.5' },
        { name: '2.5×2.5', width: '2.5', length: '2.5', height: '2.5' }, { name: '2.5×3', width: '2.5', length: '3', height: '2.7' },
        { name: '3×4', width: '3', length: '4', height: '2.5' }, { name: '3.5×4', width: '3.5', length: '4', height: '2.7' },
        { name: '3×5', width: '3', length: '5', height: '2.5' }, { name: '4×4', width: '4', length: '4', height: '2.7' },
        { name: '3.5×5', width: '3.5', length: '5', height: '2.7' }, { name: '3×6', width: '3', length: '6', height: '2.5' },
        { name: '4×5', width: '4', length: '5', height: '2.8' },
    ];

    const handlePresetClick = (preset: { width: string, length: string, height: string }) => {
        const convert = (valMetersStr: string) => {
            const meters = parseFloat(valMetersStr);
            const converted = meters * conversionFactors[activeRoom.unit];
            return String(parseFloat(converted.toPrecision(15)));
        };
        handleRoomChange(activeRoomId, 'length', convert(preset.length));
        handleRoomChange(activeRoomId, 'width', convert(preset.width));
        handleRoomChange(activeRoomId, 'height', convert(preset.height));
    };

    return (
        <>
            <div className="card room-tabs-container">
                {rooms.map(room => (
                    <div key={room.id} className={`room-tab ${room.id === activeRoomId ? 'active' : ''}`} onClick={() => setActiveRoomId(room.id)}>
                        {editingRoomId === room.id ? (
                            <input ref={renameInputRef} type="text" value={editingRoomName} className="room-rename-input" onChange={(e) => setEditingRoomName(e.target.value)} onBlur={() => handleRenameInputBlur(room.id)} onKeyDown={(e) => handleRenameInputKeyDown(e, room.id)} onClick={e => e.stopPropagation()} />
                        ) : (
                            <span onDoubleClick={(e) => handleDoubleClickToRename(e, room)}>{room.name}</span>
                        )}
                        {rooms.length > 1 && <button onClick={(e) => handleRemoveRoomClick(e, room.id)} className="remove-room-btn"><IconClose/></button>}
                    </div>
                ))}
                <button onClick={handleAddRoom} className="add-room-btn"><IconPlus/></button>
            </div>
            <div className="card">
                <div className="unit-switcher">
                    <label>Единицы измерения</label>
                    <div className="toggle-switch">
                        <button onClick={() => handleUnitChange('m')} className={activeRoom.unit === 'm' ? 'active' : ''}>метры (м)</button>
                        <button onClick={() => handleUnitChange('cm')} className={activeRoom.unit === 'cm' ? 'active' : ''}>сантиметры (см)</button>
                    </div>
                </div>
            </div>
            <div className="card presets-card">
                <label>Быстрые пресеты</label>
                <div className="presets-buttons">
                    {roomPresets.map(p => <button key={p.name} onClick={() => handlePresetClick(p)} className="preset-btn">{p.name}</button>)}
                </div>
            </div>
            <div className="card">
                <CalcInput id={`${activeRoomId}_length`} label="Длина" unit={activeRoom.unit} value={activeRoom.length} onChange={e => handleRoomChange(activeRoomId, 'length', e.target.value)} onFocus={handleInputFocus} error={activeRoomErrors['length']}/>
                <CalcInput id={`${activeRoomId}_width`} label="Ширина" unit={activeRoom.unit} value={activeRoom.width} onChange={e => handleRoomChange(activeRoomId, 'width', e.target.value)} onFocus={handleInputFocus} error={activeRoomErrors['width']}/>
                <CalcInput id={`${activeRoomId}_height`} label="Высота" unit={activeRoom.unit} value={activeRoom.height} onChange={e => handleRoomChange(activeRoomId, 'height', e.target.value)} onFocus={handleInputFocus} error={activeRoomErrors['height']}/>
            </div>
            <div className="card calc-summary-grid">
                <div><span>Площадь пола</span><strong>{activeRoomCalculations.floorArea.toFixed(2)} м²</strong></div>
                <div><span>Периметр</span><strong>{activeRoomCalculations.perimeter.toFixed(2)} м</strong></div>
                <div><span>Общая S стен</span><strong>{activeRoomCalculations.grossWallArea.toFixed(2)} м²</strong></div>
            </div>
            <div className="card">
                <div className="project-section-header">
                    <h3>Окна и двери</h3>
                    <button className="add-in-header-btn" onClick={handleAddOpening}><IconPlus/></button>
                </div>
                {activeRoom.openings.length > 0 && (
                    <div className="openings-list">
                        {activeRoom.openings.map(op => (
                            <div key={op.id} className="opening-item">
                                <div className="item-type-toggle">
                                    <button onClick={() => handleOpeningChange(op.id, 'type', 'window')} className={op.type === 'window' ? 'active' : ''}>Окно</button>
                                    <button onClick={() => handleOpeningChange(op.id, 'type', 'door')} className={op.type === 'door' ? 'active' : ''}>Дверь</button>
                                </div>
                                <div className="opening-inputs-wrapper">
                                    <CalcInput id={`op_${op.id}_height`} label="Высота" unit={activeRoom.unit} value={op.height} onChange={e => handleOpeningChange(op.id, 'height', e.target.value)} onFocus={handleInputFocus} placeholder="2.1" error={activeRoomErrors[`op_${op.id}_height`]} />
                                    <CalcInput id={`op_${op.id}_width`} label="Ширина" unit={activeRoom.unit} value={op.width} onChange={e => handleOpeningChange(op.id, 'width', e.target.value)} onFocus={handleInputFocus} placeholder="0.9" error={activeRoomErrors[`op_${op.id}_width`]} />
                                    <CalcInput id={`op_${op.id}_count`} label="Кол-во" unit="шт." value={op.count} onChange={e => handleOpeningChange(op.id, 'count', e.target.value)} onFocus={handleInputFocus} step="1" error={activeRoomErrors[`op_${op.id}_count`]}/>
                                </div>
                                <button onClick={() => handleRemoveOpening(op.id)} className="btn-tertiary" aria-label="Удалить проем"><IconTrash/></button>
                                {op.type === 'window' && (
                                    <div className="opening-options">
                                        <label className="checkbox-label">
                                            <input type="checkbox" checked={!!op.includeSillArea} onChange={e => handleOpeningChange(op.id, 'includeSillArea', e.target.checked)}/>
                                            <span>Отделывать стену под окном</span>
                                        </label>
                                        {op.includeSillArea && (
                                            <CalcInput id={`op_${op.id}_sillHeight`} label="Высота подоконника от пола" unit={activeRoom.unit} value={op.sillHeight || ''} onChange={e => handleOpeningChange(op.id, 'sillHeight', e.target.value)} onFocus={handleInputFocus} placeholder="0.9" error={activeRoomErrors[`op_${op.id}_sillHeight`]}/>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <div className="total-row total-row--with-border">
                    <span>Суммарная площадь проемов</span>
                    <strong>-{activeRoomCalculations.totalOpeningsArea.toFixed(2)} м²</strong>
                </div>
            </div>
            <div className="card">
                <div className="project-section-header">
                    <h3>Исключаемые участки (шкафы, фартуки)</h3>
                    <button className="add-in-header-btn" onClick={handleAddExclusion} aria-label="Добавить участок"><IconPlus/></button>
                </div>
                {activeRoom.exclusions.length > 0 && (
                    <div className="openings-list">
                        {activeRoom.exclusions.map(ex => (
                            <div key={ex.id} className="opening-item exclusion-item">
                                <div className="exclusion-item-content">
                                    <input type="text" placeholder="Название (напр. Шкаф)" value={ex.name} onChange={e => handleExclusionChange(ex.id, 'name', e.target.value)} onFocus={handleInputFocus} className={activeRoomErrors[`ex_${ex.id}_name`] ? 'invalid' : ''} />
                                    <div className="opening-inputs-wrapper">
                                        <CalcInput id={`ex_${ex.id}_height`} label="Высота" unit={activeRoom.unit} value={ex.height} onChange={e => handleExclusionChange(ex.id, 'height', e.target.value)} onFocus={handleInputFocus} error={activeRoomErrors[`ex_${ex.id}_height`]} />
                                        <CalcInput id={`ex_${ex.id}_width`} label="Ширина" unit={activeRoom.unit} value={ex.width} onChange={e => handleExclusionChange(ex.id, 'width', e.target.value)} onFocus={handleInputFocus} error={activeRoomErrors[`ex_${ex.id}_width`]} />
                                        <CalcInput id={`ex_${ex.id}_count`} label="Кол-во" unit="шт." value={ex.count} onChange={e => handleExclusionChange(ex.id, 'count', e.target.value)} onFocus={handleInputFocus} step="1" error={activeRoomErrors[`ex_${ex.id}_count`]}/>
                                    </div>
                                    <div className="opening-options exclusion-options">
                                        <label className="checkbox-label"><input type="checkbox" checked={ex.affectsWallArea} onChange={e => handleExclusionChange(ex.id, 'affectsWallArea', e.target.checked)}/><span>Влияет на площадь стен</span></label>
                                        <label className="checkbox-label"><input type="checkbox" checked={ex.affectsPerimeter} onChange={e => handleExclusionChange(ex.id, 'affectsPerimeter', e.target.checked)}/><span>Влияет на периметр (плинтус)</span></label>
                                    </div>
                                </div>
                                <button onClick={() => handleRemoveExclusion(ex.id)} className="btn-tertiary" aria-label="Удалить участок"><IconTrash/></button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="total-row total-row--with-border">
                    <span>Суммарная исключаемая площадь</span>
                    <strong>-{activeRoomCalculations.totalExclusionWallArea.toFixed(2)} м²</strong>
                </div>
            </div>
            <div className="card">
                <div className="project-section-header">
                    <h3>Сложная геометрия (ниши, колонны)</h3>
                    <button className="add-in-header-btn" onClick={handleAddGeometricElement} aria-label="Добавить элемент"><IconPlus/></button>
                </div>
                {activeRoom.geometricElements.length > 0 && (
                    <div className="openings-list">
                        {activeRoom.geometricElements.map(el => (
                            <div key={el.id} className="opening-item opening-item--flex">
                                <div className="opening-item__header">
                                    <div className="item-type-toggle">
                                        <button onClick={() => handleGeometricElementChange(el.id, 'type', 'niche')} className={el.type === 'niche' ? 'active' : ''}>Ниша</button>
                                        <button onClick={() => handleGeometricElementChange(el.id, 'type', 'protrusion')} className={el.type === 'protrusion' ? 'active' : ''}>Выступ</button>
                                        <button onClick={() => handleGeometricElementChange(el.id, 'type', 'column')} className={el.type === 'column' ? 'active' : ''}>Колонна</button>
                                    </div>
                                    <button onClick={() => handleRemoveGeometricElement(el.id)} className="btn-tertiary" aria-label="Удалить элемент"><IconTrash/></button>
                                </div>
                                {el.type === 'column' ? (
                                    <div className="opening-inputs-wrapper">
                                        <CalcInput id={`el_${el.id}_diameter`} label="Диаметр" unit={activeRoom.unit} value={el.diameter} onChange={e => handleGeometricElementChange(el.id, 'diameter', e.target.value)} onFocus={handleInputFocus} error={activeRoomErrors[`el_${el.id}_diameter`]} />
                                        <CalcInput id={`el_${el.id}_height`} label="Высота" unit={activeRoom.unit} value={el.height} onChange={e => handleGeometricElementChange(el.id, 'height', e.target.value)} onFocus={handleInputFocus} error={activeRoomErrors[`el_${el.id}_height`]} />
                                        <CalcInput id={`el_${el.id}_count`} label="Кол-во" unit="шт." value={el.count} onChange={e => handleGeometricElementChange(el.id, 'count', e.target.value)} onFocus={handleInputFocus} step="1" error={activeRoomErrors[`el_${el.id}_count`]}/>
                                    </div>
                                ) : (
                                    <div className="geometric-element-inputs">
                                        <div className="opening-inputs-wrapper">
                                            <CalcInput id={`el_${el.id}_width`} label="Ширина" unit={activeRoom.unit} value={el.width} onChange={e => handleGeometricElementChange(el.id, 'width', e.target.value)} onFocus={handleInputFocus} error={activeRoomErrors[`el_${el.id}_width`]} tooltip="Ширина элемента по стене"/>
                                            <CalcInput id={`el_${el.id}_depth`} label="Глубина" unit={activeRoom.unit} value={el.depth} onChange={e => handleGeometricElementChange(el.id, 'depth', e.target.value)} onFocus={handleInputFocus} error={activeRoomErrors[`el_${el.id}_depth`]} tooltip="Глубина/выступ элемента от стены"/>
                                            <CalcInput id={`el_${el.id}_height`} label="Высота" unit={activeRoom.unit} value={el.height} onChange={e => handleGeometricElementChange(el.id, 'height', e.target.value)} onFocus={handleInputFocus} error={activeRoomErrors[`el_${el.id}_height`]} />
                                        </div>
                                        <CalcInput id={`el_${el.id}_count`} label="Кол-во" unit="шт." value={el.count} onChange={e => handleGeometricElementChange(el.id, 'count', e.target.value)} onFocus={handleInputFocus} step="1" error={activeRoomErrors[`el_${el.id}_count`]}/>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <div className="total-row total-row--with-border">
                    <span>Суммарная добавляемая площадь</span>
                    <strong>+{activeRoomCalculations.geometryWallAreaChange.toFixed(2)} м²</strong>
                </div>
            </div>
            <div className="total-container card">
                <div className="total-row grand-total">
                    <span>Чистая площадь стен:</span>
                    <span>{activeRoomCalculations.netWallArea.toFixed(2)} м²</span>
                </div>
            </div>
            <div className="main-action-container">
                <button className="btn btn-primary" onClick={onProceed}>Перейти к расчету материалов</button>
            </div>
        </>
    );
};


const ResultsPage: React.FC<{
    rooms: RoomData[];
    materialResults: Record<string, MaterialResult | null>;
    onMaterialResultChange: (name: string, result: MaterialResult | null) => void;
    materials: SavedMaterial[];
    onSaveMaterial: (material: Omit<SavedMaterial, 'id'>) => void;
    onOpenSupplierRequest: () => void;
    session: Session | null;
    appState?: any;
    companyProfile?: any;
    projects?: any[];
    onOpenProjectSelection?: () => void;
    onConfirmCreateEstimate?: () => void;
}> = ({ rooms, materialResults, onMaterialResultChange, materials, onSaveMaterial, onOpenSupplierRequest, session, appState, companyProfile, projects = [], onOpenProjectSelection, onConfirmCreateEstimate }) => {
    
    const [activeFilters, setActiveFilters] = useState<string[]>(['Стены', 'Потолок', 'Пол', 'Произвольные']);
    
    // Получаем доступ к необходимым хукам
    const estimatesHook = useEstimates(session);
    const { activeProjectId } = useProjectContext();
    
    // Отладочная информация
    console.log('ResultsPage: activeProjectId из контекста:', activeProjectId);
    console.log('ResultsPage: appState.activeProjectId:', appState?.activeProjectId);

    const totalCalculations = useMemo(() => {
        // Fix: Explicitly type the accumulator ('totals') to prevent TypeScript from inferring it as `unknown`.
        return rooms.reduce((totals: { totalFloorArea: number; totalPerimeter: number; totalNetWallArea: number; totalDoorWidth: number; totalExclusionPerimeterLength: number; avgHeight: number; roomCount: number; }, room) => {
            const metrics = calculateRoomMetrics(room);
            totals.totalFloorArea += metrics.floorArea;
            totals.totalPerimeter += metrics.perimeter;
            totals.totalNetWallArea += metrics.netWallArea;
            totals.totalDoorWidth += metrics.totalDoorWidth;
            totals.totalExclusionPerimeterLength += metrics.totalExclusionPerimeterLength;

            totals.avgHeight = (totals.avgHeight * totals.roomCount + metrics.height) / (totals.roomCount + 1);
            totals.roomCount += 1;
            return totals;
        }, { totalFloorArea: 0, totalPerimeter: 0, totalNetWallArea: 0, totalDoorWidth: 0, totalExclusionPerimeterLength: 0, avgHeight: 0, roomCount: 0 });
    }, [rooms]);
    
    const totalCost = useMemo(() => {
        // Fix: Explicitly type the accumulator ('sum') to prevent TypeScript from inferring it as `unknown`.
        return Object.values(materialResults).reduce((sum: number, result: MaterialResult | null) => sum + (result?.cost || 0), 0);
    }, [materialResults]);

    // Состояние для модального окна создания сметы (удалено - используем EstimateNameModal)

    // Функция-коннектор для создания сметы из результатов калькулятора
    const handleCreateEstimateFromCalc = async () => {
        console.log('handleCreateEstimateFromCalc вызвана');
        
        // 1. Проверка наличия данных для создания сметы
        const hasData = Object.values(materialResults).some(result => result && result.quantity.trim());
        console.log('hasData:', hasData);
        
        if (!hasData) {
            safeShowAlert("Нет данных для создания сметы. Сначала выполните расчеты материалов.");
            return;
        }

        // 2. Открываем модальное окно выбора проекта
        console.log('onOpenProjectSelection:', onOpenProjectSelection);
        if (onOpenProjectSelection) {
            console.log('Вызываем onOpenProjectSelection');
            onOpenProjectSelection();
        } else {
            console.log('onOpenProjectSelection не передана');
            // Если нет функции выбора проекта, открываем модальное окно ввода названия
            // setIsEstimateNameModalOpen(true); // TODO: добавить состояние для модального окна
        }
    };




    const handleExportPdf = async () => {
        try {
            const PdfServiceInstance = await import('../../services/PdfService');

            // Собираем строки таблицы
            const rows: { name: string; quantity: string; cost: number | null }[] = [];
            MATERIAL_ORDER.forEach(name => {
                const result = materialResults[name];
                if (name === 'Произвольные материалы' && result?.isGroup && result.items) {
                    result.items.forEach(item => {
                        rows.push({ name: item.name, quantity: item.quantity, cost: item.cost > 0 ? item.cost : null });
                    });
                } else if (result && result.quantity) {
                    rows.push({ name, quantity: result.quantity.replace(/\n/g, ', '), cost: result.cost > 0 ? result.cost : null });
                }
            });

            await PdfServiceInstance.default.generateMaterialsEstimatePDF(
                {
                    floorArea: totalCalculations.totalFloorArea,
                    wallArea: totalCalculations.totalNetWallArea,
                    perimeter: totalCalculations.totalPerimeter,
                    totalCost,
                    date: new Date().toLocaleDateString('ru-RU')
                },
                rows,
                companyProfile || null
            );
        } catch (error) {
            console.error('Ошибка при экспорте PDF:', error);
            safeShowAlert('Ошибка при экспорте PDF. Попробуйте еще раз.');
        }
    };

    const filters = {
        'Стены': ['Черновая штукатурка (Стены)', 'Финишная шпаклевка (Стены)', 'Гипсокартон (Каркас)', 'Краска / Грунтовка', 'Обои', 'Плитка'],
        'Потолок': ['Черновая штукатурка (Потолок)', 'Финишная шпаклевка (Потолок)'],
        'Пол': ['Ламинат / Напольные покрытия', 'Стяжка / Наливной пол', 'Плинтус'],
        'Произвольные': ['Произвольные материалы']
    };

    const handleFilterToggle = (filter: string) => {
        setActiveFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]);
    };
    
    const visibleCalculators = new Set(activeFilters.flatMap(f => filters[f as keyof typeof filters]));
    
    const calculators: Record<string, React.ReactNode> = {
        "Черновая штукатурка (Стены)": <PlasterCalculator name="Черновая штукатурка (Стены)" onResultChange={onMaterialResultChange} area={totalCalculations.totalNetWallArea} materials={materials} />,
        "Черновая штукатурка (Потолок)": <PlasterCalculator name="Черновая штукатурка (Потолок)" onResultChange={onMaterialResultChange} area={totalCalculations.totalFloorArea} materials={materials} />,
        "Финишная шпаклевка (Стены)": <PuttyCalculator name="Финишная шпаклевка (Стены)" onResultChange={onMaterialResultChange} area={totalCalculations.totalNetWallArea} materials={materials} />,
        "Финишная шпаклевка (Потолок)": <PuttyCalculator name="Финишная шпаклевка (Потолок)" onResultChange={onMaterialResultChange} area={totalCalculations.totalFloorArea} materials={materials} />,
        "Гипсокартон (Каркас)": <DrywallCalculator name="Гипсокартон (Каркас)" onResultChange={onMaterialResultChange} wallArea={totalCalculations.totalNetWallArea} floorArea={totalCalculations.totalFloorArea} perimeter={totalCalculations.totalPerimeter} materials={materials} />,
        "Краска / Грунтовка": <PaintCalculator name="Краска / Грунтовка" onResultChange={onMaterialResultChange} wallArea={totalCalculations.totalNetWallArea} floorArea={totalCalculations.totalFloorArea} materials={materials} />,
        "Обои": <WallpaperCalculator name="Обои" onResultChange={onMaterialResultChange} perimeter={totalCalculations.totalPerimeter} height={totalCalculations.avgHeight} materials={materials} />,
        "Плитка": <TileCalculator name="Плитка" onResultChange={onMaterialResultChange} wallArea={totalCalculations.totalNetWallArea} floorArea={totalCalculations.totalFloorArea} materials={materials} />,
        "Ламинат / Напольные покрытия": <LaminateCalculator name="Ламинат / Напольные покрытия" onResultChange={onMaterialResultChange} floorArea={totalCalculations.totalFloorArea} materials={materials} />,
        "Стяжка / Наливной пол": <ScreedCalculator name="Стяжка / Наливной пол" onResultChange={onMaterialResultChange} floorArea={totalCalculations.totalFloorArea} materials={materials} />,
        "Плинтус": <SkirtingCalculator name="Плинтус" onResultChange={onMaterialResultChange} perimeter={totalCalculations.totalPerimeter} totalDoorWidth={totalCalculations.totalDoorWidth} totalExclusionWidth={totalCalculations.totalExclusionPerimeterLength} materials={materials} />,
        "Произвольные материалы": <ArbitraryMaterialsCalculator name="Произвольные материалы" onResultChange={onMaterialResultChange} materials={materials} onSaveMaterial={onSaveMaterial} />
    };

    return (
        <div className="material-calculators-list">
            <div className="card calc-summary-grid material-summary-grid">
                <div><span>S Пола (Общ.)</span><strong>{totalCalculations.totalFloorArea.toFixed(2)} м²</strong></div>
                <div><span>S Стены (Общ.)</span><strong>{totalCalculations.totalNetWallArea.toFixed(2)} м²</strong></div>
                <div><span>Периметр (Общ.)</span><strong>{totalCalculations.totalPerimeter.toFixed(2)} м</strong></div>
                <div><span>Помещений</span><strong>{totalCalculations.roomCount}</strong></div>
            </div>
            
            <div className="card summary-card--pinned">
                <h3 className="summary-card__title">Итоговая смета</h3>
                <div className="summary-list">
                    {MATERIAL_ORDER.map(name => {
                         if (name === 'Произвольные материалы') {
                            const arbitraryResult = materialResults['Произвольные материалы'];
                            if (arbitraryResult && arbitraryResult.isGroup && arbitraryResult.items) {
                                return arbitraryResult.items.map((item, index) => (
                                    <div className="summary-item" key={`arb-item-${index}-${item.name}`}>
                                        <span>{item.name}</span>
                                        <strong className="summary-item__value">
                                            {item.quantity}
                                            {item.cost > 0 && <><br/>{item.cost.toFixed(2)} ₽</>}
                                        </strong>
                                    </div>
                                ));
                            }
                            return null;
                        }

                        const result = materialResults[name];
                        if (!result || !result.quantity.trim()) return null;

                        return (
                            <div className="summary-item" key={name}>
                                <span>{name}</span>
                                <strong className="summary-item__value">
                                    {result.quantity}
                                    {result.cost > 0 && <><br/>{result.cost.toFixed(2)} ₽</>}
                                </strong>
                            </div>
                        );
                    })}
                </div>
                 <div className="summary-total-cost">
                    <span>Итого:</span>
                    <span>{totalCost.toFixed(2)} ₽</span>
                </div>
            </div>
            
            <div className="results-actions">
                <button className="btn btn-secondary" onClick={handleExportPdf}><IconPdf/> Экспорт в PDF</button>
                <button className="btn btn-secondary" onClick={onOpenSupplierRequest}><IconClipboard/> Заявка поставщику</button>
                <button 
                    className="btn btn-primary" 
                    onClick={() => {
                        console.log('Кнопка нажата!');
                        handleCreateEstimateFromCalc();
                    }}
                    title="Создать смету в проекте"
                >
                    <IconSave/> Создать смету в проекте
                </button>
            </div>
            
            <div className="filter-container">
                {Object.keys(filters).map(filter => (
                    <button key={filter} onClick={() => handleFilterToggle(filter)} className={`filter-btn ${activeFilters.includes(filter) ? 'active' : ''}`}>{filter}</button>
                ))}
            </div>

            {MATERIAL_ORDER.filter(name => visibleCalculators.has(name)).map(name => (
                <div key={name}>
                    {calculators[name as keyof typeof calculators]}
                </div>
            ))}

            {/* Модальное окно для создания сметы удалено - используем EstimateNameModal */}
        </div>
    );
};


const CalculatorView: React.FC<{
    rooms: RoomData[];
    setRooms: React.Dispatch<React.SetStateAction<RoomData[]>>;
    step: number;
    setStep: React.Dispatch<React.SetStateAction<number>>;
    activeRoomId: number;
    setActiveRoomId: React.Dispatch<React.SetStateAction<number>>;
    handleInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    onSaveEstimate: () => void;
    onLoadEstimate: () => void;
    onOpenLibrary: () => void;
    materials: SavedMaterial[];
    onSaveMaterial: (material: Omit<SavedMaterial, 'id'>) => void;
    materialResults: Record<string, MaterialResult | null>;
    onMaterialResultChange: (name: string, result: MaterialResult | null) => void;
    onOpenSupplierRequest: () => void;
    session: Session | null;
    appState?: any;
    companyProfile?: any;
    projects?: any[];
    onOpenProjectSelection?: () => void;
    onConfirmCreateEstimate?: () => void;
}> = ({ 
    rooms, setRooms, step, setStep, activeRoomId, setActiveRoomId,
    handleInputFocus, 
    onSaveEstimate, onLoadEstimate, onOpenLibrary, materials, onSaveMaterial, 
    materialResults, onMaterialResultChange, onOpenSupplierRequest, session, appState, companyProfile, projects, onOpenProjectSelection, onConfirmCreateEstimate
}) => {
    const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
    
    useEffect(() => {
        // When rooms data changes (e.g., loading an estimate), ensure the activeRoomId is valid.
        if (!rooms.some(r => r.id === activeRoomId) && rooms.length > 0) {
            setActiveRoomId(rooms[0].id);
        }
    }, [rooms, activeRoomId]);

    useEffect(() => {
        const newErrors: Record<string, Record<string, string>> = {};
        rooms.forEach(room => {
            const { id, length, width, height, openings, exclusions, geometricElements, unit } = room;
            newErrors[id] = newErrors[id] || {};

            const checkDimension = (valueStr: string | undefined, fieldName: string, min = 0.01, max = 100) => {
                if (!valueStr || !valueStr.trim()) { newErrors[id][fieldName] = 'Обязательное поле'; return; }
                const valueInMeters = convertToMeters(valueStr, unit);
                if (isNaN(valueInMeters) || valueInMeters < min) { newErrors[id][fieldName] = `> ${min * conversionFactors[unit]}`; return; }
                if (valueInMeters > max) { newErrors[id][fieldName] = `< ${max * conversionFactors[unit]}`; }
            };

            const checkCount = (valueStr: string, fieldName: string) => {
                if (!valueStr.trim()) { newErrors[id][fieldName] = 'Обязательное поле'; return; }
                const count = parseInt(valueStr.replace(',', '.'), 10);
                if (isNaN(count) || count < 1) newErrors[id][fieldName] = 'Мин. 1';
            };

            checkDimension(length, 'length');
            checkDimension(width, 'width');
            checkDimension(height, 'height');
            
            openings.forEach(op => {
                checkDimension(op.width, `op_${op.id}_width`);
                checkDimension(op.height, `op_${op.id}_height`);
                checkCount(op.count, `op_${op.id}_count`);
                if (op.includeSillArea) {
                    checkDimension(op.sillHeight, `op_${op.id}_sillHeight`);
                }
            });

            exclusions.forEach(ex => {
                checkDimension(ex.width, `ex_${ex.id}_width`);
                checkDimension(ex.height, `ex_${ex.id}_height`);
                checkCount(ex.count, `ex_${ex.id}_count`);
                if (!ex.name.trim()) newErrors[id][`ex_${ex.id}_name`] = 'Введите имя';
            });
            
            geometricElements.forEach(el => {
                checkDimension(el.height, `el_${el.id}_height`);
                checkCount(el.count, `el_${el.id}_count`);
                if (el.type === 'column') {
                    checkDimension(el.diameter, `el_${el.id}_diameter`);
                } else {
                    checkDimension(el.width, `el_${el.id}_width`);
                    checkDimension(el.depth, `el_${el.id}_depth`);
                }
            });
        });
        setErrors(newErrors);
    }, [rooms]);
    

    const canProceed = Object.values(errors).every(roomErrors => Object.keys(roomErrors).length === 0);

    const handleProceedClick = () => {
        if (!canProceed) {
            safeShowAlert('Пожалуйста, заполните все обязательные поля и исправьте ошибки. Поля с ошибками подсвечены красным.');
            return;
        }
        setStep(2);
        // Прокручиваем к самому верху страницы при переходе к расчету материалов
        setTimeout(() => {
            // Прокручиваем к самому началу документа
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            // Также прокручиваем основной контейнер приложения
            const mainContainer = document.querySelector('main');
            if (mainContainer) {
                mainContainer.scrollTop = 0;
            }
        }, 100);
    };

    const handleBackClick = () => {
        setStep(1);
        // Прокручиваем к самому верху страницы при переходе назад к вводу данных
        setTimeout(() => {
            // Прокручиваем к самому началу документа
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            // Также прокручиваем основной контейнер приложения
            const mainContainer = document.querySelector('main');
            if (mainContainer) {
                mainContainer.scrollTop = 0;
            }
        }, 100);
    };

    // Прокручиваем к самому верху при изменении экрана
    useEffect(() => {
        setTimeout(() => {
            // Прокручиваем к самому началу документа
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            // Также прокручиваем основной контейнер приложения
            const mainContainer = document.querySelector('main');
            if (mainContainer) {
                mainContainer.scrollTop = 0;
            }
        }, 100);
    }, [step]);

    return (
        <>
            <header className="calc-header">
                <div className="calc-header-left">
                    {step === 2 && <button onClick={handleBackClick} className="back-btn"><IconChevronRight style={{transform: 'rotate(180deg)'}} /></button>}
                    <h1>{step === 1 ? 'Параметры помещений' : 'Расчет материалов'}</h1>
                </div>
                <div className="header-actions">
                    <button onClick={onOpenLibrary} className="header-btn" aria-label="Библиотека материалов"><IconLibrary/></button>
                    <button onClick={onLoadEstimate} className="header-btn" aria-label="Загрузить расчет"><IconFolderOpen/></button>
                    <button onClick={onSaveEstimate} className="header-btn" aria-label="Сохранить расчет"><IconSave/></button>
                </div>
            </header>
            <main>
                {step === 1 ? (
                    <RoomEditor
                        rooms={rooms}
                        setRooms={setRooms}
                        activeRoomId={activeRoomId}
                        setActiveRoomId={setActiveRoomId}
                        errors={errors}
                        handleInputFocus={handleInputFocus}
                        onProceed={handleProceedClick}
                    />
                ) : (
                    <ResultsPage
                        rooms={rooms}
                        materialResults={materialResults}
                        onMaterialResultChange={onMaterialResultChange}
                        materials={materials}
                        onSaveMaterial={onSaveMaterial}
                        onOpenSupplierRequest={onOpenSupplierRequest}
                        session={session}
                        appState={appState}
                        companyProfile={companyProfile}
                        projects={projects}
                        onOpenProjectSelection={onOpenProjectSelection}
                        onConfirmCreateEstimate={onConfirmCreateEstimate}
                    />
                )}
            </main>
        </>
    );
};
// --- END OF DECOMPOSED VIEW COMPONENTS ---


const getDefaultRoom = (): RoomData => ({
    id: Date.now(),
    name: 'Комната 1',
    length: '',
    width: '',
    height: '',
    openings: [],
    exclusions: [],
    geometricElements: [],
    unit: 'm',
});

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button onClick={onClose} className="close-btn"><IconClose /></button>
                </div>
                {children}
            </div>
        </div>
    );
};

const SaveEstimateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const date = new Date();
            const defaultName = `Расчет от ${date.toLocaleDateString()}`;
            setName(defaultName);
            setTimeout(() => inputRef.current?.select(), 100);
        }
    }, [isOpen]);

    const handleSaveClick = () => {
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Сохранить расчет">
            <div className="modal-body">
                <CalcInput id="estimateName" label="Название расчета" value={name} onChange={e => setName(e.target.value)} ref={inputRef} type="text" />
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
                <button className="btn btn-primary" onClick={handleSaveClick} disabled={!name.trim()}>Сохранить</button>
            </div>
        </Modal>
    );
};

const LoadEstimateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    estimates: SavedEstimate[];
    onLoad: (id: number) => void;
    onDelete: (id: number) => void;
}> = ({ isOpen, onClose, estimates, onLoad, onDelete }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Загрузить расчет">
            <div className="modal-body">
                {estimates.length > 0 ? (
                    <div className="estimates-list">
                        {estimates.slice().reverse().map(est => (
                            <div key={est.id} className="estimate-item">
                                <div className="estimate-info">
                                    <strong>{est.name}</strong>
                                    <span>{formatDate(est.date)}</span>
                                </div>
                                <div className="estimate-actions">
                                    <button onClick={() => onDelete(est.id)} className="btn-tertiary" style={{ padding: '8px' }} aria-label="Удалить"><IconTrash /></button>
                                    <button onClick={() => onLoad(est.id)} className="btn btn-primary">Загрузить</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-results-message">Сохраненных расчетов нет.</p>
                )}
            </div>
        </Modal>
    );
};

const MaterialLibraryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    materials: SavedMaterial[];
    onSave: (material: Omit<SavedMaterial, 'id'>) => void;
    onDelete: (id: number) => void;
}> = ({ isOpen, onClose, materials, onSave, onDelete }) => {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [name, setName] = useState('');
    const [category, setCategory] = useState<MaterialCategory>('plaster');
    const [params, setParams] = useState<Record<string, string>>({});

    const categories: Record<MaterialCategory, string> = {
        plaster: 'Штукатурка',
        putty: 'Шпаклевка',
        paint: 'Краска/Грунтовка',
        wallpaper: 'Обои',
        tile: 'Плитка',
        flooring: 'Напольные покрытия',
        screed: 'Стяжка/Наливной пол',
        skirting: 'Плинтус',
        drywall: 'Гипсокартон',
        arbitrary: 'Произвольный материал'
    };
    
    const categoryFields: Record<MaterialCategory, {key: string, label: string, unit: string, type?: 'text' | 'number'}[]> = {
        plaster: [{key: 'thickness', label: 'Толщина', unit: 'мм'}, {key: 'consumption', label: 'Расход', unit: 'кг/мм/м²'}, {key: 'bagWeight', label: 'Вес мешка', unit: 'кг'}, {key: 'price', label: 'Цена', unit: '₽'}],
        putty: [{key: 'thickness', label: 'Толщина', unit: 'мм'}, {key: 'consumption', label: 'Расход', unit: 'кг/мм/м²'}, {key: 'bagWeight', label: 'Вес мешка', unit: 'кг'}, {key: 'price', label: 'Цена', unit: '₽'}],
        paint: [{key: 'consumption', label: 'Расход', unit: 'л/м²'}, {key: 'volume', label: 'Объем тары', unit: 'л'}, {key: 'price', label: 'Цена', unit: '₽'}],
        wallpaper: [{key: 'rollLength', label: 'Длина рулона', unit: 'м'}, {key: 'rollWidth', label: 'Ширина рулона', unit: 'м'}, {key: 'rapport', label: 'Раппорт', unit: 'см'}, {key: 'price', label: 'Цена', unit: '₽'}],
        tile: [{key: 'width', label: 'Ширина', unit: 'см'}, {key: 'height', label: 'Высота', unit: 'см'}, {key: 'packSize', label: 'Плиток в уп.', unit: 'шт'}, {key: 'price', label: 'Цена за уп.', unit: '₽'}],
        flooring: [{key: 'packArea', label: 'Площадь в уп.', unit: 'м²'}, {key: 'price', label: 'Цена за уп.', unit: '₽'}],
        screed: [{key: 'thickness', label: 'Толщина', unit: 'мм'}, {key: 'consumption', label: 'Расход', unit: 'кг/мм/м²'}, {key: 'bagWeight', label: 'Вес мешка', unit: 'кг'}, {key: 'price', label: 'Цена', unit: '₽'}],
        skirting: [{key: 'length', label: 'Длина планки', unit: 'м'}, {key: 'price', label: 'Цена', unit: '₽'}],
        drywall: [{key: 'width', label: 'Ширина листа', unit: 'м'}, {key: 'length', label: 'Длина листа', unit: 'м'}],
        arbitrary: [{key: 'unit', label: 'Ед. изм.', unit: '', type: 'text'}, {key: 'price', label: 'Цена за ед.', unit: '₽'}]
    };

    const handleParamChange = (key: string, value: string) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };
    
    const resetForm = () => {
        setName('');
        setCategory('plaster');
        setParams({});
    };

    const handleSaveClick = () => {
        if (!name.trim()) return;
        onSave({ name, category, params });
        setView('list');
        resetForm();
    };
    
    const handleNewClick = () => {
        resetForm();
        setView('form');
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Библиотека материалов">
            {view === 'list' ? (
                <>
                    <div className="modal-body">
                        {materials.length > 0 ? (
                             <div className="estimates-list">
                                {materials.map(mat => (
                                    <div key={mat.id} className="estimate-item material-item">
                                        <div className="estimate-info">
                                            <strong>{mat.name}</strong>
                                            <span>{categories[mat.category]}</span>
                                        </div>
                                        <div className="estimate-actions">
                                            <button onClick={() => onDelete(mat.id)} className="btn-tertiary" style={{ padding: '8px' }} aria-label="Удалить"><IconTrash /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <p className="no-results-message">Сохраненных материалов нет.</p>
                        )}
                    </div>
                     <div className="modal-footer">
                        <button className="btn btn-primary" onClick={handleNewClick}>Добавить новый</button>
                    </div>
                </>
            ) : (
                <>
                    <div className="modal-body">
                        <CalcInput id="matName" label="Название материала" value={name} onChange={e => setName(e.target.value)} type="text" />
                        <div className="calc-input-group">
                             <label htmlFor="matCat">Категория</label>
                             <select id="matCat" value={category} onChange={e => setCategory(e.target.value as MaterialCategory)}>
                                {Object.entries(categories).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                            </select>
                        </div>
                        <div className="form-grid">
                            {categoryFields[category].map(field => (
                                <CalcInput key={field.key} id={`matParam-${field.key}`} label={field.label} unit={field.unit} value={params[field.key] || ''} onChange={e => handleParamChange(field.key, e.target.value)} type={field.type || 'number'} />
                            ))}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setView('list')}>Назад</button>
                        <button className="btn btn-primary" onClick={handleSaveClick} disabled={!name.trim()}>Сохранить</button>
                    </div>
                </>
            )}
        </Modal>
    );
};

interface RequestItem {
    id: number;
    name: string;
    quantity: string;
    unit: string;
    note: string;
}

const SupplierRequestModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    materialResults: Record<string, MaterialResult | null>;
    companyProfile?: any;
}> = ({ isOpen, onClose, materialResults, companyProfile }) => {
    const [requestItems, setRequestItems] = useState<RequestItem[]>([]);
    const [copyButtonText, setCopyButtonText] = useState('Скопировать');

    const parseQuantityString = useCallback((str: string | undefined): { quantity: string; unit: string } => {
        if (!str) return { quantity: '1', unit: 'шт.' };

        const complexMatch = str.match(/\(≈\s*([\d.,]+)\s*([^)]+)\)/);
        if (complexMatch) return { quantity: complexMatch[1].replace(',', '.'), unit: complexMatch[2].trim() };

        const approxMatch = str.match(/≈\s*([\d.,]+)\s*(.*)/);
        if (approxMatch) return { quantity: approxMatch[1].replace(',', '.'), unit: approxMatch[2].trim() };
        
        const simpleMatch = str.match(/([\d.,]+)\s*(.*)/);
        if (simpleMatch) return { quantity: simpleMatch[1].replace(',', '.'), unit: simpleMatch[2].trim() };

        return { quantity: str, unit: 'шт.' };
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const generatedItems: RequestItem[] = [];
        let idCounter = 0;

        MATERIAL_ORDER.forEach(name => {
            const result = materialResults[name];
            if (!result || !result.quantity) return;

            if (name === 'Гипсокартон (Каркас)' && result.details) {
                Object.entries(result.details).forEach(([itemName, itemQuantity]) => {
                    const parsed = parseQuantityString(itemQuantity);
                    generatedItems.push({ id: idCounter++, name: itemName, quantity: parsed.quantity, unit: parsed.unit, note: '' });
                });
            } else if (name === 'Ламинат / Напольные покрытия' && result.details) {
                const laminateParsed = parseQuantityString(result.details['Ламинат']);
                generatedItems.push({ id: idCounter++, name: 'Ламинат', quantity: laminateParsed.quantity, unit: laminateParsed.unit, note: '' });
                const underlayParsed = parseQuantityString(result.details['Подложка']);
                generatedItems.push({ id: idCounter++, name: 'Подложка', quantity: underlayParsed.quantity, unit: underlayParsed.unit, note: '' });
            } else if (name === 'Произвольные материалы' && result.isGroup && result.items) {
                result.items.forEach(item => {
                    const parsed = parseQuantityString(item.quantity);
                    generatedItems.push({ id: idCounter++, name: item.name, quantity: parsed.quantity, unit: parsed.unit, note: '' });
                });
            } else if (result.quantity.trim()) {
                 const parsed = parseQuantityString(result.quantity);
                 generatedItems.push({ id: idCounter++, name: name, quantity: parsed.quantity, unit: parsed.unit, note: '' });
            }
        });

        setRequestItems(generatedItems);
        setCopyButtonText('Скопировать');
    }, [isOpen, materialResults, parseQuantityString]);

    const handleItemChange = (id: number, field: keyof Omit<RequestItem, 'id'>, value: string) => {
        setRequestItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleRemoveItem = (id: number) => {
        setRequestItems(prev => prev.filter(item => item.id !== id));
    };
    
    const formatRequestText = useCallback(() => {
        let text = '*Заявка на материалы*\n\n';
        requestItems.forEach(item => {
            if (item.name.trim() && item.quantity.trim()) {
                text += `- ${item.name.trim()}: ${item.quantity.trim()} ${item.unit.trim()}`;
                if (item.note.trim()) {
                    text += ` (Примечание: ${item.note.trim()})`;
                }
                text += '\n';
            }
        });
        return text;
    }, [requestItems]);

    const handleCopyToClipboard = async () => {
        const text = formatRequestText();
        
        // Используем надежную функцию копирования
        const success = await copyToClipboard(text);
        
        if (success) {
            setCopyButtonText('Скопировано!');
            tg?.HapticFeedback.notificationOccurred('success');
            setTimeout(() => setCopyButtonText('Скопировать'), 2000);
        } else {
            safeShowAlert('Не удалось скопировать текст. Попробуйте выделить и скопировать вручную.');
        }
    };

    const handleExportPDF = async () => {
        try {
            const PdfServiceInstance = await import('../../services/PdfService');
            
            // Отладочная информация
            
            // Преобразуем requestItems в формат для PDF
            const pdfItems = requestItems.map(item => ({
                name: item.name,
                quantity: parseFloat(item.quantity) || 0,
                unit: item.unit,
                note: item.note
            }));
            
            await PdfServiceInstance.default.generateSupplierRequestPDF(
                pdfItems,
                companyProfile
            );
        } catch (error) {
            console.error('PDF generation error:', error);
            safeShowAlert('Ошибка при генерации PDF');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Заявка поставщику">
            <div className="modal-body">
                {requestItems.length > 0 ? (
                    <div className="supplier-request-list">
                        {requestItems.map(item => (
                            <div key={item.id} className="supplier-request-item">
                                <input 
                                    type="text" 
                                    value={item.name} 
                                    onChange={e => handleItemChange(item.id, 'name', e.target.value)} 
                                    placeholder="Название"
                                    className="supplier-item-name"
                                />
                                <div className="supplier-item-details">
                                    <input type="text" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} placeholder="Кол-во" />
                                    <input type="text" value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} placeholder="Ед. изм." />
                                </div>
                                <button onClick={() => handleRemoveItem(item.id)} className="btn-tertiary" aria-label="Удалить"><IconTrash/></button>
                                <input 
                                    type="text" 
                                    value={item.note} 
                                    onChange={e => handleItemChange(item.id, 'note', e.target.value)} 
                                    placeholder="Примечание (например, марка, цвет)"
                                    className="supplier-item-note"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                     <p className="no-results-message">Нет материалов для заявки. Сначала произведите расчет.</p>
                )}
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary" onClick={handleCopyToClipboard}>{copyButtonText}</button>
                <button className="btn btn-primary" onClick={handleExportPDF}>Экспорт в PDF</button>
            </div>
        </Modal>
    );
};

interface CalculatorModuleProps {
    // The config prop has been removed as theme management is now handled 
    // by the parent application via a wrapper CSS class.
    appState?: any;
    companyProfile?: any;
    projects?: any[];
}

export const CalculatorModule: React.FC<CalculatorModuleProps> = ({ appState, companyProfile, projects = [] }) => {
    useEffect(() => {
        document.documentElement.lang = 'ru';
    }, []);

    // Состояние для модального окна выбора проекта
    const [isProjectSelectionModalOpen, setIsProjectSelectionModalOpen] = useState(false);
    const [isEstimateNameModalOpen, setIsEstimateNameModalOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedProjectName, setSelectedProjectName] = useState<string>('');
    const [estimateName, setEstimateName] = useState('');

    // Обработчик выбора проекта
    const handleProjectSelect = (project: any) => {
        setSelectedProjectId(project.id);
        setSelectedProjectName(project.name);
        setEstimateName(`Смета из калькулятора от ${new Date().toLocaleDateString('ru-RU')}`);
        setIsProjectSelectionModalOpen(false);
        setIsEstimateNameModalOpen(true);
        
        // Устанавливаем активный проект в контексте
        if (appState && appState.setActiveProjectId) {
            appState.setActiveProjectId(project.id);
        }
    };

    // Функция для открытия модального окна выбора проекта
    const handleOpenProjectSelection = () => {
        console.log('handleOpenProjectSelection вызвана');
        console.log('projects:', projects);
        console.log('isProjectSelectionModalOpen до:', isProjectSelectionModalOpen);
        setIsProjectSelectionModalOpen(true);
        console.log('setIsProjectSelectionModalOpen(true) вызвана');
        setTimeout(() => {
            console.log('isProjectSelectionModalOpen после:', isProjectSelectionModalOpen);
        }, 100);
    };

    // Функция для создания сметы из калькулятора
    const handleConfirmCreateEstimate = async (name: string) => {
        if (!name.trim()) {
            safeShowAlert("Введите название сметы.");
            return;
        }

        // Преобразование данных калькулятора в формат сметы
        const newEstimateItems = Object.entries(materialResults)
            .filter(([_, result]) => result && result.quantity.trim())
            .flatMap(([name, result]) => {
                if (name === 'Произвольные материалы' && result?.isGroup && result.items) {
                    // Для произвольных материалов создаем отдельные позиции
                    return result.items.map(item => ({
                        id: crypto.randomUUID(),
                        name: item.name,
                        quantity: parseFloat(item.quantity) || 0,
                        unit: 'шт',
                        price: item.cost / (parseFloat(item.quantity) || 1),
                        type: 'material' as const,
                        image: null
                    }));
                } else if (result) {
                    // Для обычных материалов
                    
                    // Извлекаем количество упаковок из строки (например, "330 кг (≈ 11 меш.)" -> 11)
                    const quantityMatch = result.quantity.match(/≈ (\d+(?:[.,]\d+)?)/);
                    const quantity = quantityMatch ? parseFloat(quantityMatch[1].replace(',', '.')) : 1;
                    
                    // Извлекаем цену за единицу из details
                    const pricePerUnit = result.details && result.details['Цена за мешок'] 
                        ? parseFloat(result.details['Цена за мешок'].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
                        : result.details && result.details['Цена за банку']
                        ? parseFloat(result.details['Цена за банку'].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
                        : result.details && result.details['Цена за рулон']
                        ? parseFloat(result.details['Цена за рулон'].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
                        : result.details && result.details['Цена за упаковку']
                        ? parseFloat(result.details['Цена за упаковку'].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
                        : result.details && result.details['Цена за планку']
                        ? parseFloat(result.details['Цена за планку'].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
                        : 0;
                    
                    return {
                        id: crypto.randomUUID(),
                        name: name,
                        quantity: quantity, // Используем извлеченное количество
                        unit: result.unit || 'комплект', // Используем реальную единицу измерения
                        price: pricePerUnit, // Используем цену за единицу
                        type: 'material' as const,
                        image: null
                    };
                }
                return [];
            })
            .filter(Boolean);

        // ПРАВИЛЬНЫЙ ПОРЯДОК ДЕЙСТВИЙ
        try {
            
            // 1. Проверяем наличие проекта (используем appState.activeProjectId)
            const currentProjectId = appState?.activeProjectId || selectedProjectId;
            console.log('currentProjectId:', currentProjectId);
            if (!currentProjectId) {
                safeShowAlert("Ошибка: Не выбран проект.");
                return;
            }
            
            // 2. Получаем данные из калькулятора (это уже должно быть)
            // newEstimateItems уже созданы выше
            console.log('newEstimateItems:', newEstimateItems);
            
            // 3. Создаем ОБЪЕКТ новой сметы
            const newEstimateObject = estimatesHook.createNewEstimate(currentProjectId);
            console.log('newEstimateObject:', newEstimateObject);
            
            // 4. Дополняем объект данными из формы и калькулятора
            newEstimateObject.number = `К-${Date.now().toString().slice(-6)}`; // Номер сметы
            newEstimateObject.items = newEstimateItems; // Позиции из калькулятора
            newEstimateObject.clientInfo = name; // Название из модального окна
            console.log('newEstimateObject после дополнения:', newEstimateObject);
            
            // 5. ---- КЛЮЧЕВОЙ ШАГ ----
            // Используем новый метод прямого сохранения сметы
            
            // 6. Сохраняем смету напрямую, не завися от currentEstimate
            try {
                console.log('Сохраняем смету с project_id:', newEstimateObject.project_id);
                await estimatesHook.saveEstimateDirectly(newEstimateObject);
                console.log('Смета сохранена успешно');
                
                // Закрываем модальное окно
                setIsEstimateNameModalOpen(false);
                
                safeShowAlert(`Смета "${name}" успешно создана!`);
                
                // Перенаправление пользователя на страницу проекта
                if (appState) {
                    console.log('Переходим к проекту:', currentProjectId);
                    appState.navigateToProject(currentProjectId);
                }
            } catch (saveError) {
                console.error("Ошибка при сохранении сметы:", saveError);
                safeShowAlert("Не удалось сохранить смету. Попробуйте еще раз.");
            }
            
        } catch (error) {
            console.error("Ошибка при создании сметы:", error);
            safeShowAlert("Не удалось создать смету. Попробуйте еще раз.");
        }
    };

    // Функция для создания сметы удалена - используем handleConfirmCreateEstimate

    // Получаем сессию пользователя
    const [session, setSession] = useState<Session | null>(null);
    
    // Получаем доступ к хуку смет
    const estimatesHook = useEstimates(session);
    
    useEffect(() => {
        const getSession = async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);
        };
        
        getSession();
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        
        return () => subscription.unsubscribe();
    }, []);

    // Calculator navigation state
    const [step, setStep] = useState(() => {
        const savedState = dataService.getCalculatorState();
        return savedState.step;
    });
    const [activeRoomId, setActiveRoomId] = useState(() => {
        const savedState = dataService.getCalculatorState();
        const rooms = savedState.rooms.length > 0 ? savedState.rooms : [getDefaultRoom()];
        return savedState.activeRoomId || rooms[0]?.id || 0;
    });

    const [rooms, setRooms] = useState<RoomData[]>(() => {
        const savedState = dataService.getCalculatorState();
        return savedState.rooms.length > 0 ? savedState.rooms : [getDefaultRoom()];
    });
    const [isSaveModalOpen, setSaveModalOpen] = useState(false);
    const [isLoadModalOpen, setLoadModalOpen] = useState(false);
    const [isLibraryOpen, setLibraryOpen] = useState(false);
    const [isSupplierRequestModalOpen, setSupplierRequestModalOpen] = useState(false);
    const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>([]);
    const [savedMaterials, setSavedMaterials] = useState<SavedMaterial[]>([]);
    const [materialResults, setMaterialResults] = useState<Record<string, MaterialResult | null>>({});

    const handleMaterialResultChange = useCallback((name: string, result: MaterialResult | null) => {
        setMaterialResults(prev => ({ ...prev, [name]: result }));
    }, []);

    // Save calculator state to localStorage when it changes
    useEffect(() => {
        dataService.setCalculatorState({ step, activeRoomId, rooms });
    }, [step, activeRoomId, rooms]);

    // Autosave current session and calculator state
    useEffect(() => {
        const isDefaultState = rooms.length === 1 &&
                               !rooms[0].length &&
                               !rooms[0].width &&
                               !rooms[0].height &&
                               rooms[0].openings.length === 0 &&
                               rooms[0].exclusions.length === 0 &&
                               rooms[0].geometricElements.length === 0;

        if (isDefaultState) return;

        try {
            // Save to legacy autosave for backward compatibility
            const data = JSON.stringify(rooms);
            localStorage.setItem('autosavedRooms', data);
            
            // Also save to calculator state
            const savedState = dataService.getCalculatorState();
            dataService.setCalculatorState({ 
                ...savedState, 
                rooms: rooms 
            });
        } catch (error) {
            console.error("Failed to autosave rooms:", error);
        }
    }, [rooms]);

    // Load saved data on initial mount
    useEffect(() => {
        const loadSavedData = async () => {
            try {
                // Загружаем из localStorage
                const estimatesData = localStorage.getItem('savedEstimates');
                if (estimatesData) setSavedEstimates(JSON.parse(estimatesData));

                const materialsData = localStorage.getItem('savedMaterials');
                if (materialsData) setSavedMaterials(JSON.parse(materialsData));
                
                // Загружаем из Supabase, если есть сессия
                if (session?.user) {
                    try {
                        const { data, error } = await supabase
                            .from('calculations')
                            .select('*')
                            .eq('user_id', session.user.id)
                            .order('created_at', { ascending: false });
                        
                        if (error) {
                            console.error("Ошибка загрузки расчетов из Supabase:", error);
                        } else if (data && data.length > 0) {
                            // Преобразуем данные из Supabase в формат SavedEstimate
                            const supabaseEstimates: SavedEstimate[] = data.map(calc => ({
                                id: Date.now() + Math.random(), // Генерируем уникальный ID
                                name: calc.name,
                                date: calc.created_at,
                                rooms: calc.calculation_data?.rooms || []
                            }));
                            
                            // Объединяем с данными из localStorage
                            const localEstimates = estimatesData ? JSON.parse(estimatesData) : [];
                            const allEstimates = [...supabaseEstimates, ...localEstimates];
                            
                            // Удаляем дубликаты по названию и дате
                            const uniqueEstimates = allEstimates.filter((estimate, index, self) => 
                                index === self.findIndex(e => e.name === estimate.name && e.date === estimate.date)
                            );
                            
                            setSavedEstimates(uniqueEstimates);
                            localStorage.setItem('savedEstimates', JSON.stringify(uniqueEstimates));
                        }
                    } catch (supabaseError) {
                        console.error("Ошибка при загрузке из Supabase:", supabaseError);
                    }
                }
            } catch (error) {
                console.error("Failed to load data from storage:", error);
            }
        };
        
        loadSavedData();
    }, [session?.user]);

    // Load autosaved data
    useEffect(() => {
        try {
            const autosavedData = localStorage.getItem('autosavedRooms');
            if (autosavedData) {
                const restoredRooms = JSON.parse(autosavedData);
                if (Array.isArray(restoredRooms) && restoredRooms.length > 0) {
                    // Автоматически восстанавливаем данные без модального окна
                    setRooms(restoredRooms);
                    tg?.HapticFeedback.notificationOccurred('success');
                    localStorage.removeItem('autosavedRooms');
                }
            }
        } catch (error) {
            console.error("Failed to load autosaved session:", error);
            localStorage.removeItem('autosavedRooms');
        }
    }, []);
    
    useEffect(() => {
        try {
            tg?.ready();
            tg?.expand();
            tg?.disableVerticalSwipes();
        } catch (error) {
            console.error("Failed to initialize Telegram Web App:", error);
        }
    }, []);
    
    const handleInputFocus = (e: React.FocusEvent<HTMLElement>) => {
        setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    const handleOpenSaveModal = () => {
        if (rooms.length === 1 && rooms[0].length.trim() === '' && rooms[0].width.trim() === '' && rooms[0].height.trim() === '') {
            safeShowAlert('Нет данных для сохранения. Пожалуйста, введите параметры помещения.');
            return;
        }
        setSaveModalOpen(true);
    };
    
    const handleOpenLoadModal = () => {
        if (savedEstimates.length === 0) {
            safeShowAlert('Сохраненные расчеты не найдены.');
            return;
        }
        setLoadModalOpen(true);
    };

    const handleSaveEstimate = async (name: string) => {
        const newEstimate: SavedEstimate = { id: Date.now(), name, date: new Date().toISOString(), rooms };
        const updatedEstimates = [...savedEstimates, newEstimate];
        
        try {
            // Сохраняем в localStorage
            localStorage.setItem('savedEstimates', JSON.stringify(updatedEstimates));
            localStorage.removeItem('autosavedRooms'); // Clear autosave on successful formal save
            setSavedEstimates(updatedEstimates);
            
            // Сохраняем в Supabase, если есть сессия
            if (session?.user) {
                try {
                    const calculationData = {
                        name: name,
                        calculation_data: {
                            date: new Date().toISOString(),
                            version: "1.0",
                            rooms: rooms,
                            materialResults: materialResults
                        }
                    };
                    
                    const { error } = await supabase
                        .from('calculations')
                        .insert({
                            user_id: session.user.id,
                            name: name,
                            calculation_data: calculationData.calculation_data
                        });
                    
                    if (error) {
                        console.error("Ошибка сохранения в Supabase:", error);
                        // Не показываем ошибку пользователю, так как localStorage сохранение прошло успешно
                    } else {
                        console.log("Расчет успешно сохранен в Supabase");
                    }
                } catch (supabaseError) {
                    console.error("Ошибка при сохранении в Supabase:", supabaseError);
                    // Не показываем ошибку пользователю, так как localStorage сохранение прошло успешно
                }
            }
            
            setSaveModalOpen(false);
            tg?.HapticFeedback.notificationOccurred('success');
            safeShowAlert('Расчет успешно сохранен!');
        } catch (error) {
            console.error("Failed to save estimate:", error);
            safeShowAlert('Не удалось сохранить расчет. Возможно, хранилище переполнено.');
        }
    };
    
    const handleLoadEstimate = (id: number) => {
        const estimateToLoad = savedEstimates.find(e => e.id === id);
        if (!estimateToLoad) return;

        // Автоматически загружаем данные без модального окна
        setRooms(estimateToLoad.rooms);
        setLoadModalOpen(false);
        tg?.HapticFeedback.notificationOccurred('success');
    };

    const handleDeleteEstimate = (id: number) => {
        const estimateToDelete = savedEstimates.find(e => e.id === id);
        if (!estimateToDelete) return;

        safeShowConfirm(`Вы уверены, что хотите удалить расчет "${estimateToDelete.name}"?`, (ok) => {
            if (ok) {
                const updatedEstimates = savedEstimates.filter(e => e.id !== id);
                localStorage.setItem('savedEstimates', JSON.stringify(updatedEstimates));
                setSavedEstimates(updatedEstimates);
            }
        });
    };
    
    const handleSaveMaterial = (material: Omit<SavedMaterial, 'id'>) => {
        const newMaterial = { ...material, id: Date.now() };
        const updatedMaterials = [...savedMaterials, newMaterial];
        setSavedMaterials(updatedMaterials);
        localStorage.setItem('savedMaterials', JSON.stringify(updatedMaterials));
    };

    const handleDeleteMaterial = (id: number) => {
        const updatedMaterials = savedMaterials.filter(m => m.id !== id);
        setSavedMaterials(updatedMaterials);
        localStorage.setItem('savedMaterials', JSON.stringify(updatedMaterials));
    };


    return (
        <>
            <div className="app-container">
                <CalculatorView
                    rooms={rooms}
                    setRooms={setRooms}
                    step={step}
                    setStep={setStep}
                    activeRoomId={activeRoomId}
                    setActiveRoomId={setActiveRoomId}
                    handleInputFocus={handleInputFocus}
                    onSaveEstimate={handleOpenSaveModal}
                    onLoadEstimate={handleOpenLoadModal}
                    onOpenLibrary={() => setLibraryOpen(true)}
                    materials={savedMaterials}
                    onSaveMaterial={handleSaveMaterial}
                    materialResults={materialResults}
                    onMaterialResultChange={handleMaterialResultChange}
                    onOpenSupplierRequest={() => setSupplierRequestModalOpen(true)}
                    session={session}
                    appState={appState}
                    companyProfile={companyProfile}
                    projects={projects}
                    onOpenProjectSelection={handleOpenProjectSelection}
                    onConfirmCreateEstimate={() => {
                        // Открываем модальное окно для ввода названия сметы
                        setIsEstimateNameModalOpen(true);
                    }}
                />
            </div>
            <SaveEstimateModal isOpen={isSaveModalOpen} onClose={() => setSaveModalOpen(false)} onSave={handleSaveEstimate} />
            <LoadEstimateModal 
                isOpen={isLoadModalOpen} 
                onClose={() => setLoadModalOpen(false)} 
                estimates={savedEstimates} 
                onLoad={handleLoadEstimate} 
                onDelete={handleDeleteEstimate} 
            />
            <MaterialLibraryModal
                isOpen={isLibraryOpen}
                onClose={() => setLibraryOpen(false)}
                materials={savedMaterials}
                onSave={handleSaveMaterial}
                onDelete={handleDeleteMaterial}
            />
            <SupplierRequestModal
                isOpen={isSupplierRequestModalOpen}
                onClose={() => setSupplierRequestModalOpen(false)}
                materialResults={materialResults}
                companyProfile={companyProfile}
            />
            {/* Модальное окно выбора проекта */}
            <ProjectSelectionModal
                isOpen={isProjectSelectionModalOpen}
                projects={projects}
                onSelectProject={handleProjectSelect}
                onClose={() => setIsProjectSelectionModalOpen(false)}
                title="Выберите проект для создания сметы"
            />

            {/* Модальное окно ввода названия сметы */}
            <EstimateNameModal
                isOpen={isEstimateNameModalOpen}
                onClose={() => setIsEstimateNameModalOpen(false)}
                onConfirm={handleConfirmCreateEstimate}
                initialName={estimateName}
            />
        </>
    );
};
