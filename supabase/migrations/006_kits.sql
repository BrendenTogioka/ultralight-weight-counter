-- Reusable gear kits (named bundles of items)
create table if not exists kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid references kits on delete cascade not null,
  gear_item_id uuid references gear_items on delete cascade not null,
  quantity int not null default 1,
  wear_type text not null default 'base',
  sort_order int not null default 0,
  created_at timestamptz default now()
);

alter table kits enable row level security;
alter table kit_items enable row level security;

create policy "users manage own kits"
  on kits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own kit items"
  on kit_items for all
  using (
    auth.uid() = (select user_id from kits where id = kit_id)
  )
  with check (
    auth.uid() = (select user_id from kits where id = kit_id)
  );
