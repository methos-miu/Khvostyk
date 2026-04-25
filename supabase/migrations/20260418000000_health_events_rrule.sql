-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Health Events rrule Architecture
-- Version: 20260418000000
--
-- Adds:
--   • rrule text — recurrence rule string (e.g. "FREQ=WEEKLY;INTERVAL=2")
--     Null for one-time events. Stored only on anchor records.
--   • recurrence_id date — for exception records, stores the original
--     scheduled date this record overrides.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE health_events
  ADD COLUMN IF NOT EXISTS rrule          text,
  ADD COLUMN IF NOT EXISTS recurrence_id  date;

-- Backfill rrule from existing interval fields on non-terminal records
UPDATE health_events
  SET rrule = CASE
    WHEN repeat_interval_unit = 'day'   THEN
      'FREQ=DAILY'   || CASE WHEN repeat_interval_value > 1 THEN ';INTERVAL=' || repeat_interval_value ELSE '' END
    WHEN repeat_interval_unit = 'week'  THEN
      'FREQ=WEEKLY'  || CASE WHEN repeat_interval_value > 1 THEN ';INTERVAL=' || repeat_interval_value ELSE '' END
    WHEN repeat_interval_unit = 'month' THEN
      'FREQ=MONTHLY' || CASE WHEN repeat_interval_value > 1 THEN ';INTERVAL=' || repeat_interval_value ELSE '' END
    WHEN repeat_interval_unit = 'year'  THEN
      'FREQ=YEARLY'  || CASE WHEN repeat_interval_value > 1 THEN ';INTERVAL=' || repeat_interval_value ELSE '' END
    WHEN repeat_rule = 'yearly' THEN 'FREQ=YEARLY'
    ELSE NULL
  END
  WHERE rrule IS NULL
    AND status NOT IN ('done', 'cancelled')
    AND (repeat_interval_unit IS NOT NULL OR repeat_rule = 'yearly');

-- Append UNTIL to backfilled rrule where repeat_end_date is set
UPDATE health_events
  SET rrule = rrule || ';UNTIL=' || to_char(repeat_end_date, 'YYYYMMDD') || 'T000000Z'
  WHERE rrule IS NOT NULL
    AND repeat_end_date IS NOT NULL
    AND rrule NOT LIKE '%UNTIL%';

-- Index for exception lookups
CREATE INDEX IF NOT EXISTS idx_health_events_recurrence_id
  ON health_events (series_id, recurrence_id)
  WHERE recurrence_id IS NOT NULL;
