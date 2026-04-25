-- Health Events table: unified system for all pet health/event tracking.
--
-- NOTE: id and pet_id use TEXT (not UUID) to match the client-side generateId()
-- helper, which produces timestamp+random strings rather than RFC-4122 UUIDs.
-- This is consistent with the existing vaccinations / reminders / documents tables.

create table if not exists health_events (
  id                text        primary key,
  pet_id            text        not null,
  type              text        not null,
  title             text        not null,
  date              text        not null,
  time              text,
  next_date         text,
  next_time         text,
  status            text        not null default 'active'
                                check (status in ('active', 'done', 'cancelled')),
  notes             text,
  photos            jsonb       not null default '[]'::jsonb,
  contact_name      text,
  contact_phone     text,
  contact_address   text,
  notification_ids  jsonb       not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);

-- Fast lookup by pet
create index if not exists health_events_pet_id_idx on health_events(pet_id);
-- Fast filtering by status
create index if not exists health_events_status_idx  on health_events(status);

-- Row-level security: users may only access events for pets they own
alter table health_events enable row level security;

-- Drop the policy first in case this migration is re-run
drop policy if exists "Users manage their own pets health events" on health_events;

create policy "Users manage their own pets health events"
  on health_events
  for all
  using (
    exists (
      select 1 from pets
      where pets.id    = health_events.pet_id
        and pets.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from pets
      where pets.id    = health_events.pet_id
        and pets.owner_id = auth.uid()
    )
  );
