-- Migration: Add trust_milestones and invitations tables for new feed item types
-- Date: 2026-02-06

-- ============================================
-- TRUST MILESTONES
-- Track when leaders cross trust vote thresholds
-- ============================================
CREATE TABLE trust_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    threshold INTEGER NOT NULL,
    trust_count_at_event INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_trust_milestones_party ON trust_milestones(party_id);
CREATE INDEX idx_trust_milestones_user ON trust_milestones(user_id);
CREATE INDEX idx_trust_milestones_created ON trust_milestones(created_at);

-- RLS for trust_milestones
ALTER TABLE trust_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trust milestones are viewable by everyone" ON trust_milestones FOR SELECT USING (true);
CREATE POLICY "System can insert trust milestones" ON trust_milestones FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- INVITATIONS
-- Track referral invitations with unique codes
-- ============================================
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_invitations_party ON invitations(party_id);
CREATE INDEX idx_invitations_code ON invitations(invite_code);
CREATE INDEX idx_invitations_inviter ON invitations(inviter_id);
CREATE INDEX idx_invitations_accepted ON invitations(accepted_at) WHERE accepted_at IS NOT NULL;

-- RLS for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invitations are viewable by participants" ON invitations FOR SELECT 
    USING (auth.uid() = inviter_id OR auth.uid() = accepted_by);
CREATE POLICY "Users can create invitations" ON invitations FOR INSERT 
    WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Invitations can be updated for acceptance" ON invitations FOR UPDATE 
    USING (auth.uid() IS NOT NULL);

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;
