-- Secure setup for client report sharing
-- Creates table, RLS policies (owner-only), and a SECURITY DEFINER RPC for public reads by token

-- 1) Table
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

-- Indexes
create index if not exists idx_client_report_shares_token on public.client_report_shares (token);
create index if not exists idx_client_report_shares_user on public.client_report_shares (user_id);

-- 2) RLS (owner-only direct access; no public SELECT)
alter table public.client_report_shares enable row level security;

-- Clean up older policies if exist
drop policy if exists client_report_shares_insert_owner on public.client_report_shares;
drop policy if exists client_report_shares_select_by_token on public.client_report_shares;
drop policy if exists client_report_shares_select_owner on public.client_report_shares;
drop policy if exists client_report_shares_update_owner on public.client_report_shares;
drop policy if exists client_report_shares_delete_owner on public.client_report_shares;

-- Insert: owner only
create policy client_report_shares_insert_owner
  on public.client_report_shares for insert
  with check (auth.uid() = user_id);

-- Select: owner only (prevents anon broad access)
create policy client_report_shares_select_owner
  on public.client_report_shares for select
  using (auth.uid() = user_id);

-- Update/Delete: owner only (optional but recommended)
create policy client_report_shares_update_owner
  on public.client_report_shares for update
  using (auth.uid() = user_id);

create policy client_report_shares_delete_owner
  on public.client_report_shares for delete
  using (auth.uid() = user_id);

-- 3) Optional: validity view
create or replace view public.client_report_shares_valid as
select * from public.client_report_shares
where expires_at is null or expires_at > now();

-- 4) RPC function: public live read by token
-- NOTE: SECURITY DEFINER runs as function owner (typically table owner),
-- which allows controlled access without exposing table via RLS to anon.
create or replace function public.get_client_report(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
with s as (
  select * from public.client_report_shares_valid where token = p_token limit 1
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

grant execute on function public.get_client_report(text) to anon;

