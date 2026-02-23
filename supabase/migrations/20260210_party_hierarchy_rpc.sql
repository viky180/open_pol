-- Optimized hierarchy retrieval: single RPC returns
-- - root party id
-- - ancestors chain (root -> current)
-- - flat list of all nodes in the subtree (root -> descendants) with member counts

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

    -- Safety fallback (should never happen if party exists)
    IF v_root_id IS NULL THEN
        v_root_id := p_party_id;
    END IF;

    -- Fetch entire subtree in one go + member counts.
    WITH RECURSIVE down AS (
        SELECT p.id, p.issue_text, p.node_type, p.parent_party_id
        FROM public.parties p
        WHERE p.id = v_root_id
        UNION ALL
        SELECT c.id, c.issue_text, c.node_type, c.parent_party_id
        FROM public.parties c
        JOIN down d ON c.parent_party_id = d.id
    ),
    counts AS (
        SELECT m.party_id, COUNT(*)::INT AS member_count
        FROM public.memberships m
        WHERE m.left_at IS NULL
        GROUP BY m.party_id
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', d.id,
                'issue_text', d.issue_text,
                'node_type', COALESCE(d.node_type, 'community'),
                'parent_party_id', d.parent_party_id,
                'member_count', COALESCE(c.member_count, 0)
            )
        ),
        '[]'::jsonb
    )
    INTO v_nodes
    FROM down d
    LEFT JOIN counts c ON c.party_id = d.id;

    -- Ancestor chain for breadcrumbs (root -> current)
    WITH RECURSIVE up2 AS (
        SELECT p.id, p.issue_text, p.node_type, p.parent_party_id, 0 AS depth
        FROM public.parties p
        WHERE p.id = p_party_id
        UNION ALL
        SELECT p2.id, p2.issue_text, p2.node_type, p2.parent_party_id, up2.depth + 1
        FROM public.parties p2
        JOIN up2 ON p2.id = up2.parent_party_id
        WHERE up2.parent_party_id IS NOT NULL
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'party_id', up2.id,
                'issue_text', up2.issue_text,
                'node_type', COALESCE(up2.node_type, 'community')
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
