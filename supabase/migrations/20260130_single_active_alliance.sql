-- NOTE (2026-02): This migration used to enforce single active alliance for the
-- old pair-based alliances schema.
--
-- With the new multi-party alliance model (alliance_members), the constraint is
-- enforced by a partial UNIQUE index on alliance_members(party_id) WHERE left_at IS NULL.
--
-- Keep this file as a safe, idempotent guard to ensure the index exists.

DO $$
BEGIN
    IF to_regclass('public.alliance_members') IS NOT NULL THEN
        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_alliance_members_party_active ON public.alliance_members(party_id) WHERE left_at IS NULL';
    END IF;
END $$;
