-- family_members upsert (registerFamilyMember) requires UPDATE when row exists.

CREATE POLICY "Public update family_members"
  ON family_members FOR UPDATE
  USING (true);
