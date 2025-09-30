# Публичная ссылка на отчет для клиента

Модуль «Отчет для клиента» теперь умеет генерировать публичные ссылки для заказчиков. Ссылка открывает адаптированную мобильную страницу (PWA‑совместимую) с данными по проекту: краткая финансовая сводка, выполненные этапы и фотоотчеты.

## Как это работает

- При нажатии «Поделиться» собирается полезная выборка данных по проекту и формируется payload.
- Приложение сначала пытается сохранить payload на стороне Supabase (таблица `client_report_shares`) и отдать короткую ссылку вида `?share=s.<token>`.
- Если в Supabase таблицы еще нет или политика безопасности не настроена, используется безопасный fallback — кодирование payload в саму ссылку вида `?share=e.<base64>`. Такой режим работает без бэкенда, но длина ссылки больше.

## Быстрый старт (без бэкенда)

Ничего настраивать не нужно — fallback `e.<base64>` включен. Просто нажмите «Поделиться» и отправьте ссылку заказчику.

## Продвинутая настройка (с хранением в Supabase)

1. Создайте таблицу для публикаций:

```sql
create table if not exists public.client_report_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  token text not null unique,
  payload jsonb not null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Индексы
create index if not exists idx_client_report_shares_token on public.client_report_shares (token);
create index if not exists idx_client_report_shares_user on public.client_report_shares (user_id);
```

2. Включите RLS и добавьте политики:

```sql
alter table public.client_report_shares enable row level security;

-- Вставка разрешена только владельцу (авторизованному пользователю)
create policy client_report_shares_insert_owner
  on public.client_report_shares for insert
  with check (auth.uid() = user_id);

-- Чтение по токену всем (публичный доступ только к конкретной записи)
create policy client_report_shares_select_by_token
  on public.client_report_shares for select
  using (
    -- Разрешаем чтение по токену
    token is not null
  );
```

3. (Опционально) Добавьте истечение ссылок:

```sql
-- Ограничение на актуальность
create or replace view public.client_report_shares_valid as
select * from public.client_report_shares
where expires_at is null or expires_at > now();
```

Примечание: в приложении при открытии `s.<token>` дополнительно проверяется поле `expires_at` и устаревшие ссылки не показываются.

## Где в коде

- Генерация и шаринг: `src/components/views/ClientReportScreen.tsx` (кнопка «Поделиться»).
- Пакет утилит: `src/utils/shareUtils.ts` — сборка payload, сохранение в Supabase, кодирование/декодирование.
- Публичная страница: `src/components/views/PublicClientReportView.tsx`.
- Маршрутизация: `src/App.tsx` — обработка параметра `?share=...`.

## PWA и мобильная адаптация

Публичная страница использует существующую стилизацию (`card`, `dashboard-*`) и корректно открывается как standalone‑экран в PWA. Иконки и сервис‑воркер уже настроены в `public/manifest.webmanifest` и `public/sw.js`.

## Советы по безопасности

- Для серверного режима используйте политику выборки по `token` и при необходимости поле `expires_at`.
- Фото в отчетах должны иметь публичные URL (Supabase Storage: публичные файлы). Это уже используется в приложении.
- Старайтесь не включать в payload лишние данные (только то, что нужно клиенту).

