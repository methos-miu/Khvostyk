-- Stage 6: accept / decline invitation flow and membership linking

CREATE OR REPLACE FUNCTION accept_pet_invitation(p_invitation_id UUID)
RETURNS pet_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := lower(coalesce((auth.jwt() ->> 'email'), ''));
  v_inv pet_invitations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_inv
  FROM pet_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is not pending';
  END IF;

  IF v_inv.expires_at IS NOT NULL AND v_inv.expires_at < NOW() THEN
    UPDATE pet_invitations
    SET status = 'expired', responded_at = NOW()
    WHERE id = v_inv.id;
    RAISE EXCEPTION 'Invitation expired';
  END IF;

  IF NOT (
    v_inv.invitee_user_id = v_uid
    OR lower(v_inv.invitee_email) = v_email
  ) THEN
    RAISE EXCEPTION 'Not allowed to accept this invitation';
  END IF;

  INSERT INTO pet_memberships (pet_id, user_id, role, status)
  VALUES (v_inv.pet_id, v_uid, v_inv.role, 'active')
  ON CONFLICT (pet_id, user_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active';

  UPDATE pet_invitations
  SET
    status = 'accepted',
    invitee_user_id = COALESCE(invitee_user_id, v_uid),
    responded_at = NOW()
  WHERE id = v_inv.id
  RETURNING * INTO v_inv;

  RETURN v_inv;
END;
$$;

CREATE OR REPLACE FUNCTION decline_pet_invitation(p_invitation_id UUID)
RETURNS pet_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := lower(coalesce((auth.jwt() ->> 'email'), ''));
  v_inv pet_invitations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_inv
  FROM pet_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is not pending';
  END IF;

  IF NOT (
    v_inv.invitee_user_id = v_uid
    OR lower(v_inv.invitee_email) = v_email
  ) THEN
    RAISE EXCEPTION 'Not allowed to decline this invitation';
  END IF;

  UPDATE pet_invitations
  SET
    status = 'declined',
    invitee_user_id = COALESCE(invitee_user_id, v_uid),
    responded_at = NOW()
  WHERE id = v_inv.id
  RETURNING * INTO v_inv;

  RETURN v_inv;
END;
$$;

REVOKE ALL ON FUNCTION accept_pet_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_pet_invitation(UUID) TO authenticated;

REVOKE ALL ON FUNCTION decline_pet_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decline_pet_invitation(UUID) TO authenticated;
