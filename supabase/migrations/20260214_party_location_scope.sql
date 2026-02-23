-- Location-scoped party hierarchy
-- Adds location_scope to parties so multiple independent parties can coexist
-- at the same administrative level (e.g., two District-level parties with their own sub-groups).

-- 1. Add column
ALTER TABLE public.parties
    ADD COLUMN IF NOT EXISTS location_scope TEXT NOT NULL DEFAULT 'district';

-- 2. Constraint for valid values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'parties_location_scope_check'
    ) THEN
        ALTER TABLE public.parties
            ADD CONSTRAINT parties_location_scope_check
            CHECK (location_scope IN ('national', 'state', 'district', 'city', 'panchayat', 'village'));
    END IF;
END $$;

-- 3. Index for filtering
CREATE INDEX IF NOT EXISTS idx_parties_location_scope ON public.parties(location_scope);

-- 4. Helper: maps scope name to numeric rank (broader = smaller number)
CREATE OR REPLACE FUNCTION public.location_scope_rank(scope TEXT)
RETURNS INT AS $$
BEGIN
    RETURN CASE scope
        WHEN 'national'  THEN 1
        WHEN 'state'     THEN 2
        WHEN 'district'  THEN 3
        WHEN 'city'      THEN 4
        WHEN 'panchayat' THEN 5
        WHEN 'village'   THEN 6
        ELSE 99
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Update validate_party_hierarchy trigger to enforce location scope rules
CREATE OR REPLACE FUNCTION public.validate_party_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    parent_type TEXT;
    parent_scope TEXT;
BEGIN
    IF NEW.parent_party_id = NEW.id THEN
        RAISE EXCEPTION 'A node cannot be its own parent';
    END IF;

    IF NEW.parent_party_id IS NOT NULL THEN
        SELECT node_type, location_scope INTO parent_type, parent_scope
        FROM public.parties WHERE id = NEW.parent_party_id;

        IF parent_type IS NULL THEN
            RAISE EXCEPTION 'Parent party not found';
        END IF;

        IF NEW.node_type = 'community' THEN
            RAISE EXCEPTION 'Community cannot have a parent';
        END IF;

        IF NEW.node_type = 'sub_community' AND parent_type NOT IN ('community', 'sub_community') THEN
            RAISE EXCEPTION 'Sub-community can only exist under community or sub-community';
        END IF;

        IF NEW.node_type = 'group' AND parent_type NOT IN ('community', 'sub_community', 'group') THEN
            RAISE EXCEPTION 'Group can only exist under community or sub-community';
        END IF;

        -- Enforce location scope: child must be equal or narrower than parent
        IF public.location_scope_rank(NEW.location_scope) < public.location_scope_rank(parent_scope) THEN
            RAISE EXCEPTION 'Child location scope (%) cannot be broader than parent scope (%)', NEW.location_scope, parent_scope;
        END IF;

        IF public.check_party_cycle(NEW.id, NEW.parent_party_id) THEN
            RAISE EXCEPTION 'Hierarchy cycle detected';
        END IF;
    ELSE
        -- detached nodes become top-level communities
        NEW.node_type = 'community';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Update get_party_hierarchy_data to include location_scope
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

    -- Fetch entire subtree + member counts + location_scope.
    WITH RECURSIVE down AS (
        SELECT p.id, p.issue_text, p.node_type, p.parent_party_id, p.location_scope
        FROM public.parties p
        WHERE p.id = v_root_id
        UNION ALL
        SELECT c.id, c.issue_text, c.node_type, c.parent_party_id, c.location_scope
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
                'member_count', COALESCE(c.member_count, 0),
                'location_scope', COALESCE(d.location_scope, 'district')
            )
        ),
        '[]'::jsonb
    )
    INTO v_nodes
    FROM down d
    LEFT JOIN counts c ON c.party_id = d.id;

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
