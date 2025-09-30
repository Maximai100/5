-- Скрипт для проверки корректности настройки таблицы profiles

-- 1. Проверка структуры таблицы
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Проверка индексов
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'profiles' 
    AND schemaname = 'public';

-- 3. Проверка RLS политик
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
    AND schemaname = 'public';

-- 4. Проверка триггеров
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles' 
    AND event_object_schema = 'public';

-- 5. Проверка функций
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('handle_new_user', 'get_current_user_profile', 'update_current_user_profile', 'update_updated_at_column');

-- 6. Проверка прав доступа
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
    AND table_name = 'profiles';

-- 7. Проверка связей с auth.users
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'profiles'
    AND tc.table_schema = 'public';

-- 8. Проверка текущих записей в таблице (если есть)
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- 9. Проверка последних созданных профилей
SELECT 
    id,
    first_name,
    last_name,
    phone,
    city,
    updated_at
FROM public.profiles 
ORDER BY updated_at DESC 
LIMIT 5;
