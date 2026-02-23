-- Performance indexes for faster discover/groups loading.
-- These support:
-- 1) recent ordering on parties and parties_with_member_counts-backed queries
-- 2) pincode array filtering with contains(@>)
-- 3) common category + recency filtering patterns

CREATE INDEX IF NOT EXISTS idx_parties_created_at_desc
    ON public.parties (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_parties_pincodes_gin
    ON public.parties USING GIN (pincodes);

CREATE INDEX IF NOT EXISTS idx_parties_category_created_at_desc
    ON public.parties (category_id, created_at DESC);
