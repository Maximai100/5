-- Создание таблиц для смет в Supabase
-- Выполните этот скрипт в Supabase SQL Editor

-- =====================================================
-- СОЗДАНИЕ ФУНКЦИИ handle_updated_at (если не существует)
-- =====================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- СОЗДАНИЕ ТАБЛИЦЫ estimates
-- =====================================================

CREATE TABLE IF NOT EXISTS public.estimates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
    client_info text NOT NULL,
    number text,
    date timestamptz DEFAULT now(),
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
    discount numeric DEFAULT 0 CHECK (discount >= 0),
    discount_type text DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
    tax numeric DEFAULT 0 CHECK (tax >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- СОЗДАНИЕ ТАБЛИЦЫ estimate_items
-- =====================================================

CREATE TABLE IF NOT EXISTS public.estimate_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    name text NOT NULL,
    quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
    unit text NOT NULL,
    image_url text,
    type text DEFAULT 'material' CHECK (type IN ('material', 'labor', 'equipment', 'other')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ЗАПРОСОВ
-- =====================================================

-- Индексы для таблицы estimates
CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON public.estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project_id ON public.estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON public.estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_date ON public.estimates(date);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON public.estimates(created_at);

-- Индексы для таблицы estimate_items
CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON public.estimate_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_type ON public.estimate_items(type);

-- =====================================================
-- ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ updated_at
-- =====================================================

-- Триггер для таблицы estimates
CREATE TRIGGER trigger_estimates_updated_at
    BEFORE UPDATE ON public.estimates
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Триггер для таблицы estimate_items
CREATE TRIGGER trigger_estimate_items_updated_at
    BEFORE UPDATE ON public.estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) ПОЛИТИКИ
-- =====================================================

-- Включаем RLS для таблицы estimates
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы estimates
CREATE POLICY "Users can view own estimates" ON public.estimates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own estimates" ON public.estimates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own estimates" ON public.estimates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own estimates" ON public.estimates
    FOR DELETE USING (auth.uid() = user_id);

-- Включаем RLS для таблицы estimate_items
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы estimate_items
CREATE POLICY "Users can view own estimate items" ON public.estimate_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.estimates 
            WHERE estimates.id = estimate_items.estimate_id 
            AND estimates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own estimate items" ON public.estimate_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.estimates 
            WHERE estimates.id = estimate_items.estimate_id 
            AND estimates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own estimate items" ON public.estimate_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.estimates 
            WHERE estimates.id = estimate_items.estimate_id 
            AND estimates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own estimate items" ON public.estimate_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.estimates 
            WHERE estimates.id = estimate_items.estimate_id 
            AND estimates.user_id = auth.uid()
        )
    );

-- =====================================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- =====================================================

COMMENT ON TABLE public.estimates IS 'Сметы проектов';
COMMENT ON COLUMN public.estimates.id IS 'Уникальный идентификатор сметы';
COMMENT ON COLUMN public.estimates.user_id IS 'ID пользователя-владельца сметы';
COMMENT ON COLUMN public.estimates.project_id IS 'ID проекта, к которому относится смета';
COMMENT ON COLUMN public.estimates.client_info IS 'Информация о клиенте/название сметы';
COMMENT ON COLUMN public.estimates.number IS 'Номер сметы';
COMMENT ON COLUMN public.estimates.date IS 'Дата создания сметы';
COMMENT ON COLUMN public.estimates.status IS 'Статус сметы: draft, sent, approved, rejected';
COMMENT ON COLUMN public.estimates.discount IS 'Размер скидки';
COMMENT ON COLUMN public.estimates.discount_type IS 'Тип скидки: percent или fixed';
COMMENT ON COLUMN public.estimates.tax IS 'Размер налога в процентах';

COMMENT ON TABLE public.estimate_items IS 'Позиции смет';
COMMENT ON COLUMN public.estimate_items.id IS 'Уникальный идентификатор позиции';
COMMENT ON COLUMN public.estimate_items.estimate_id IS 'ID сметы, к которой относится позиция';
COMMENT ON COLUMN public.estimate_items.name IS 'Название позиции';
COMMENT ON COLUMN public.estimate_items.quantity IS 'Количество';
COMMENT ON COLUMN public.estimate_items.price IS 'Цена за единицу';
COMMENT ON COLUMN public.estimate_items.unit IS 'Единица измерения';
COMMENT ON COLUMN public.estimate_items.image_url IS 'URL изображения позиции';
COMMENT ON COLUMN public.estimate_items.type IS 'Тип позиции: material, labor, equipment, other';


