# 🚀 Настройка переменных окружения в Vercel

## 🚨 Проблема
Приложение не может подключиться к Supabase из-за отсутствующих переменных окружения в Vercel.

## ✅ Решение

### 1. Получите данные Supabase

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Settings** → **API**
4. Скопируйте:
   - **Project URL** (например: `https://your-project.supabase.co`)
   - **anon public** ключ (начинается с `eyJ...`)

### 2. Настройте переменные в Vercel

#### Способ 1: Через Vercel Dashboard
1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Найдите проект `distrprorab360`
3. Перейдите в **Settings** → **Environment Variables**
4. Добавьте переменные:

```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Способ 2: Через Vercel CLI
```bash
# Установите Vercel CLI (если не установлен)
npm i -g vercel

# Войдите в аккаунт
vercel login

# Добавьте переменные
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Передеплойте проект
vercel --prod
```

### 3. Передеплойте проект

После добавления переменных:
1. В Vercel Dashboard нажмите **Deployments**
2. Найдите последний деплой
3. Нажмите **Redeploy**

Или через CLI:
```bash
vercel --prod
```

## 🔍 Проверка

После деплоя проверьте:
1. Откройте приложение в браузере
2. Откройте Developer Tools (F12)
3. В консоли не должно быть ошибок о переменных окружения
4. Приложение должно загружаться без ошибок

## 📋 Примеры переменных

### Для разработки (.env.local)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE5NTY1NzEyMDB9.example
```

### Для продакшена (Vercel)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE5NTY1NzEyMDB9.example
```

## ⚠️ Важные замечания

1. **Никогда не коммитьте .env файлы** в Git
2. **Используйте anon ключ** только для клиентской части
3. **Проверьте права доступа** в Supabase (RLS политики)
4. **Переменные должны начинаться с VITE_** для Vite проектов

## 🆘 Если проблема не решается

1. Проверьте правильность URL и ключа
2. Убедитесь, что переменные добавлены для всех окружений (Production, Preview, Development)
3. Проверьте, что проект передеплоен после добавления переменных
4. Очистите кэш браузера (Ctrl+Shift+R)

## 📞 Поддержка

Если проблема не решается, проверьте:
- [Vercel Environment Variables Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Getting Started Guide](https://supabase.com/docs/guides/getting-started)
