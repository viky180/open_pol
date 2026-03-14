-- Founding sub-national groups: unique partial indexes
-- -------------------------------------------------------
-- Prevents duplicate founding groups for the same issue at the same
-- state / district / village level. The SELECT-before-INSERT pattern
-- in the provision-local endpoint is the first guard; these indexes
-- provide database-level enforcement against race conditions.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_founding_group_state
    ON public.parties (issue_id, location_scope, lower(state_name))
    WHERE is_founding_group = TRUE
      AND location_scope = 'state'
      AND state_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_founding_group_district
    ON public.parties (issue_id, location_scope, lower(state_name), lower(district_name))
    WHERE is_founding_group = TRUE
      AND location_scope = 'district'
      AND district_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_founding_group_village
    ON public.parties (issue_id, location_scope, lower(state_name), lower(district_name), lower(village_name))
    WHERE is_founding_group = TRUE
      AND location_scope = 'village'
      AND village_name IS NOT NULL;
