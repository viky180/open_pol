-- Allow multi-scope memberships (one per geographic scope level)
-- ---------------------------------------------------------------
-- The original idx_memberships_user_active index enforced a single
-- active membership per user across ALL parties. The app now supports
-- one active membership per scope level (national, state, district,
-- village) independently. The API-level "Constraint 1" in the join
-- route enforces one-per-scope; this index was blocking cross-scope
-- joins with a false unique violation.

DROP INDEX IF EXISTS public.idx_memberships_user_active;
