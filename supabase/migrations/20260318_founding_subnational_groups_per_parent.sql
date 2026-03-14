-- Founding sub-national groups: unique per parent branch
-- ------------------------------------------------------
-- The old uniqueness model was issue-wide. That prevented creating
-- separate default state/district/village founding groups under
-- multiple national groups for the same issue.
--
-- We now scope uniqueness by parent_party_id so each national branch
-- can have its own local founding chain.

-- Existing data may already contain duplicate founding rows under the same
-- parent + location key (usually from earlier race/fallback paths).
-- Keep the oldest row in each key as canonical and demote the rest from
-- founding status so new unique indexes can be created safely.
WITH ranked_duplicates AS (
    SELECT
        p.id,
        ROW_NUMBER() OVER (
            PARTITION BY
                p.parent_party_id,
                p.location_scope,
                lower(p.state_name),
                CASE WHEN p.location_scope IN ('district', 'village') THEN lower(p.district_name) ELSE NULL END,
                CASE WHEN p.location_scope = 'village' THEN lower(p.village_name) ELSE NULL END
            ORDER BY p.created_at ASC, p.id ASC
        ) AS rn
    FROM public.parties AS p
    WHERE p.is_founding_group = TRUE
      AND p.parent_party_id IS NOT NULL
      AND (
          (p.location_scope = 'state' AND p.state_name IS NOT NULL)
          OR (p.location_scope = 'district' AND p.state_name IS NOT NULL AND p.district_name IS NOT NULL)
          OR (p.location_scope = 'village' AND p.state_name IS NOT NULL AND p.district_name IS NOT NULL AND p.village_name IS NOT NULL)
      )
)
UPDATE public.parties AS p
SET is_founding_group = FALSE
FROM ranked_duplicates AS d
WHERE p.id = d.id
  AND d.rn > 1;

DROP INDEX IF EXISTS uniq_founding_group_state;
DROP INDEX IF EXISTS uniq_founding_group_district;
DROP INDEX IF EXISTS uniq_founding_group_village;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_founding_group_state_per_parent
    ON public.parties (parent_party_id, location_scope, lower(state_name))
    WHERE is_founding_group = TRUE
      AND location_scope = 'state'
      AND parent_party_id IS NOT NULL
      AND state_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_founding_group_district_per_parent
    ON public.parties (parent_party_id, location_scope, lower(state_name), lower(district_name))
    WHERE is_founding_group = TRUE
      AND location_scope = 'district'
      AND parent_party_id IS NOT NULL
      AND district_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_founding_group_village_per_parent
    ON public.parties (parent_party_id, location_scope, lower(state_name), lower(district_name), lower(village_name))
    WHERE is_founding_group = TRUE
      AND location_scope = 'village'
      AND parent_party_id IS NOT NULL
      AND village_name IS NOT NULL;
