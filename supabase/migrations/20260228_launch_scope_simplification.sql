-- Launch scope simplification:
-- Allow creation hierarchy: national -> state -> district -> village
-- while keeping legacy hierarchy chains valid for existing data.

-- 1) Hierarchy validation
CREATE OR REPLACE FUNCTION public.validate_party_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    parent_type TEXT;
    parent_scope TEXT;
    parent_rank INT;
    child_rank INT;
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

        parent_rank := public.location_scope_rank(parent_scope);
        child_rank := public.location_scope_rank(NEW.location_scope);

        -- Allow legacy exact one-level transitions and launch-phase district -> village.
        IF NOT (
            child_rank = parent_rank + 1
            OR (parent_scope = 'district' AND NEW.location_scope = 'village')
        ) THEN
            RAISE EXCEPTION 'Child location scope (%) is not valid for parent scope (%)', NEW.location_scope, parent_scope;
        END IF;

        IF public.check_party_cycle(NEW.id, NEW.parent_party_id) THEN
            RAISE EXCEPTION 'Hierarchy cycle detected';
        END IF;
    ELSE
        NEW.node_type = 'community';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 2) Competitive affiliation validation
CREATE OR REPLACE FUNCTION public.validate_group_affiliation()
RETURNS TRIGGER AS $$
DECLARE
    v_from_scope TEXT;
    v_to_scope TEXT;
    v_from_parent_id UUID;
    v_from_parent_scope TEXT;
    v_from_competition_parent_id UUID;
    v_to_parent_id UUID;
    v_expected_to_scope TEXT;
BEGIN
    SELECT location_scope, parent_party_id
    INTO v_from_scope, v_from_parent_id
    FROM public.parties
    WHERE id = NEW.from_party_id;

    SELECT location_scope, parent_party_id
    INTO v_to_scope, v_to_parent_id
    FROM public.parties
    WHERE id = NEW.to_party_id;

    IF v_from_scope IS NULL OR v_to_scope IS NULL THEN
        RAISE EXCEPTION 'Both from_party_id and to_party_id must reference valid groups';
    END IF;

    IF v_from_parent_id IS NULL THEN
        RAISE EXCEPTION 'from_party_id must already be attached in hierarchy';
    END IF;

    -- Parent of from_party defines expected broader scope and competition pool.
    SELECT location_scope, parent_party_id
    INTO v_from_parent_scope, v_from_competition_parent_id
    FROM public.parties
    WHERE id = v_from_parent_id;

    v_expected_to_scope := COALESCE(
        v_from_parent_scope,
        CASE v_from_scope
            WHEN 'village' THEN 'district'
            WHEN 'panchayat' THEN 'block'
            WHEN 'block' THEN 'district'
            WHEN 'district' THEN 'state'
            WHEN 'state' THEN 'national'
            ELSE NULL
        END
    );

    IF v_expected_to_scope IS NULL THEN
        RAISE EXCEPTION 'Invalid source scope for affiliation: %', v_from_scope;
    END IF;

    IF v_to_scope <> v_expected_to_scope THEN
        RAISE EXCEPTION 'Invalid affiliation scope transition: % -> % (expected %)', v_from_scope, v_to_scope, v_expected_to_scope;
    END IF;

    -- Keep affiliations inside the same competition pool.
    IF v_from_competition_parent_id IS DISTINCT FROM v_to_parent_id THEN
        RAISE EXCEPTION 'Affiliation target must be from the same competitive pool';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
