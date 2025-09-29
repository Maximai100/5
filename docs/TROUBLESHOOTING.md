# Устранение неполадок с загрузкой файлов

## Проблема: CORS и ошибка 413 (Request Entity Too Large)

### Симптомы:
- Ошибки "Cross-Origin Request Blocked" с кодом 413
- "StorageUnknownError: NetworkError when attempting to fetch resource"
- Файлы не загружаются в Supabase Storage

### Причины:
1. **Файл слишком большой** - превышает лимиты Supabase Storage
2. **CORS настройки** - неправильно настроены политики CORS для бакетов
3. **Оригинальный файл вместо сжатого** - передается необработанный файл

### Решение:

#### 1. Исправление кода (уже сделано):
- ✅ Исправлен `FinanceEntryModal.tsx` - теперь передается сжатый файл
- ✅ Улучшено сжатие изображений в `useFileStorage.ts`
- ✅ Уменьшен лимит размера для чеков до 5MB

#### 2. Настройка CORS в Supabase:
В Supabase Dashboard → Storage → Settings → CORS:

```json
[
  {
    "origin": ["http://localhost:5173", "https://yourdomain.com"],
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "headers": ["*"],
    "maxAgeSeconds": 3600
  }
]
```

#### 3. Проверка политик RLS для бакетов:
Убедитесь, что политики RLS настроены правильно:

```sql
-- Для бакета receipts
CREATE POLICY "Users can upload receipts" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'receipts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Проблема: PostgreSQL ошибка 54000 (index row too large)

### Симптомы:
- Ошибка "index row requires 55584 bytes, maximum size is 8191"
- Не удается создать финансовую запись в базе данных

### Причина:
Один из индексов в таблице `finance_entries` пытается создать запись индекса размером больше 8KB (лимит PostgreSQL).

### Решение:

#### 1. Выполните исправление индексов:
```sql
-- Выполните fix_finance_entries_indexes.sql
```

Этот скрипт:
- Удаляет проблемные индексы на длинных полях
- Создает безопасные индексы только для коротких значений
- Ограничивает индексы по длине полей

#### 2. Альтернативное решение - удаление всех индексов:
Если проблема persists, можно временно удалить все индексы:

```sql
-- Удаляем все индексы на таблице finance_entries
DROP INDEX IF EXISTS idx_finance_entries_user_id;
DROP INDEX IF EXISTS idx_finance_entries_project_id;
DROP INDEX IF EXISTS idx_finance_entries_type;
DROP INDEX IF EXISTS idx_finance_entries_date;
DROP INDEX IF EXISTS idx_finance_entries_category;
DROP INDEX IF EXISTS idx_finance_entries_receipt_url;
```

## Проверка исправлений

### 1. Проверка сжатия файлов:
- Откройте консоль браузера
- Попробуйте загрузить чек
- Проверьте логи: должно быть сообщение о сжатии изображения

### 2. Проверка размера файла:
- После сжатия размер должен быть значительно меньше
- Для чеков: максимум 5MB
- Для изображений инструментов: максимум 10MB

### 3. Проверка базы данных:
- Попробуйте создать финансовую запись без чека
- Если работает, попробуйте с чеком
- Проверьте, что запись создается в таблице `finance_entries`

## Дополнительные настройки

### Увеличение лимитов Supabase (если возможно):
В Supabase Dashboard → Settings → API:
- Проверьте лимиты на размер файлов
- Убедитесь, что CORS настроен правильно

### Мониторинг:
- Следите за логами в консоли браузера
- Проверяйте логи Supabase на наличие ошибок
- Используйте Network tab в DevTools для отладки запросов

## Если проблемы остаются

### 1. Fallback на base64:
Система автоматически переключается на base64 хранение при ошибках загрузки в Storage.

### 2. Проверка подключения:
- Убедитесь, что интернет-соединение стабильно
- Проверьте, что Supabase доступен

### 3. Обращение в поддержку:
Если проблемы критичны, обратитесь в поддержку Supabase с логами ошибок.
