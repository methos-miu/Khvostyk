-- Pet sharing invitations (stage 5)
-- Supports:
-- 1) invites for existing users (invitee_user_id),
-- 2) invites for email-only recipients (invitee_email),
-- 3) transition to memberships after accept.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pet_role') THEN
    CREATE TYPE pet_role AS ENUM ('owner', 'editor', 'viewer');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pet_invitation_status') THEN
    CREATE TYPE pet_invitation_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled', 'expired');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS pet_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  invitee_email TEXT NOT NULL,
  role pet_role NOT NULL CHECK (role IN ('editor', 'viewer')),
  status pet_invitation_status NOT NULL DEFAULT 'pending',
  token_hash TEXT NULL,
  source TEXT NOT NULL DEFAULT 'in_app' CHECK (source IN ('in_app', 'email', 'qr')),
  expires_at TIMESTAMPTZ NULL,
  responded_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS pet_invitations_pending_unique
  ON pet_invitations (pet_id, invitee_email, role)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS pet_invitations_invitee_user_idx
  ON pet_invitations (invitee_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS pet_invitations_invitee_email_idx
  ON pet_invitations (invitee_email, status, created_at DESC);

CREATE INDEX IF NOT EXISTS pet_invitations_pet_idx
  ON pet_invitations (pet_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS pet_invitations_token_hash_idx
  ON pet_invitations (token_hash)
  WHERE token_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION set_pet_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pet_invitations_updated_at ON pet_invitations;
CREATE TRIGGER trg_pet_invitations_updated_at
BEFORE UPDATE ON pet_invitations
FOR EACH ROW
EXECUTE FUNCTION set_pet_invitations_updated_at();

ALTER TABLE pet_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage invitations for owned pets" ON pet_invitations;
CREATE POLICY "Owners can manage invitations for owned pets"
ON pet_invitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = pet_invitations.pet_id
      AND pets.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = pet_invitations.pet_id
      AND pets.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Invitees can read their invitations" ON pet_invitations;
CREATE POLICY "Invitees can read their invitations"
ON pet_invitations
FOR SELECT
USING (
  invitee_user_id = auth.uid()
  OR lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

DROP POLICY IF EXISTS "Invitees can respond to pending invitations" ON pet_invitations;
CREATE POLICY "Invitees can respond to pending invitations"
ON pet_invitations
FOR UPDATE
USING (
  status = 'pending'
  AND (
    invitee_user_id = auth.uid()
    OR lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
WITH CHECK (
  (
    status IN ('accepted', 'declined')
    AND responded_at IS NOT NULL
  )
  OR status = 'pending'
);
