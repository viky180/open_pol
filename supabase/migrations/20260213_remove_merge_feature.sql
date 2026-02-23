-- Remove deprecated merge feature
-- The hierarchy model uses parent_party_id on the parties table instead.

-- ============================================
-- DROP MERGE-RELATED FUNCTIONS
-- ============================================
DROP FUNCTION IF EXISTS public.check_merge_cycle(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_party_member_breakdown(UUID);

-- ============================================
-- UPDATE get_party_total_members TO USE HIERARCHY (parent_party_id)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_party_total_members(p_party_id UUID)
RETURNS INTEGER AS $$
WITH RECURSIVE hierarchy_tree AS (
    -- Start with the party itself
    SELECT p_party_id AS party_id
    UNION ALL
    -- Add all children recursively via parent_party_id
    SELECT p.id
    FROM parties p
    JOIN hierarchy_tree ht ON p.parent_party_id = ht.party_id
)
SELECT COALESCE(SUM(cnt), 0)::INTEGER FROM (
    SELECT COUNT(*)::INTEGER as cnt
    FROM memberships m
    JOIN hierarchy_tree ht ON m.party_id = ht.party_id
    WHERE m.left_at IS NULL
) sub;
$$ LANGUAGE sql STABLE;

-- ============================================
-- DROP TABLES (order matters for foreign keys)
-- ============================================
DROP TABLE IF EXISTS public.party_merge_signals CASCADE;
DROP TABLE IF EXISTS public.party_merges CASCADE;
DROP TABLE IF EXISTS public.product_events CASCADE;
