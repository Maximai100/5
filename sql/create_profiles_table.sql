-- Создание таблицы profiles с автоматической синхронизацией с auth.users
-- Для маркетинговых и аналитических целей

-- 1. Создание таблицы public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name text,
    last_name text,
    phone text,
    city text,
    updated_at timestamptz DEFAULT now()
);

-- 2. Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);

-- 3. Включение RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Создание политики RLS - пользователи могут видеть и изменять только свой профиль
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Создание функции для автоматической синхронизации профилей
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, phone, city)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'city'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Создание триггера для автоматического создания профиля при регистрации
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Создание функции для обновления updated_at при изменении профиля
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Создание триггера для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 9. Создание функции для получения профиля текущего пользователя (удобная функция для API)
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE (
    id uuid,
    first_name text,
    last_name text,
    phone text,
    city text,
    updated_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, p.phone, p.city, p.updated_at
    FROM public.profiles p
    WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Создание функции для обновления профиля текущего пользователя
CREATE OR REPLACE FUNCTION public.update_current_user_profile(
    new_first_name text DEFAULT NULL,
    new_last_name text DEFAULT NULL,
    new_phone text DEFAULT NULL,
    new_city text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    first_name text,
    last_name text,
    phone text,
    city text,
    updated_at timestamptz
) AS $$
BEGIN
    UPDATE public.profiles
    SET 
        first_name = COALESCE(new_first_name, first_name),
        last_name = COALESCE(new_last_name, last_name),
        phone = COALESCE(new_phone, phone),
        city = COALESCE(new_city, city),
        updated_at = now()
    WHERE id = auth.uid();
    
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, p.phone, p.city, p.updated_at
    FROM public.profiles p
    WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Комментарии для документации
COMMENT ON TABLE public.profiles IS 'Профили пользователей для маркетинговых и аналитических целей';
COMMENT ON COLUMN public.profiles.id IS 'Уникальный идентификатор пользователя, ссылается на auth.users(id)';
COMMENT ON COLUMN public.profiles.first_name IS 'Имя пользователя';
COMMENT ON COLUMN public.profiles.last_name IS 'Фамилия пользователя';
COMMENT ON COLUMN public.profiles.phone IS 'Номер телефона пользователя';
COMMENT ON COLUMN public.profiles.city IS 'Город пользователя';
COMMENT ON COLUMN public.profiles.updated_at IS 'Время последнего обновления профиля';

COMMENT ON FUNCTION public.handle_new_user() IS 'Автоматически создает профиль при регистрации нового пользователя';
COMMENT ON FUNCTION public.get_current_user_profile() IS 'Возвращает профиль текущего аутентифицированного пользователя';
COMMENT ON FUNCTION public.update_current_user_profile(text, text, text, text) IS 'Обновляет профиль текущего пользователя';

-- 12. Предоставление прав доступа
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_current_user_profile(text, text, text, text) TO authenticated;

-- Скрипт завершен
-- Теперь при регистрации нового пользователя автоматически создается профиль
-- Пользователи могут просматривать и изменять только свой собственный профиль
-- Все изменения автоматически обновляют поле updated_at
