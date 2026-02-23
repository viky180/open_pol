-- Party Merge/Demerge Feature
-- Allows parties to merge into other parties (parent-child relationship)

-- ============================================
-- PARTY MERGES TABLE
-- ============================================
CREATE TABLE party_merges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    parent_party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    merged_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    merged_by UUID REFERENCES profiles(id),  -- leader who initiated merge
    demerged_at TIMESTAMPTZ,
    demerged_by UUID REFERENCES profiles(id),
    CONSTRAINT no_self_merge CHECK (child_party_id != parent_party_id)
);

-- ============================================
-- INDEXES
-- ============================================
-- Ensure a party can only have one active merge (as a child)
CREATE UNIQUE INDEX idx_party_merges_child_active 
    ON party_merges(child_party_id) WHERE demerged_at IS NULL;

-- Index for finding children of a parent
CREATE INDEX idx_party_merges_parent 
    ON party_merges(parent_party_id) WHERE demerged_at IS NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE party_merges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merges are viewable by everyone" 
    ON party_merges FOR SELECT USING (true);

CREATE POLICY "Authenticated users can merge" 
    ON party_merges FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can demerge" 
    ON party_merges FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Get total member count including merged children (recursive)
CREATE OR REPLACE FUNCTION get_party_total_members(p_party_id UUID)
RETURNS INTEGER AS $$
WITH RECURSIVE merged_tree AS (
    -- Start with the party itself
    SELECT p_party_id AS party_id
    UNION ALL
    -- Add all children recursively
    SELECT pm.child_party_id
    FROM party_merges pm
    JOIN merged_tree mt ON pm.parent_party_id = mt.party_id
    WHERE pm.demerged_at IS NULL
)
SELECT COALESCE(SUM(cnt), 0)::INTEGER FROM (
    SELECT COUNT(*)::INTEGER as cnt
    FROM memberships m
    JOIN merged_tree mt ON m.party_id = mt.party_id
    WHERE m.left_at IS NULL
) sub;
$$ LANGUAGE sql STABLE;

-- Function: Get member breakdown for a party (shows each merged party's contribution)
CREATE OR REPLACE FUNCTION get_party_member_breakdown(p_party_id UUID)
RETURNS TABLE(
    party_id UUID, 
    issue_text TEXT, 
    member_count INTEGER, 
    is_self BOOLEAN
) AS $$
WITH RECURSIVE merged_tree AS (
    -- Start with the party itself
    SELECT p_party_id AS pid, 0 AS depth
    UNION ALL
    -- Add all children recursively
    SELECT pm.child_party_id, mt.depth + 1
    FROM party_merges pm
    JOIN merged_tree mt ON pm.parent_party_id = mt.pid
    WHERE pm.demerged_at IS NULL
)
SELECT 
    p.id AS party_id,
    p.issue_text,
    get_party_member_count(p.id) AS member_count,
    p.id = p_party_id AS is_self
FROM merged_tree mt
JOIN parties p ON p.id = mt.pid
ORDER BY mt.depth;
$$ LANGUAGE sql STABLE;

-- Function: Check if merging would create a circular reference
CREATE OR REPLACE FUNCTION check_merge_cycle(child_id UUID, parent_id UUID)
RETURNS BOOLEAN AS $$
WITH RECURSIVE parent_chain AS (
    -- Start with the proposed parent
    SELECT parent_id AS party_id
    UNION ALL
    -- Walk up the parent chain
    SELECT pm.parent_party_id
    FROM party_merges pm
    JOIN parent_chain pc ON pm.child_party_id = pc.party_id
    WHERE pm.demerged_at IS NULL
)
SELECT EXISTS (
    SELECT 1 FROM parent_chain WHERE party_id = child_id
);
$$ LANGUAGE sql STABLE;
