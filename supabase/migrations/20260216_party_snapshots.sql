-- Party Snapshots — periodic recording of key metrics for trend analysis
-- Powers the "Mood of the Nation" dashboard

-- 1. Snapshots table
CREATE TABLE IF NOT EXISTS public.party_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    member_count INT NOT NULL DEFAULT 0,
    supporter_count INT NOT NULL DEFAULT 0,
    like_count INT NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient trend queries
CREATE INDEX IF NOT EXISTS idx_party_snapshots_party_date
    ON public.party_snapshots(party_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_party_snapshots_recorded_at
    ON public.party_snapshots(recorded_at DESC);

-- RLS: snapshots are public-read, system-insert only
ALTER TABLE public.party_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Party snapshots are viewable by everyone"
    ON public.party_snapshots FOR SELECT USING (true);

-- 2. Function to record snapshots for ALL parties in one call
CREATE OR REPLACE FUNCTION public.record_all_party_snapshots()
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO public.party_snapshots (party_id, member_count, supporter_count, like_count)
    SELECT
        p.id,
        -- Active direct members
        COALESCE(mc.cnt, 0),
        -- Child groups currently attached (supporter count)
        COALESCE(sc.cnt, 0),
        -- Likes
        COALESCE(lc.cnt, 0)
    FROM public.parties p
    LEFT JOIN (
        SELECT party_id, COUNT(*)::INT AS cnt
        FROM public.memberships
        WHERE left_at IS NULL
        GROUP BY party_id
    ) mc ON mc.party_id = p.id
    LEFT JOIN (
        SELECT parent_party_id, COUNT(*)::INT AS cnt
        FROM public.parties
        WHERE parent_party_id IS NOT NULL
        GROUP BY parent_party_id
    ) sc ON sc.parent_party_id = p.id
    LEFT JOIN (
        SELECT party_id, COUNT(*)::INT AS cnt
        FROM public.party_likes
        GROUP BY party_id
    ) lc ON lc.party_id = p.id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Schedule daily snapshot via pg_cron (runs at 02:00 UTC every day)
-- pg_cron must be enabled in your Supabase project (Dashboard → Database → Extensions)
SELECT cron.schedule(
    'daily-party-snapshots',
    '0 2 * * *',
    $$SELECT public.record_all_party_snapshots()$$
);
