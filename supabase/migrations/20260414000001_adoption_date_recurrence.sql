-- ─── Add adoption_date to pets ──────────────────────────────────────────────
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS adoption_date DATE;

-- ─── Migrate 'repeating' recurrence type to 'regular' ────────────────────────
-- 'repeating' is being removed; existing events become 'regular'.
UPDATE health_events
  SET recurrence_type = 'regular'
  WHERE recurrence_type = 'repeating';

-- ─── Replace recurrence_type check constraint ─────────────────────────────────
ALTER TABLE health_events
  DROP CONSTRAINT IF EXISTS health_events_recurrence_type_check;

ALTER TABLE health_events
  ADD CONSTRAINT health_events_recurrence_type_check
  CHECK (recurrence_type IN ('one_time', 'regular'));
