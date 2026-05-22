-- ============================================================
-- ULTRALIGHT PACK CALCULATOR — Supabase Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- CUSTOM TYPES
-- ============================================================

create type wear_type as enum ('base', 'worn', 'consumable');
create type weight_unit as enum ('oz', 'g');

-- ============================================================
-- GEAR CATEGORIES (fixed list)
-- ============================================================

create table gear_categories (
  id   serial primary key,
  name text not null unique
);

alter table gear_categories enable row level security;

create policy "authenticated users can read categories"
  on gear_categories for select
  to authenticated
  using (true);

insert into gear_categories (name) values
  ('Pack'),
  ('Shelter'),
  ('Sleep'),
  ('Kitchen'),
  ('Clothing'),
  ('Water'),
  ('Electronics'),
  ('Safety'),
  ('Misc');

-- ============================================================
-- GEAR TYPES (fixed list + user custom)
-- ============================================================

create table gear_types (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade, -- null = system default
  name       text not null,
  created_at timestamptz default now()
);

-- System default types (user_id = null)
insert into gear_types (id, user_id, name) values
  (uuid_generate_v4(), null, 'Backpack'),
  (uuid_generate_v4(), null, 'Tent'),
  (uuid_generate_v4(), null, 'Sleeping Bag'),
  (uuid_generate_v4(), null, 'Sleeping Pad'),
  (uuid_generate_v4(), null, 'Quilt'),
  (uuid_generate_v4(), null, 'Tarp'),
  (uuid_generate_v4(), null, 'Bivy'),
  (uuid_generate_v4(), null, 'Stove'),
  (uuid_generate_v4(), null, 'Fuel'),
  (uuid_generate_v4(), null, 'Cook Pot'),
  (uuid_generate_v4(), null, 'Utensils'),
  (uuid_generate_v4(), null, 'Water Filter'),
  (uuid_generate_v4(), null, 'Water Bottle'),
  (uuid_generate_v4(), null, 'Reservoir'),
  (uuid_generate_v4(), null, 'Headlamp'),
  (uuid_generate_v4(), null, 'Trekking Poles'),
  (uuid_generate_v4(), null, 'First Aid'),
  (uuid_generate_v4(), null, 'Navigation'),
  (uuid_generate_v4(), null, 'Rain Jacket'),
  (uuid_generate_v4(), null, 'Insulation Layer'),
  (uuid_generate_v4(), null, 'Base Layer'),
  (uuid_generate_v4(), null, 'Pants'),
  (uuid_generate_v4(), null, 'Footwear'),
  (uuid_generate_v4(), null, 'Gaiters'),
  (uuid_generate_v4(), null, 'Gloves'),
  (uuid_generate_v4(), null, 'Hat'),
  (uuid_generate_v4(), null, 'Sunglasses'),
  (uuid_generate_v4(), null, 'Phone'),
  (uuid_generate_v4(), null, 'Battery/Charger'),
  (uuid_generate_v4(), null, 'Camera'),
  (uuid_generate_v4(), null, 'Bear Canister'),
  (uuid_generate_v4(), null, 'Stuff Sack'),
  (uuid_generate_v4(), null, 'Dry Bag'),
  (uuid_generate_v4(), null, 'Cord/Rope'),
  (uuid_generate_v4(), null, 'Repair Kit'),
  (uuid_generate_v4(), null, 'Hygiene'),
  (uuid_generate_v4(), null, 'Sunscreen'),
  (uuid_generate_v4(), null, 'Food'),
  (uuid_generate_v4(), null, 'Snacks'),
  (uuid_generate_v4(), null, 'Other');

-- ============================================================
-- USER SETTINGS
-- ============================================================

create table user_settings (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  default_unit    weight_unit not null default 'oz',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- GEAR ITEMS (library)
-- ============================================================

create table gear_items (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  brand        text,
  category     text not null references gear_categories(name),
  type         text,                          -- name of type (system or custom)
  weight_oz    numeric(8, 2) not null default 0,
  weight_unit  weight_unit not null default 'oz',
  image_url    text,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ============================================================
-- TRIPS
-- ============================================================

create table trips (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  description     text,
  trip_date       date,
  is_template     boolean not null default false,
  cloned_from_id  uuid references trips(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- TRIP ITEMS
-- ============================================================

create table trip_items (
  id                  uuid primary key default uuid_generate_v4(),
  trip_id             uuid not null references trips(id) on delete cascade,
  gear_item_id        uuid not null references gear_items(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  quantity            integer not null default 1 check (quantity > 0),
  wear_type           wear_type not null default 'base',
  override_weight_oz  numeric(8, 2),          -- null = use gear_items.weight_oz
  included            boolean not null default true,
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (trip_id, gear_item_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table user_settings  enable row level security;
alter table gear_items      enable row level security;
alter table trips           enable row level security;
alter table trip_items      enable row level security;
alter table gear_types      enable row level security;

-- user_settings
create policy "users manage own settings"
  on user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- gear_items
create policy "users manage own gear"
  on gear_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- trips
create policy "users manage own trips"
  on trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- trip_items
create policy "users manage own trip items"
  on trip_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- gear_types: users see system types (user_id is null) + their own custom types
create policy "users see system and own types"
  on gear_types for select
  using (user_id is null or auth.uid() = user_id);

create policy "users insert own custom types"
  on gear_types for insert
  with check (auth.uid() = user_id);

create policy "users update own custom types"
  on gear_types for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own custom types"
  on gear_types for delete
  using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET (run separately in Supabase Storage settings
-- or uncomment if using service role key)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('gear-images', 'gear-images', true);
--
-- create policy "users upload own gear images"
--   on storage.objects for insert
--   with check (bucket_id = 'gear-images' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "users delete own gear images"
--   on storage.objects for delete
--   using (bucket_id = 'gear-images' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "public read gear images"
--   on storage.objects for select
--   using (bucket_id = 'gear-images');

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger gear_items_updated_at  before update on gear_items  for each row execute function update_updated_at();
create trigger trips_updated_at       before update on trips       for each row execute function update_updated_at();
create trigger trip_items_updated_at  before update on trip_items  for each row execute function update_updated_at();
create trigger settings_updated_at    before update on user_settings for each row execute function update_updated_at();

-- ============================================================
-- AUTO-CREATE USER SETTINGS ON SIGNUP
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
