-- Создание таблицы для шаблонов смет в Supabase
-- Выполните этот скрипт в Supabase SQL Editor

-- =====================================================
-- СОЗДАНИЕ ТАБЛИЦЫ estimate_templates
-- =====================================================

CREATE TABLE IF NOT EXISTS public.estimate_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    items jsonb NOT NULL DEFAULT '[]',
    discount numeric DEFAULT 0,
    discount_type text DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
    tax numeric DEFAULT 0,
    last_modified timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ЗАПРОСОВ
-- =====================================================

-- Индекс для поиска шаблонов по пользователю
CREATE INDEX IF NOT EXISTS idx_estimate_templates_user_id ON public.estimate_templates(user_id);

-- Индекс для сортировки по дате изменения
CREATE INDEX IF NOT EXISTS idx_estimate_templates_last_modified ON public.estimate_templates(user_id, last_modified DESC);

-- Индекс для поиска по названию
CREATE INDEX IF NOT EXISTS idx_estimate_templates_name ON public.estimate_templates(user_id, name);

-- =====================================================
-- ТРИГГЕР ДЛЯ ОБНОВЛЕНИЯ updated_at
-- =====================================================

-- Создаем триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_estimate_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_estimate_templates_updated_at
    BEFORE UPDATE ON public.estimate_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_estimate_templates_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) ПОЛИТИКИ
-- =====================================================

-- Включаем RLS для таблицы
ALTER TABLE public.estimate_templates ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои шаблоны
CREATE POLICY "Users can view own templates" ON public.estimate_templates
    FOR SELECT USING (auth.uid() = user_id);

-- Политика: пользователи могут создавать свои шаблоны
CREATE POLICY "Users can create own templates" ON public.estimate_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Политика: пользователи могут обновлять свои шаблоны
CREATE POLICY "Users can update own templates" ON public.estimate_templates
    FOR UPDATE USING (auth.uid() = user_id);

-- Политика: пользователи могут удалять свои шаблоны
CREATE POLICY "Users can delete own templates" ON public.estimate_templates
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- КОММЕНТАРИИ К ТАБЛИЦЕ
-- =====================================================

COMMENT ON TABLE public.estimate_templates IS 'Шаблоны смет для быстрого создания новых смет';
COMMENT ON COLUMN public.estimate_templates.id IS 'Уникальный идентификатор шаблона';
COMMENT ON COLUMN public.estimate_templates.user_id IS 'ID пользователя-владельца шаблона';
COMMENT ON COLUMN public.estimate_templates.name IS 'Название шаблона';
COMMENT ON COLUMN public.estimate_templates.items IS 'JSON массив позиций сметы';
COMMENT ON COLUMN public.estimate_templates.discount IS 'Размер скидки';
COMMENT ON COLUMN public.estimate_templates.discount_type IS 'Тип скидки: percent или fixed';
COMMENT ON COLUMN public.estimate_templates.tax IS 'Размер налога в процентах';
COMMENT ON COLUMN public.estimate_templates.last_modified IS 'Дата последнего изменения шаблона';
