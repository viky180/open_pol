-- Drop leader_nominations table
-- No longer needed under the flat level-independent leader selection model.
-- Leadership is determined automatically by trust votes within the winning group
-- at each (location_scope, category_id) level — no manual nomination required.

DROP TABLE IF EXISTS public.leader_nominations;
