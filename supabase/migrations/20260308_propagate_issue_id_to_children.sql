-- Propagate issue_id from national ancestors down to all child groups
-- ==================================================================
-- Rationale:
--   - National groups have issue_id set at creation.
--   - State / district / village child groups previously stored NULL.
--   - We now propagate issue_id down the parent chain so that:
--     (a) Every group in a hierarchy shares the same issue_id.
--     (b) The join API can do a single column lookup instead of
--         walking the parent chain recursively.

-- 1. Backfill existing child groups
-- Walk the hierarchy from national downward using a recursive CTE.
WITH RECURSIVE hierarchy AS (
    -- Anchor: national groups that have an issue_id
    SELECT id, issue_id
    FROM public.parties
    WHERE location_scope = 'national'
      AND issue_id IS NOT NULL

    UNION ALL

    -- Recurse: children of groups we already resolved
    SELECT c.id, h.issue_id
    FROM public.parties c
    INNER JOIN hierarchy h ON c.parent_party_id = h.id
    WHERE c.issue_id IS NULL   -- only propagate to groups that don't already have one
)
UPDATE public.parties p
SET issue_id = h.issue_id
FROM hierarchy h
WHERE p.id = h.id
  AND p.issue_id IS NULL;

-- 2. Trigger function: when a child group is inserted or its parent changes,
--    copy the issue_id from its nearest national ancestor.
CREATE OR REPLACE FUNCTION public.propagate_issue_id_to_child()
RETURNS TRIGGER AS $$
DECLARE
    v_issue_id  UUID;
    v_cursor_id UUID;
    v_parent_id UUID;
    v_scope     TEXT;
    v_depth     INT := 0;
BEGIN
    -- Only act when a parent is being set
    IF NEW.parent_party_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- If the group already has an explicit issue_id from the caller, respect it.
    IF NEW.issue_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Walk up the parent chain to find the national ancestor's issue_id.
    v_cursor_id := NEW.parent_party_id;
    LOOP
        v_depth := v_depth + 1;
        IF v_depth > 8 THEN EXIT; END IF;          -- safety guard

        SELECT issue_id, location_scope, parent_party_id
        INTO v_issue_id, v_scope, v_parent_id
        FROM public.parties
        WHERE id = v_cursor_id;

        IF NOT FOUND THEN EXIT; END IF;

        -- Found the national ancestor
        IF v_scope = 'national' THEN
            NEW.issue_id := v_issue_id;
            EXIT;
        END IF;

        -- Shortcut: ancestor already has issue_id propagated
        IF v_issue_id IS NOT NULL THEN
            NEW.issue_id := v_issue_id;
            EXIT;
        END IF;

        IF v_parent_id IS NULL THEN EXIT; END IF;   -- reached root, no issue found
        v_cursor_id := v_parent_id;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_propagate_issue_id ON public.parties;
CREATE TRIGGER trg_propagate_issue_id
    BEFORE INSERT OR UPDATE OF parent_party_id
    ON public.parties
    FOR EACH ROW
    EXECUTE FUNCTION public.propagate_issue_id_to_child();

-- 3. Index to make issue_id lookups fast
CREATE INDEX IF NOT EXISTS idx_parties_issue_id
    ON public.parties(issue_id)
    WHERE issue_id IS NOT NULL;

-- Grant no extra permissions needed — existing RLS applies.
