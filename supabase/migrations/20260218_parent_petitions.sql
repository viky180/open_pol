-- Parent Petitions: structured demands from sub-groups to parent groups
CREATE TABLE parent_petitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    to_party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    petition_text TEXT NOT NULL CHECK (char_length(petition_text) BETWEEN 10 AND 2000),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'addressed')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_parent_petitions_from ON parent_petitions(from_party_id);
CREATE INDEX idx_parent_petitions_to ON parent_petitions(to_party_id);
CREATE INDEX idx_parent_petitions_status ON parent_petitions(status);

-- RLS
ALTER TABLE parent_petitions ENABLE ROW LEVEL SECURITY;

-- Members of either party can read petitions
CREATE POLICY "Members can read petitions"
    ON parent_petitions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.user_id = auth.uid()
              AND memberships.left_at IS NULL
              AND memberships.party_id IN (parent_petitions.from_party_id, parent_petitions.to_party_id)
        )
    );

-- Only authenticated users can insert (leader check done at API level)
CREATE POLICY "Authenticated users can insert petitions"
    ON parent_petitions FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Only parent group leader can update status (done at API level, allow update by members of to_party)
CREATE POLICY "Parent group members can update petition status"
    ON parent_petitions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.user_id = auth.uid()
              AND memberships.left_at IS NULL
              AND memberships.party_id = parent_petitions.to_party_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.user_id = auth.uid()
              AND memberships.left_at IS NULL
              AND memberships.party_id = parent_petitions.to_party_id
        )
    );
