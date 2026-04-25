-- ─── Extend health_events with template tracking ────────────────────────────

ALTER TABLE health_events
  ADD COLUMN IF NOT EXISTS extra_fields  JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS template_key  TEXT;

-- ─── Event template usage tracking ──────────────────────────────────────────
-- Tracks how many times each user has used each template key.
-- Used to power "smart", "frequent", and "recent" sort modes on the template
-- selection screen. template_key is either a built-in type string (e.g.
-- "vaccination") or a UUID string from custom_event_templates.id.

CREATE TABLE IF NOT EXISTS event_templates_usage (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key  TEXT        NOT NULL,
  use_count     INTEGER     NOT NULL DEFAULT 1,
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_key)
);

ALTER TABLE event_templates_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own template usage" ON event_templates_usage;
CREATE POLICY "Users manage their own template usage"
  ON event_templates_usage
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Custom event templates ───────────────────────────────────────────────────
-- User-created event template definitions (name + icon).

CREATE TABLE IF NOT EXISTS custom_event_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  icon        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE custom_event_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own custom templates" ON custom_event_templates;
CREATE POLICY "Users manage their own custom templates"
  ON custom_event_templates
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Helper: atomic upsert + increment for template usage ────────────────────
-- Called from the client after each template selection so the count stays
-- accurate even under concurrent requests.

CREATE OR REPLACE FUNCTION increment_template_usage(
  p_user_id     uuid,
  p_template_key text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO event_templates_usage (user_id, template_key, use_count, last_used_at)
  VALUES (p_user_id, p_template_key, 1, now())
  ON CONFLICT (user_id, template_key)
  DO UPDATE SET
    use_count    = event_templates_usage.use_count + 1,
    last_used_at = now();
END;
$$;
