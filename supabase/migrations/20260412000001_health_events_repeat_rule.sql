-- Add repeat_rule to health_events for calendar-aware recurrence patterns.
--
-- repeat_rule supplements repeat_interval_days for events that recur on
-- calendar boundaries rather than fixed-day intervals:
--   'yearly' — advance by exactly one year (handles Feb-29 via Date.setFullYear)
--
-- Birthday events always use: recurrence_type='regular', repeat_rule='yearly'
-- Other regular events use: recurrence_type='regular', repeat_interval_days=N

alter table health_events
  add column if not exists repeat_rule text
    check (repeat_rule is null or repeat_rule in ('yearly'));

create index if not exists health_events_repeat_rule_idx
  on health_events(repeat_rule) where repeat_rule is not null;
