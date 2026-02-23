-- Add explicit location metadata fields for scope-based party discovery
ALTER TABLE public.parties
    ADD COLUMN IF NOT EXISTS location_label TEXT,
    ADD COLUMN IF NOT EXISTS state_name TEXT,
    ADD COLUMN IF NOT EXISTS district_name TEXT,
    ADD COLUMN IF NOT EXISTS city_name TEXT,
    ADD COLUMN IF NOT EXISTS panchayat_name TEXT,
    ADD COLUMN IF NOT EXISTS village_name TEXT;

-- Enforce stricter parent-child scope rule:
-- child must be exactly one level below parent.
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

        IF NOT (child_rank = parent_rank + 1) THEN
            RAISE EXCEPTION 'Child location scope (%) must be exactly one level below parent scope (%)', NEW.location_scope, parent_scope;
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
