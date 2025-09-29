# Инструкция по настройке функциональности загрузки файлов

## Обзор
Добавлена функциональность прикрепления чеков к финансовым транзакциям и изображений к инструментам.

## Шаги установки

### 1. Создание таблиц в Supabase

Выполните следующие SQL-скрипты в Supabase SQL Editor **в указанном порядке**:

#### 1.1 Создание таблицы finance_entries
```sql
-- Выполните create_finance_entries_table.sql
```
Этот скрипт создаст таблицу `finance_entries` для хранения финансовых транзакций.

#### 1.2 Создание таблиц инвентаря (если еще не созданы)
```sql
-- Выполните create_inventory_tables_complete.sql
```
Этот скрипт создаст таблицы `tools` и `consumables` для инвентаря.

#### 1.3 Добавление полей для файлов
```sql
-- Выполните add_file_fields.sql
```
Этот скрипт добавит поля `receipt_url` и `image_url` в существующие таблицы.

### 2. Создание бакетов в Supabase Storage

В Supabase Dashboard → Storage создайте два публичных бакета:

1. **receipts** - для хранения чеков
2. **tools-images** - для хранения изображений инструментов

### 3. Настройка политик RLS для бакетов

Для каждого бакета создайте следующие политики:

#### Для бакета "receipts":
```sql
-- Политика SELECT
CREATE POLICY "Users can view their own receipts" ON storage.objects
FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Политика INSERT
CREATE POLICY "Users can upload receipts" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Политика UPDATE
CREATE POLICY "Users can update their own receipts" ON storage.objects
FOR UPDATE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Политика DELETE
CREATE POLICY "Users can delete their own receipts" ON storage.objects
FOR DELETE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### Для бакета "tools-images":
```sql
-- Политика SELECT
CREATE POLICY "Users can view their own tool images" ON storage.objects
FOR SELECT USING (bucket_id = 'tools-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Политика INSERT
CREATE POLICY "Users can upload tool images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'tools-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Политика UPDATE
CREATE POLICY "Users can update their own tool images" ON storage.objects
FOR UPDATE USING (bucket_id = 'tools-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Политика DELETE
CREATE POLICY "Users can delete their own tool images" ON storage.objects
FOR DELETE USING (bucket_id = 'tools-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Функциональность

### Финансовые транзакции
- При создании или редактировании финансовой транзакции можно прикрепить чек
- Чек автоматически загружается в бакет "receipts"
- Поддерживается сжатие изображений для оптимизации размера
- Fallback на base64 хранение при ошибках загрузки

### Инструменты
- При создании или редактировании инструмента можно прикрепить изображение
- Изображение автоматически загружается в бакет "tools-images"
- Поддерживается сжатие изображений для оптимизации размера
- Fallback на base64 хранение при ошибках загрузки

## Технические детали

### Загрузка файлов
- Используется функция `uploadFileWithFallback` из хука `useFileStorage`
- Автоматическое сжатие изображений больше 2MB
- Повторные попытки загрузки при сетевых ошибках
- Максимальный размер файла: 10MB

### Хранение данных
- URL файлов сохраняются в полях `receipt_url` и `image_url`
- Поддержка как Supabase Storage, так и base64 fallback
- Автоматическое создание уникальных имен файлов

### Безопасность
- Row Level Security (RLS) для всех таблиц
- Пользователи видят только свои данные
- Политики доступа для Storage бакетов

## Проверка установки

После выполнения всех шагов:

1. Убедитесь, что таблицы созданы в Supabase
2. Проверьте, что бакеты созданы в Storage
3. Убедитесь, что политики RLS настроены
4. Протестируйте создание финансовой транзакции с чеком
5. Протестируйте создание инструмента с изображением

## Устранение неполадок

### Ошибка "relation does not exist"
- Убедитесь, что таблицы созданы перед выполнением `add_file_fields.sql`
- Проверьте правильность имен таблиц в SQL-скриптах

### Ошибки загрузки файлов
- Проверьте настройки политик RLS для бакетов
- Убедитесь, что бакеты созданы и публичны
- Проверьте подключение к интернету

### Проблемы с отображением изображений
- Проверьте, что URL файлов корректно сохраняются в базе данных
- Убедитесь, что файлы доступны по публичным URL
