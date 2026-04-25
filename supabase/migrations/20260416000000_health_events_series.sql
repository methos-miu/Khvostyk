-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Health Events Series Architecture
-- Version: 20260416000000
--
-- Changes:
--   • Add series tracking (series_id, is_current, is_modified)
--   • Add cycle/slot support (times_per_cycle, cycle_slots)
--   • Add granular interval fields (repeat_interval_value, repeat_interval_unit)
--   • Add repeat_end_date
--   • Remove 'active' status — only planned / done / overdue / cancelled remain
--   • Backfill all existing rows with sensible defaults
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Add new columns ──────────────────────────────────────────────────────

ALTER TABLE health_events
  ADD COLUMN IF NOT EXISTS series_id             UUID,
  ADD COLUMN IF NOT EXISTS is_current            BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_modified           BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS times_per_cycle       INTEGER  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cycle_slots           JSONB    NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS repeat_interval_value INTEGER,
  ADD COLUMN IF NOT EXISTS repeat_interval_unit  TEXT,
  ADD COLUMN IF NOT EXISTS repeat_end_date       DATE;

-- ─── 2. Constraint on interval unit ─────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'health_events_interval_unit_check'
      AND table_name = 'health_events'
  ) THEN
    ALTER TABLE health_events
      ADD CONSTRAINT health_events_interval_unit_check
      CHECK (repeat_interval_unit IS NULL OR
             repeat_interval_unit IN ('day', 'week', 'month', 'year'));
  END IF;
END $$;

-- ─── 3. Backfill series_id ───────────────────────────────────────────────────
-- Every existing event becomes its own series anchor.

UPDATE health_events
  SET series_id = gen_random_uuid()
  WHERE series_id IS NULL;

-- ─── 4. Mark non-terminal events as is_current ──────────────────────────────

UPDATE health_events
  SET is_current = true
  WHERE status IN ('planned', 'active', 'overdue')
    AND is_current = false;

-- ─── 5. Migrate 'active' → 'planned' ────────────────────────────────────────

UPDATE health_events
  SET status = 'planned'
  WHERE status = 'active';

-- ─── 6. Migrate legacy repeat_interval_days → new value/unit fields ─────────

UPDATE health_events
  SET repeat_interval_value = repeat_interval_days,
      repeat_interval_unit  = 'day'
  WHERE repeat_interval_days IS NOT NULL
    AND repeat_interval_value IS NULL;

-- ─── 7. Migrate yearly repeat_rule → interval value/unit ────────────────────

UPDATE health_events
  SET repeat_interval_value = 1,
      repeat_interval_unit  = 'year'
  WHERE repeat_rule = 'yearly'
    AND repeat_interval_value IS NULL;

-- ─── 8. Drop old status constraint and replace without 'active' ─────────────

ALTER TABLE health_events
  DROP CONSTRAINT IF EXISTS health_events_status_check;

ALTER TABLE health_events
  ADD CONSTRAINT health_events_status_check
  CHECK (status IN ('planned', 'done', 'overdue', 'cancelled'));

-- ─── 9. Indexes for new columns ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_health_events_series_id
  ON health_events (series_id);

CREATE INDEX IF NOT EXISTS idx_health_events_is_current
  ON health_events (pet_id, is_current)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_health_events_is_modified
  ON health_events (series_id, is_modified)
  WHERE is_modified = true;
