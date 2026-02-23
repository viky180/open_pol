-- Recursive member count summation
-- This migration updates get_party_hierarchy_data to include both direct
-- and aggregated (recursive) member counts using a single-pass approach.

-- 1. Standalone helper (kept for ad-hoc / RPC use; NOT called inside the hierarchy function)
CREATE OR REPLACE FUNCTION public.get_recursive_member_count(p_party_id UUID)
RETURNS INT AS $$
DECLARE
    v_total INT;
BEGIN
    WITH RECURSIVE subordinates AS (
        SELECT id
        FROM public.parties
        WHERE id = p_party_id
        UNION ALL
        SELECT p.id
        FROM public.parties p
        JOIN subordinates s ON p.parent_party_id = s.id
    )
    SELECT COUNT(*)::INT
    INTO v_total
    FROM public.memberships m
    WHERE m.party_id IN (SELECT id FROM subordinates)
      AND m.left_at IS NULL;

    RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Optimised get_party_hierarchy_data — single-pass aggregated counts
CREATE OR REPLACE FUNCTION public.get_party_hierarchy_data(p_party_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_root_id UUID;
    v_nodes JSONB;
    v_ancestors JSONB;
BEGIN
    -- Find root by walking up parent_party_id chain.
    WITH RECURSIVE up AS (
        SELECT p.id, p.parent_party_id, 0 AS depth
        FROM public.parties p
        WHERE p.id = p_party_id
        UNION ALL
        SELECT p2.id, p2.parent_party_id, up.depth + 1
        FROM public.parties p2
        JOIN up ON p2.id = up.parent_party_id
        WHERE up.parent_party_id IS NOT NULL
    )
    SELECT up.id
    INTO v_root_id
    FROM up
    WHERE up.parent_party_id IS NULL
    ORDER BY up.depth DESC
    LIMIT 1;

    -- Safety fallback
    IF v_root_id IS NULL THEN
        v_root_id := p_party_id;
    END IF;

    -- Fetch entire subtree + compute aggregated counts in ONE pass.
    WITH RECURSIVE down AS (
        SELECT p.id, p.issue_text, p.node_type, p.parent_party_id, p.location_scope
        FROM public.parties p
        WHERE p.id = v_root_id
        UNION ALL
        SELECT c.id, c.issue_text, c.node_type, c.parent_party_id, c.location_scope
        FROM public.parties c
        JOIN down d ON c.parent_party_id = d.id
    ),
    -- Direct member counts per party (single scan of memberships)
    direct_counts AS (
        SELECT m.party_id, COUNT(*)::INT AS cnt
        FROM public.memberships m
        WHERE m.left_at IS NULL
          AND m.party_id IN (SELECT id FROM down)
        GROUP BY m.party_id
    ),
    -- Map every node to all its ancestors (including itself).
    -- This lets us "bubble up" each node's direct count to every ancestor.
    node_ancestors AS (
        -- Base: every node is its own ancestor
        SELECT d.id AS node_id, d.id AS ancestor_id
        FROM down d
        UNION ALL
        -- Walk up: the ancestors of a node include its parent's ancestors
        SELECT na.node_id, d2.parent_party_id AS ancestor_id
        FROM node_ancestors na
        JOIN down d2 ON d2.id = na.ancestor_id
        WHERE d2.parent_party_id IS NOT NULL
    ),
    -- Sum direct counts across all descendants for each ancestor
    aggregated_counts AS (
        SELECT
            na.ancestor_id,
            COALESCE(SUM(dc.cnt), 0)::INT AS aggregated_member_count
        FROM node_ancestors na
        LEFT JOIN direct_counts dc ON dc.party_id = na.node_id
        GROUP BY na.ancestor_id
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', d.id,
                'issue_text', d.issue_text,
                'node_type', COALESCE(d.node_type, 'community'),
                'parent_party_id', d.parent_party_id,
                'location_scope', COALESCE(d.location_scope, 'district'),
                'member_count', COALESCE(dc.cnt, 0),
                'aggregated_member_count', COALESCE(ac.aggregated_member_count, 0)
            )
        ),
        '[]'::jsonb
    )
    INTO v_nodes
    FROM down d
    LEFT JOIN direct_counts dc ON dc.party_id = d.id
    LEFT JOIN aggregated_counts ac ON ac.ancestor_id = d.id;

    -- Ancestor chain for breadcrumbs (root -> current)
    WITH RECURSIVE up2 AS (
        SELECT p.id, p.issue_text, p.node_type, p.parent_party_id, p.location_scope, 0 AS depth
        FROM public.parties p
        WHERE p.id = p_party_id
        UNION ALL
        SELECT p2.id, p2.issue_text, p2.node_type, p2.parent_party_id, p2.location_scope, up2.depth + 1
        FROM public.parties p2
        JOIN up2 ON p2.id = up2.parent_party_id
        WHERE up2.parent_party_id IS NOT NULL
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'party_id', up2.id,
                'issue_text', up2.issue_text,
                'node_type', COALESCE(up2.node_type, 'community'),
                'location_scope', COALESCE(up2.location_scope, 'district')
            )
            ORDER BY up2.depth DESC
        ),
        '[]'::jsonb
    )
    INTO v_ancestors
    FROM up2;

    RETURN jsonb_build_object(
        'root_party_id', v_root_id,
        'nodes', v_nodes,
        'ancestors', v_ancestors
    );
END;
$$ LANGUAGE plpgsql STABLE;
