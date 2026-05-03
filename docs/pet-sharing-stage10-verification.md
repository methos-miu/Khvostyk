# Stage 10 — Pet Sharing: tests & RLS verification

Date: 2026-05-02

## 1) Pre-checks

- Ensure all sharing migrations are applied in order:
  1. `20260502000000_pet_invitations.sql`
  2. `20260502010000_pet_invitation_response_flow.sql`
  3. `20260502020000_qr_invite_token_flow.sql`
  4. `20260502030000_invitation_create_rpc.sql`
- Confirm `pet_memberships` table exists and has unique key `(pet_id, user_id)`.
- Confirm app env has valid Supabase URL and anon key.

---

## 2) Functional test matrix (manual)

### A. Existing user invite (owner -> existing account)
1. Login as pet owner.
2. Open pet profile -> Share screen.
3. Enter email of existing user and choose role (`editor` / `viewer`).
4. Tap send invite.
5. Verify:
   - success alert in sender app;
   - row appears in `pet_invitations` with:
     - `status = pending`,
     - `source = in_app`,
     - `invitee_user_id` populated,
     - role matches selected.
6. Login as invited user.
7. Verify global invitation modal appears.
8. Tap **Yes** and verify:
   - invitation status becomes `accepted`,
   - `responded_at` filled,
   - `pet_memberships` row exists with `status=active`, selected role.

### B. Existing user decline
1. Repeat A.1-A.7.
2. Tap **No** in modal.
3. Verify invitation becomes `declined`, `responded_at` filled.
4. Verify no `pet_memberships` row is created/activated.

### C. Unknown email invite
1. Enter email that does not exist in `users`.
2. Tap send.
3. Verify app shows `Користувача не знайдено`.
4. Verify no invitation row created.

### D. QR invite generation
1. Login as pet owner.
2. Open Share screen, choose role, tap `Generate QR`.
3. Verify QR modal opens and QR is rendered.
4. Verify corresponding `pet_invitations` row:
   - `source = qr`,
   - `token_hash` not null,
   - `status = pending`,
   - `expires_at` not null.

### E. Invite expiry
1. Create invite with short TTL (via direct RPC call in SQL editor for test).
2. Wait until expired and attempt accept.
3. Verify accept RPC fails and invite transitions to `expired`.

---

## 3) RLS verification SQL checklist

Run with different authenticated users in Supabase SQL editor/session impersonation:

### Owner permissions
- Owner can `select/insert/update/delete` invitations for own pet.
- Owner cannot manage invitations for another owner pet.

### Invitee permissions
- Invitee can `select` own invitations (`invitee_user_id` match or email match JWT claim).
- Invitee can `update` only pending invitations and only to respond.
- Invitee cannot create invitations directly for чужий pet.

### Unauthorized access
- Unrelated authenticated user cannot read/write invitations not addressed to them.

### RPC permission checks
- `accept_pet_invitation` and `decline_pet_invitation` reject:
  - unauthenticated calls,
  - calls by non-invitee,
  - non-pending invitations.
- `create_pet_user_invitation` and `create_pet_qr_invitation` reject non-owner calls.

---

## 4) Suggested SQL probes

> Replace placeholders with real values.

```sql
-- As owner: create existing-user invite
select create_pet_user_invitation('PET_ID', 'existing@example.com', 'viewer');

-- As owner: create qr invite
select * from create_pet_qr_invitation('PET_ID', 'editor', 72);

-- As invitee: accept invite
select accept_pet_invitation('INVITATION_UUID');

-- As invitee: decline invite
select decline_pet_invitation('INVITATION_UUID');

-- Inspect invitation state
select id, pet_id, invitee_email, invitee_user_id, role, status, source, token_hash, expires_at, responded_at
from pet_invitations
order by created_at desc
limit 20;

-- Inspect membership state
select pet_id, user_id, role, status
from pet_memberships
where pet_id = 'PET_ID';
```

---

## 5) Known risks to re-check

- `users.email` normalization/case sensitivity consistency.
- Race conditions on repeated accept attempts.
- Delivery mismatch if email sending is re-enabled later without DB persistence coupling.
- Deep link handling after QR scan on installed/non-installed apps (store fallback config).
