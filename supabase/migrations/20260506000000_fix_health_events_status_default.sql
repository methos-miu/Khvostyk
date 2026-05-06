-- Fix mismatch between health_events.status default and allowed CHECK values.
-- Historically, default was 'active' while the status CHECK allows only:
-- planned | done | overdue | cancelled.
-- This migration aligns default to 'planned' and normalizes any legacy 'active' rows.

UPDATE public.health_events
SET status = 'planned'
WHERE status = 'active';

ALTER TABLE public.health_events
  ALTER COLUMN status SET DEFAULT 'planned';
