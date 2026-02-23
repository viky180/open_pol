-- Delete district-level groups across all categories.
--
-- This removes every party whose location_scope is 'district', and also
-- recursively removes all descendants under those district-level nodes
-- (city/panchayat/village branches), regardless of category.

WITH RECURSIVE target_parties AS (
    SELECT p.id
    FROM public.parties p
    WHERE p.location_scope = 'district'

    UNION

    SELECT child.id
    FROM public.parties child
    INNER JOIN target_parties parent ON child.parent_party_id = parent.id
)
DELETE FROM public.parties p
WHERE p.id IN (SELECT DISTINCT id FROM target_parties);
