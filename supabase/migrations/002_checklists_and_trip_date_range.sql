-- ============================================================
-- Migration 002: Trip date range + Packing Checklists
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Add end date to trips
alter table trips add column if not exists trip_date_end date;

-- 2. Checklists table
create table if not exists checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references trips(id) on delete set null,
  name text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. Checklist items table
create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references checklists(id) on delete cascade,
  name text not null,
  brand text,
  sort_order integer default 0 not null,
  checked boolean default false not null,
  created_at timestamptz default now() not null
);

-- 4. RLS policies
alter table checklists enable row level security;
alter table checklist_items enable row level security;

create policy "users manage own checklists"
  on checklists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own checklist items"
  on checklist_items for all
  using (
    exists (
      select 1 from checklists c
      where c.id = checklist_items.checklist_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from checklists c
      where c.id = checklist_items.checklist_id
        and c.user_id = auth.uid()
    )
  );

-- 5. Auto-update updated_at on checklists
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger checklists_updated_at
  before update on checklists
  for each row execute function update_updated_at_column();
