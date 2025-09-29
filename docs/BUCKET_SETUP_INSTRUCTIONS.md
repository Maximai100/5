# 🚨 СРОЧНО: Создание bucket "logos" в Supabase

## ❗ Проблема решена - нужно выполнить SQL скрипт

Код корректно определил проблему: **bucket "logos" не создан в Supabase**.

### 📋 Пошаговая инструкция:

#### **ШАГ 1: Откройте Supabase Dashboard**
1. Перейдите на [supabase.com](https://supabase.com)
2. Войдите в свой аккаунт
3. Выберите проект **prorab360.online**

#### **ШАГ 2: Откройте SQL Editor**
1. В левом меню нажмите **SQL Editor**
2. Нажмите **New query**

#### **ШАГ 3: Выполните SQL скрипт**
Скопируйте и вставьте следующий код:

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

#### **ШАГ 4: Запустите скрипт**
1. Нажмите **Run** (или Ctrl+Enter)
2. Дождитесь выполнения (должно показать "Success")

#### **ШАГ 5: Проверьте создание bucket**
1. В левом меню нажмите **Storage**
2. Убедитесь, что bucket **logos** появился в списке
3. Bucket должен быть помечен как **Public**

#### **ШАГ 6: Проверьте политики**
1. В разделе Storage нажмите **Policies**
2. Убедитесь, что созданы политики для bucket **logos**

### ✅ После выполнения скрипта:

1. **Обновите страницу** приложения
2. **Откройте настройки** (Профиль компании)
3. **Попробуйте загрузить логотип**
4. **Ошибка должна исчезнуть**

### 🔍 Что делает этот скрипт:

- **Создает bucket "logos"** - публичное хранилище для логотипов
- **Включает RLS** - Row Level Security для безопасности
- **Создает политики доступа:**
  - Публичное чтение логотипов
  - Запись только для авторизованных пользователей
  - Управление только своими файлами

### ⚠️ Важно:
- Скрипт безопасен - использует `on conflict do nothing`
- Не повредит существующие данные
- Можно выполнять несколько раз

---

## 🎯 После выполнения скрипта загрузка логотипов будет работать!
