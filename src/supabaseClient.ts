import { createClient } from '@supabase/supabase-js'

// Конфигурация только из переменных окружения (Vite). Без фоллбеков и без логирования ключей.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  const message = 'Supabase env vars are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  // Падаем с явной ошибкой (ожидаемая стратегия для продакшена при неверной конфигурации)
  throw new Error(message)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
