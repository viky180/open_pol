-- Folder-style hierarchy for parties
-- Category (top-level goal) -> Community -> Sub-community -> Group

ALTER TABLE public.parties
    ADD COLUMN IF NOT EXISTS parent_party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS node_type TEXT NOT NULL DEFAULT 'community';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'parties_node_type_check'
    ) THEN
        ALTER TABLE public.parties
            ADD CONSTRAINT parties_node_type_check
            CHECK (node_type IN ('community', 'sub_community', 'group'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_parties_parent_party_id ON public.parties(parent_party_id);
CREATE INDEX IF NOT EXISTS idx_parties_node_type ON public.parties(node_type);

-- Backfill from existing active merges (compatibility during rollout)
UPDATE public.parties p
SET parent_party_id = pm.parent_party_id,
    node_type = CASE WHEN p.node_type = 'community' THEN 'group' ELSE p.node_type END
FROM public.party_merges pm
WHERE pm.child_party_id = p.id
  AND pm.demerged_at IS NULL
  AND p.parent_party_id IS NULL;

CREATE OR REPLACE FUNCTION public.check_party_cycle(child_id UUID, parent_id UUID)
RETURNS BOOLEAN AS $$
WITH RECURSIVE parent_chain AS (
    SELECT parent_id AS party_id
    UNION ALL
    SELECT p.parent_party_id
    FROM public.parties p
    JOIN parent_chain pc ON p.id = pc.party_id
    WHERE p.parent_party_id IS NOT NULL
)
SELECT EXISTS (
    SELECT 1 FROM parent_chain WHERE party_id = child_id
);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.validate_party_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    parent_type TEXT;
BEGIN
    IF NEW.parent_party_id = NEW.id THEN
        RAISE EXCEPTION 'A node cannot be its own parent';
    END IF;

    IF NEW.parent_party_id IS NOT NULL THEN
        SELECT node_type INTO parent_type FROM public.parties WHERE id = NEW.parent_party_id;

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

DROP TRIGGER IF EXISTS trg_validate_party_hierarchy ON public.parties;
CREATE TRIGGER trg_validate_party_hierarchy
    BEFORE INSERT OR UPDATE OF parent_party_id, node_type
    ON public.parties
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_party_hierarchy();

CREATE OR REPLACE FUNCTION public.auto_promote_parent_to_subcommunity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_party_id IS NOT NULL THEN
        UPDATE public.parties
        SET node_type = 'sub_community'
        WHERE id = NEW.parent_party_id
          AND node_type = 'group';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_promote_parent ON public.parties;
CREATE TRIGGER trg_auto_promote_parent
    AFTER INSERT OR UPDATE OF parent_party_id
    ON public.parties
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_promote_parent_to_subcommunity();
