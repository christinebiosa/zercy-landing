-- ============================================================
-- Zercy Logbook — Supabase Schema
-- Run this once in your Supabase project via the SQL editor
-- ============================================================

-- Users (identified by email)
create table if not exists logbook_users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  created_at  timestamptz default now()
);

-- Magic link tokens (passwordless auth)
create table if not exists logbook_magic_links (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  token       text unique not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz default now()
);

-- Trips
create table if not exists logbook_trips (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references logbook_users(id) on delete cascade not null,
  name         text not null,
  destination  text,
  start_date   date,
  end_date     date,
  emoji        text default '✈️',
  created_at   timestamptz default now()
);

-- Bookings (flights, hotels, cars, trains, activities)
create table if not exists logbook_bookings (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid references logbook_trips(id) on delete cascade not null,
  type              text not null check (type in ('flight','hotel','car','train','activity','other')),
  provider          text,
  confirmation_code text,
  from_location     text,
  to_location       text,
  departure_at      timestamptz,
  arrival_at        timestamptz,
  details           jsonb default '{}',
  raw_text          text,
  created_at        timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_logbook_trips_user on logbook_trips(user_id);
create index if not exists idx_logbook_bookings_trip on logbook_bookings(trip_id);
create index if not exists idx_logbook_bookings_departure on logbook_bookings(departure_at);
create index if not exists idx_logbook_magic_links_token on logbook_magic_links(token);
create index if not exists idx_logbook_magic_links_email on logbook_magic_links(email);

-- Row Level Security (enabled, but access is controlled via service key in API)
alter table logbook_users enable row level security;
alter table logbook_trips enable row level security;
alter table logbook_bookings enable row level security;
alter table logbook_magic_links enable row level security;

-- Service role has full access (our API uses the service key)
create policy "service_all_users"        on logbook_users        for all to service_role using (true) with check (true);
create policy "service_all_trips"        on logbook_trips        for all to service_role using (true) with check (true);
create policy "service_all_bookings"     on logbook_bookings     for all to service_role using (true) with check (true);
create policy "service_all_magic_links"  on logbook_magic_links  for all to service_role using (true) with check (true);
