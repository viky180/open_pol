-- Performance migration v2: denormalize member_count and add missing indexes
-- This eliminates the expensive JOIN+GROUP BY on every read of parties_with_member_counts.

-- 1. Add member_count column to parties
ALTER TABLE public.parties
    ADD COLUMN IF NOT EXISTS member_count INTEGER NOT NULL DEFAULT 0;

-- 2. Backfill from current memberships
UPDATE public.parties p
SET member_count = sub.cnt
FROM (
    SELECT party_id, COUNT(*)::INTEGER AS cnt
    FROM public.memberships
    WHERE left_at IS NULL
    GROUP BY party_id
) sub
WHERE p.id = sub.party_id;

-- 3. Trigger function to keep member_count in sync
CREATE OR REPLACE FUNCTION public.update_party_member_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT (new membership)
    IF TG_OP = 'INSERT' AND NEW.left_at IS NULL THEN
        UPDATE public.parties SET member_count = member_count + 1 WHERE id = NEW.party_id;
        RETURN NEW;
    END IF;

    -- Handle UPDATE (join → leave or leave → rejoin)
    IF TG_OP = 'UPDATE' THEN
        -- Member left (left_at changed from NULL to a value)
        IF OLD.left_at IS NULL AND NEW.left_at IS NOT NULL THEN
            UPDATE public.parties SET member_count = GREATEST(member_count - 1, 0) WHERE id = NEW.party_id;
        -- Member rejoined (left_at changed from a value to NULL)
        ELSIF OLD.left_at IS NOT NULL AND NEW.left_at IS NULL THEN
            UPDATE public.parties SET member_count = member_count + 1 WHERE id = NEW.party_id;
        END IF;
        RETURN NEW;
    END IF;

    -- Handle DELETE (membership removed entirely)
    IF TG_OP = 'DELETE' AND OLD.left_at IS NULL THEN
        UPDATE public.parties SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.party_id;
        RETURN OLD;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS trg_update_party_member_count ON public.memberships;
CREATE TRIGGER trg_update_party_member_count
    AFTER INSERT OR UPDATE OR DELETE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public.update_party_member_count();

-- 5. Rewrite the view to use the denormalized column (no more JOIN)
--    Must DROP first because CREATE OR REPLACE cannot change column names/order
DROP VIEW IF EXISTS public.parties_with_member_counts;
CREATE VIEW public.parties_with_member_counts AS
SELECT
    p.*,
    CASE
        WHEN p.member_count <= 10 THEN 1
        WHEN p.member_count <= 100 THEN 2
        WHEN p.member_count <= 1000 THEN 3
        ELSE 4
    END AS level
FROM public.parties p;

GRANT SELECT ON public.parties_with_member_counts TO anon, authenticated;

-- 6. Add missing index for alliance_members lookups by party_id
CREATE INDEX IF NOT EXISTS idx_alliance_members_party
    ON public.alliance_members (party_id) WHERE left_at IS NULL;
