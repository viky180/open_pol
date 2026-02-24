-- Migration: Batch recursive member counting to solve N+1 on page load

CREATE OR REPLACE FUNCTION public.get_recursive_member_counts_batch(p_party_ids UUID[])
RETURNS TABLE(party_id UUID, member_count INT) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE subordinates AS (
        SELECT id AS node_id, id AS root_id
        FROM public.parties
        WHERE id = ANY(p_party_ids)
        UNION ALL
        SELECT p.id, s.root_id
        FROM public.parties p
        JOIN subordinates s ON p.parent_party_id = s.node_id
    )
    SELECT 
        s.root_id AS party_id,
        COUNT(m.user_id)::INT AS member_count
    FROM subordinates s
    LEFT JOIN public.memberships m ON m.party_id = s.node_id AND m.left_at IS NULL
    GROUP BY s.root_id;
END;
$$ LANGUAGE plpgsql STABLE;
