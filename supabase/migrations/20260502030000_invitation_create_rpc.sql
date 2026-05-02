-- Stage 9/10 hardening: create invitation RPCs for existing users and robust role casting

CREATE OR REPLACE FUNCTION create_pet_user_invitation(
  p_pet_id TEXT,
  p_invitee_email TEXT,
  p_role TEXT
)
RETURNS pet_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role pet_role;
  v_email TEXT := lower(trim(p_invitee_email));
  v_inv pet_invitations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_role NOT IN ('editor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  v_role := p_role::pet_role;

  IF v_email = '' THEN
    RAISE EXCEPTION 'Invitee email is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pets WHERE id = p_pet_id AND owner_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Only pet owner can invite';
  END IF;

  INSERT INTO pet_invitations (
    pet_id,
    inviter_user_id,
    invitee_user_id,
    invitee_email,
    role,
    status,
    source
  )
  VALUES (
    p_pet_id,
    v_uid,
    (SELECT id FROM users WHERE lower(email) = v_email LIMIT 1),
    v_email,
    v_role,
    'pending',
    'in_app'
  )
  ON CONFLICT (pet_id, invitee_email, role)
  WHERE status = 'pending'
  DO UPDATE SET
    inviter_user_id = EXCLUDED.inviter_user_id,
    invitee_user_id = EXCLUDED.invitee_user_id,
    updated_at = NOW()
  RETURNING * INTO v_inv;

  RETURN v_inv;
END;
$$;

REVOKE ALL ON FUNCTION create_pet_user_invitation(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_pet_user_invitation(TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION create_pet_qr_invitation(
  p_pet_id TEXT,
  p_role TEXT,
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
  v_role pet_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_role NOT IN ('editor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  v_role := p_role::pet_role;

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
    v_role,
    'pending',
    v_hash,
    'qr',
    NOW() + make_interval(hours => GREATEST(p_expires_in_hours, 1))
  )
  RETURNING id INTO v_invitation_id;

  RETURN QUERY SELECT v_invitation_id, v_raw_token;
END;
$$;

REVOKE ALL ON FUNCTION create_pet_qr_invitation(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_pet_qr_invitation(TEXT, TEXT, INTEGER) TO authenticated;
