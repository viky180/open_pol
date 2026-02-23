-- Leader Nominations
-- Sub-group leaders must self-nominate before appearing as candidates
-- in a parent group's leadership election.

CREATE TABLE leader_nominations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    from_party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    to_party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    withdrawn_at TIMESTAMPTZ,
    UNIQUE(user_id, to_party_id)
);

-- Indexes
CREATE INDEX idx_leader_nominations_to_party ON leader_nominations(to_party_id) WHERE withdrawn_at IS NULL;
CREATE INDEX idx_leader_nominations_user ON leader_nominations(user_id) WHERE withdrawn_at IS NULL;

-- RLS
ALTER TABLE leader_nominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leader nominations are viewable by everyone"
    ON leader_nominations FOR SELECT USING (true);

CREATE POLICY "Users can insert own nominations"
    ON leader_nominations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nominations"
    ON leader_nominations FOR UPDATE USING (auth.uid() = user_id);
