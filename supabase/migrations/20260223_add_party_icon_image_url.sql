-- Add optional image URL for party/group icon
ALTER TABLE public.parties
    ADD COLUMN IF NOT EXISTS icon_image_url TEXT;

-- Recreate view so icon_image_url is exposed for list APIs.
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
