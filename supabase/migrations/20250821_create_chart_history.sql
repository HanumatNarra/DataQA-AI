-- Create chart history table to store recent charts per user (max 20 kept via app logic)
create table if not exists public.chart_history (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  query text,
  chart_type text not null,
  measure text,
  dimension text,
  data jsonb not null,         -- [{ label, value }]
  vega_spec jsonb,             -- optional vendor-neutral spec
  chart_image_url text,        -- URL to the generated chart image
  created_at timestamp with time zone default now()
);

alter table public.chart_history enable row level security;

-- Allow users to manage their own chart history
create policy if not exists chart_history_select on public.chart_history
  for select using (auth.uid() = user_id);

create policy if not exists chart_history_insert on public.chart_history
  for insert with check (auth.uid() = user_id);

create policy if not exists chart_history_delete on public.chart_history
  for delete using (auth.uid() = user_id);

create index if not exists idx_chart_history_user_created_at
  on public.chart_history(user_id, created_at desc);

