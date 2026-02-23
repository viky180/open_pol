-- Party Milestones
-- Creates celebratory events when a party crosses member thresholds.
-- Thresholds (collective, not individual): 10, 100, 1000

-- ==============================
-- Table: party_milestones
-- ==============================

CREATE TABLE IF NOT EXISTS public.party_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL CHECK (milestone_type IN ('members_threshold')),
    threshold INTEGER NOT NULL,
    member_count_at_event INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Idempotency: only one event per party per threshold
    UNIQUE(party_id, milestone_type, threshold)
);

CREATE INDEX IF NOT EXISTS idx_party_milestones_party
    ON public.party_milestones(party_id, created_at DESC);

ALTER TABLE public.party_milestones ENABLE ROW LEVEL SECURITY;

-- Public read (these are collective events, safe to be transparent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public'
          AND tablename='party_milestones'
          AND policyname='Party milestones are viewable by everyone'
    ) THEN
        CREATE POLICY "Party milestones are viewable by everyone"
            ON public.party_milestones FOR SELECT
            USING (true);
    END IF;
END $$;

-- ==============================
-- Trigger: create milestone event on member threshold crossing
-- ==============================

CREATE OR REPLACE FUNCTION public.maybe_create_party_milestone(p_party_id UUID)
RETURNS VOID AS $$
DECLARE
    current_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER
    INTO current_count
    FROM public.memberships
    WHERE party_id = p_party_id AND left_at IS NULL;

    -- Fire on hitting round numbers exactly.
    -- Use ON CONFLICT DO NOTHING to make this safe under concurrency.
    IF current_count IN (10, 100, 1000) THEN
        INSERT INTO public.party_milestones (
            party_id,
            milestone_type,
            threshold,
            member_count_at_event
        ) VALUES (
            p_party_id,
            'members_threshold',
            current_count,
            current_count
        )
        ON CONFLICT (party_id, milestone_type, threshold) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_membership_milestones()
RETURNS TRIGGER AS $$
BEGIN
    -- Only consider active memberships.
    -- INSERT: joining a party
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.maybe_create_party_milestone(NEW.party_id);
        RETURN NEW;
    END IF;

    -- UPDATE: leaving a party sets left_at (we ignore those)
    -- But if in future we add re-join by setting left_at NULL, handle it.
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.left_at IS NOT NULL AND NEW.left_at IS NULL) THEN
            PERFORM public.maybe_create_party_milestone(NEW.party_id);
        END IF;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_membership_milestones ON public.memberships;
CREATE TRIGGER trg_membership_milestones
AFTER INSERT OR UPDATE OF left_at ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.handle_membership_milestones();
