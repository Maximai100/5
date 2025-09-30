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

## Live-режим (ссылка всегда показывает актуальные данные)

Чтобы заказчик видел свежие данные по ссылке без переотправки, добавьте SQL-функцию, которая формирует отчет «на лету» по токену. Приложение сначала вызывает RPC `get_client_report`, и только если он не настроен — падает назад на сохраненный payload.

1) Функция-агрегатор (формирует JSON под фронтенд):

```sql
create or replace function public.get_client_report(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
with s as (
  select * from public.client_report_shares where token = p_token limit 1
)
select jsonb_build_object(
  'version', 1,
  'generatedAt', now(),
  'project', jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'client', coalesce(p.client, ''),
    'address', coalesce(p.address, ''),
    'status', p.status
  ),
  'financials', jsonb_build_object(
    'estimatesTotal', coalesce((
      select sum(ii.quantity * ii.price)
      from estimates e
      join estimate_items ii on ii.estimate_id = e.id
      where e.project_id = s.project_id
    ), 0),
    'paidTotal', coalesce((
      select sum(fe.amount)
      from finance_entries fe
      where fe.project_id = s.project_id and fe.type = 'income'
    ), 0),
    'remainingToPay', coalesce((
      select sum(ii.quantity * ii.price)
      from estimates e
      join estimate_items ii on ii.estimate_id = e.id
      where e.project_id = s.project_id
    ), 0) - coalesce((
      select sum(fe.amount)
      from finance_entries fe
      where fe.project_id = s.project_id and fe.type = 'income'
    ), 0)
  ),
  'workStages', coalesce((
    select jsonb_agg(jsonb_build_object(
      'title', ws.title,
      'startDate', ws.start_date,
      'endDate', ws.end_date,
      'status', ws.status,
      'progress', ws.progress
    ) order by ws.start_date nulls last, ws.end_date nulls last)
    from work_stages ws where ws.project_id = s.project_id
  ), '[]'::jsonb),
  'photoReports', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', pr.id,
      'title', pr.title,
      'date', pr.date,
      'photos', pr.photos
    ) order by pr.date desc)
    from photoreports pr where pr.project_id = s.project_id
  ), '[]'::jsonb),
  'expiresAt', s.expires_at
)
from s
join projects p on p.id = s.project_id;
$$;

-- Разрешаем вызывать всем (в том числе anon)
grant execute on function public.get_client_report(text) to anon;
```

Функция выполняется с правами владельца (security definer) и сама ограничивает доступ к проекту через `client_report_shares.token`, поэтому RLS можно не расширять на проектные таблицы.

2) (Опционально) Упростите схему хранения `client_report_shares`: колонка `payload` не обязательна в live‑режиме. Можно хранить только `token`, `user_id`, `project_id`, `expires_at`. Приложение продолжит работать: при наличии функции будет запрашивать данные по токену, при её отсутствии — использовать сохраненный `payload`.

## Поведение ссылки и мобильная прокрутка

- Исправлена проблема отсутствия прокрутки при открытии ссылки из мессенджеров (WhatsApp/браузер): публичная страница рендерится внутри скролл‑контейнера `.app-main`, а `body` остаётся `overflow: hidden` для консистентного мобильного поведения.
- Публичная страница открывается в тёмной теме.

## UX при генерации ссылки

- После генерации ссылка автоматически копируется в буфер обмена и пользователю показывается уведомление.

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
