-- Extend RLS for shared access (owner/editor/viewer) on pet-related data

CREATE OR REPLACE FUNCTION user_pet_role(p_pet_id TEXT)
RETURNS pet_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.role
  FROM pet_memberships pm
  WHERE pm.pet_id = p_pet_id
    AND pm.user_id = auth.uid()
    AND pm.status = 'active'
  LIMIT 1
$$;

-- pets: viewer can read, editor/owner can update
DROP POLICY IF EXISTS "Shared members can view pets" ON pets;
CREATE POLICY "Shared members can view pets"
ON pets
FOR SELECT
USING (
  owner_id = auth.uid()
  OR user_pet_role(id) IN ('owner', 'editor', 'viewer')
);

DROP POLICY IF EXISTS "Editors can update shared pets" ON pets;
CREATE POLICY "Editors can update shared pets"
ON pets
FOR UPDATE
USING (
  owner_id = auth.uid()
  OR user_pet_role(id) IN ('owner', 'editor')
)
WITH CHECK (
  owner_id = auth.uid()
  OR user_pet_role(id) IN ('owner', 'editor')
);

-- weight_entries
DROP POLICY IF EXISTS "Shared members can view weight entries" ON weight_entries;
CREATE POLICY "Shared members can view weight entries"
ON weight_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pets p
    WHERE p.id = weight_entries.pet_id
      AND (
        p.owner_id = auth.uid()
        OR user_pet_role(p.id) IN ('owner', 'editor', 'viewer')
      )
  )
);

DROP POLICY IF EXISTS "Editors can manage weight entries" ON weight_entries;
CREATE POLICY "Editors can manage weight entries"
ON weight_entries
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pets p
    WHERE p.id = weight_entries.pet_id
      AND (
        p.owner_id = auth.uid()
        OR user_pet_role(p.id) IN ('owner', 'editor')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pets p
    WHERE p.id = weight_entries.pet_id
      AND (
        p.owner_id = auth.uid()
        OR user_pet_role(p.id) IN ('owner', 'editor')
      )
  )
);

-- health_events (slot completion/status updates rely on update permission)
DROP POLICY IF EXISTS "Shared members can view health events" ON health_events;
CREATE POLICY "Shared members can view health events"
ON health_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pets p
    WHERE p.id = health_events.pet_id
      AND (
        p.owner_id = auth.uid()
        OR user_pet_role(p.id) IN ('owner', 'editor', 'viewer')
      )
  )
);

DROP POLICY IF EXISTS "Editors can manage health events" ON health_events;
CREATE POLICY "Editors can manage health events"
ON health_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pets p
    WHERE p.id = health_events.pet_id
      AND (
        p.owner_id = auth.uid()
        OR user_pet_role(p.id) IN ('owner', 'editor')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pets p
    WHERE p.id = health_events.pet_id
      AND (
        p.owner_id = auth.uid()
        OR user_pet_role(p.id) IN ('owner', 'editor')
      )
  )
);
