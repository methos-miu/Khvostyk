-- Stage 9: QR / deep-link invitation token flow

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION create_pet_qr_invitation(
  p_pet_id TEXT,
  p_role pet_role,
  p_expires_in_hours INTEGER DEFAULT 72
)
RETURNS TABLE (
  invitation_id UUID,
  raw_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_raw_token TEXT;
  v_hash TEXT;
  v_invitation_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_role NOT IN ('editor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pets WHERE id = p_pet_id AND owner_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Only pet owner can create QR invites';
  END IF;

  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

  INSERT INTO pet_invitations (
    pet_id,
    inviter_user_id,
    invitee_email,
    role,
    status,
    token_hash,
    source,
    expires_at
  )
  VALUES (
    p_pet_id,
    v_uid,
    'qr-pending+' || substr(v_raw_token, 1, 10) || '@invite.local',
    p_role,
    'pending',
    v_hash,
    'qr',
    NOW() + make_interval(hours => GREATEST(p_expires_in_hours, 1))
  )
  RETURNING id INTO v_invitation_id;

  RETURN QUERY SELECT v_invitation_id, v_raw_token;
END;
$$;

REVOKE ALL ON FUNCTION create_pet_qr_invitation(TEXT, pet_role, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_pet_qr_invitation(TEXT, pet_role, INTEGER) TO authenticated;
