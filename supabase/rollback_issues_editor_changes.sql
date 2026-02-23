-- Rollback script (for Supabase SQL Editor)
-- Use this if you previously ran an "issues + issue_categories + parties.issue_id" schema
-- directly in the Supabase editor and want to remove it.
--
-- This is written to be safe to run multiple times.
-- WARNING: This will DROP DATA in these tables/columns.

BEGIN;

-- 1) Drop policies (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='issues' AND policyname='Issues are viewable by everyone'
  ) THEN
    EXECUTE 'DROP POLICY "Issues are viewable by everyone" ON public.issues';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='issue_categories' AND policyname='Issue categories are viewable by everyone'
  ) THEN
    EXECUTE 'DROP POLICY "Issue categories are viewable by everyone" ON public.issue_categories';
  END IF;
END $$;

-- 2) Drop indexes (if present)
DROP INDEX IF EXISTS public.idx_parties_issue_id;
DROP INDEX IF EXISTS public.idx_issues_parent;
DROP INDEX IF EXISTS public.idx_issues_category;

-- 3) Remove column from parties (if present)
ALTER TABLE IF EXISTS public.parties
  DROP COLUMN IF EXISTS issue_id;

-- 4) Drop tables (if present)
DROP TABLE IF EXISTS public.issues CASCADE;
DROP TABLE IF EXISTS public.issue_categories CASCADE;

COMMIT;
