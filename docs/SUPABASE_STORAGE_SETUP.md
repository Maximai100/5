# 🗄️ SUPABASE STORAGE SETUP - Настройка хранилища файлов

## ⚠️ КРИТИЧЕСКИ ВАЖНО: Настройка Storage для загрузки логотипов

### 🚨 Проблема: "Bucket not found"

Если при загрузке логотипа появляется ошибка:
```
StorageApiError: Bucket not found
```

Это означает, что в Supabase не создан bucket для хранения файлов.

### ✅ Решение: Создание bucket и политик

#### 1. **Откройте Supabase Dashboard**
- Перейдите в ваш проект Supabase
- Откройте раздел **SQL Editor**

#### 2. **Выполните SQL скрипт**
Скопируйте и выполните содержимое файла `sql/storage_logos_policies.sql`:

```sql
-- Ensure public bucket 'logos' exists
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Enable RLS on storage.objects (enabled by default in newer projects)
alter table storage.objects enable row level security;

-- Allow anyone to read files from 'logos'
drop policy if exists "Logos public read" on storage.objects;
create policy "Logos public read" on storage.objects
  for select using (bucket_id = 'logos');

-- Allow authenticated users to manage their own files in 'logos'
drop policy if exists "Logos users write own" on storage.objects;
create policy "Logos users write own" on storage.objects
  for insert with check (bucket_id = 'logos' and auth.role() = 'authenticated' and owner = auth.uid());

drop policy if exists "Logos users update own" on storage.objects;
create policy "Logos users update own" on storage.objects
  for update using (bucket_id = 'logos' and owner = auth.uid()) with check (bucket_id = 'logos' and owner = auth.uid());

drop policy if exists "Logos users delete own" on storage.objects;
create policy "Logos users delete own" on storage.objects
  for delete using (bucket_id = 'logos' and owner = auth.uid());
```

#### 3. **Проверьте создание bucket**
- Перейдите в раздел **Storage** в Supabase Dashboard
- Убедитесь, что bucket `logos` создан и помечен как **Public**

#### 4. **Проверьте политики**
- В разделе **Storage** → **Policies**
- Убедитесь, что созданы политики для bucket `logos`

### 🔧 Что делает этот скрипт:

1. **Создает bucket `logos`** - публичное хранилище для логотипов
2. **Включает RLS** - Row Level Security для безопасности
3. **Создает политики доступа:**
   - **Публичное чтение** - любой может просматривать логотипы
   - **Запись для авторизованных** - только авторизованные пользователи могут загружать
   - **Управление своими файлами** - пользователи могут изменять/удалять только свои файлы

### 🚫 Что НЕ делать:

1. **Не создавайте bucket вручную** через UI без политик
2. **Не отключайте RLS** без понимания последствий
3. **Не давайте публичный доступ на запись** в bucket

### ✅ Проверка работоспособности:

1. **Обновите страницу** приложения
2. **Откройте настройки** (Профиль компании)
3. **Попробуйте загрузить логотип**
4. **Проверьте консоль** - не должно быть ошибок "Bucket not found"

### 🆘 Если проблемы остаются:

1. **Проверьте права доступа** в Supabase Dashboard
2. **Убедитесь, что пользователь авторизован**
3. **Проверьте размер файла** (должен быть < 5MB)
4. **Проверьте формат файла** (PNG, JPG, JPEG)

---

## 🎯 ЗАПОМНИ: Storage bucket должен быть создан ДО использования функции загрузки логотипов!
