-- Add optional title image URL for issue groups/parties
ALTER TABLE public.parties
    ADD COLUMN IF NOT EXISTS title_image_url TEXT;

-- Recreate parties_with_member_counts so new column is exposed via API queries using this view.
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
