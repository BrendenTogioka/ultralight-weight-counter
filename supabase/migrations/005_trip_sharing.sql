-- Add public sharing to trips
alter table trips add column if not exists is_public boolean default false;

-- Allow anonymous users to read publicly shared trips
create policy "public read shared trips"
  on trips for select
  using (is_public = true);

-- Allow anonymous users to read trip_items that belong to a public trip
create policy "public read trip items for shared trips"
  on trip_items for select
  using (
    exists (
      select 1 from trips where id = trip_id and is_public = true
    )
  );

-- Allow anonymous users to read gear_items referenced by public trips
create policy "public read gear items via shared trips"
  on gear_items for select
  using (
    exists (
      select 1 from trip_items ti
      join trips t on t.id = ti.trip_id
      where ti.gear_item_id = gear_items.id
        and t.is_public = true
    )
  );
