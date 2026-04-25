-- Add recurrence and refined status fields to health_events.
--
-- recurrence_type: one_time | repeating | regular
--   one_time   - single occurrence, auto-marked done after date passes
--   repeating  - user manually marks done and picks the next date
--   regular    - fixed interval; next occurrence created automatically
--
-- status updated to: planned | active | overdue | done | cancelled
--   planned  - created, date is in the future
--   active   - event date is today
--   overdue  - date passed and not yet done (repeating only)
--   done     - completed
--   cancelled - removed from view
--
-- repeat_interval_days: used for regular recurrence (e.g. 30 = monthly)

alter table health_events
  add column if not exists recurrence_type     text not null default 'one_time'
                                               check (recurrence_type in ('one_time', 'repeating', 'regular')),
  add column if not exists repeat_interval_days integer;

-- Drop old status constraint and widen it
alter table health_events drop constraint if exists health_events_status_check;

alter table health_events
  add constraint health_events_status_check
  check (status in ('planned', 'active', 'overdue', 'done', 'cancelled'));

-- Back-fill existing rows: map old 'active' → 'planned' (conservative default)
-- Rows already marked 'done' or 'cancelled' are left as-is.
update health_events
set status = 'planned'
where status = 'active';

create index if not exists health_events_recurrence_idx on health_events(recurrence_type);
