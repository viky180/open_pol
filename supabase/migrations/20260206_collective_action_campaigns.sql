-- Collective Action Campaigns
-- Adds petitions, event coordination, member RSVP/signatures,
-- and milestone-based escalation action automation.

-- ==============================
-- Petition Campaigns
-- ==============================

CREATE TABLE IF NOT EXISTS public.petition_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    authority_name TEXT,
    authority_email TEXT,
    target_signatures INTEGER NOT NULL CHECK (target_signatures > 0),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    auto_send_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'threshold_met', 'sent', 'closed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_petition_campaigns_party
    ON public.petition_campaigns (party_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_petition_campaigns_status
    ON public.petition_campaigns (status, ends_at);

CREATE TABLE IF NOT EXISTS public.petition_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.petition_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_method TEXT NOT NULL DEFAULT 'account_membership',
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_petition_signatures_campaign
    ON public.petition_signatures (campaign_id, signed_at DESC);

-- ==============================
-- Public Rally / Event Coordination
-- ==============================

CREATE TABLE IF NOT EXISTS public.campaign_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('rally', 'rti_drive', 'public_hearing', 'other')),
    title TEXT NOT NULL,
    description TEXT,
    venue_name TEXT,
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    reminder_pincodes TEXT[] NOT NULL DEFAULT '{}',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_party
    ON public.campaign_events (party_id, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_events_upcoming
    ON public.campaign_events (starts_at);

CREATE TABLE IF NOT EXISTS public.event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.campaign_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('yes', 'maybe', 'no')),
    user_pincode_snapshot TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event
    ON public.event_rsvps (event_id, status);

-- ==============================
-- Milestone-based Escalation Actions
-- ==============================

CREATE TABLE IF NOT EXISTS public.milestone_escalation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    threshold INTEGER NOT NULL CHECK (threshold IN (100, 500, 1000)),
    action_type TEXT NOT NULL CHECK (action_type IN ('media_outreach', 'formal_letter', 'higher_authority')),
    action_title TEXT NOT NULL,
    action_body TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(party_id, threshold, action_type)
);

CREATE INDEX IF NOT EXISTS idx_milestone_escalation_rules_party
    ON public.milestone_escalation_rules (party_id, threshold);

CREATE TABLE IF NOT EXISTS public.milestone_escalation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.milestone_escalation_rules(id) ON DELETE SET NULL,
    threshold INTEGER NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('media_outreach', 'formal_letter', 'higher_authority')),
    action_title TEXT NOT NULL,
    action_body TEXT,
    member_count_at_event INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'completed', 'dismissed')),
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(party_id, threshold, action_type)
);

CREATE INDEX IF NOT EXISTS idx_milestone_escalation_actions_party
    ON public.milestone_escalation_actions (party_id, triggered_at DESC);

-- ==============================
-- RLS Policies
-- ==============================

ALTER TABLE public.petition_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petition_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_escalation_actions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='petition_campaigns' AND policyname='Petition campaigns are viewable by everyone'
    ) THEN
        CREATE POLICY "Petition campaigns are viewable by everyone"
            ON public.petition_campaigns FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='petition_campaigns' AND policyname='Authenticated users can manage petition campaigns'
    ) THEN
        CREATE POLICY "Authenticated users can manage petition campaigns"
            ON public.petition_campaigns FOR ALL
            USING (auth.uid() IS NOT NULL)
            WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='petition_signatures' AND policyname='Petition signatures are viewable by everyone'
    ) THEN
        CREATE POLICY "Petition signatures are viewable by everyone"
            ON public.petition_signatures FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='petition_signatures' AND policyname='Users can sign petitions as themselves'
    ) THEN
        CREATE POLICY "Users can sign petitions as themselves"
            ON public.petition_signatures FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='campaign_events' AND policyname='Campaign events are viewable by everyone'
    ) THEN
        CREATE POLICY "Campaign events are viewable by everyone"
            ON public.campaign_events FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='campaign_events' AND policyname='Authenticated users can manage campaign events'
    ) THEN
        CREATE POLICY "Authenticated users can manage campaign events"
            ON public.campaign_events FOR ALL
            USING (auth.uid() IS NOT NULL)
            WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='event_rsvps' AND policyname='Event RSVPs are viewable by everyone'
    ) THEN
        CREATE POLICY "Event RSVPs are viewable by everyone"
            ON public.event_rsvps FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='event_rsvps' AND policyname='Users can manage own RSVP'
    ) THEN
        CREATE POLICY "Users can manage own RSVP"
            ON public.event_rsvps FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='milestone_escalation_rules' AND policyname='Milestone escalation rules are viewable by everyone'
    ) THEN
        CREATE POLICY "Milestone escalation rules are viewable by everyone"
            ON public.milestone_escalation_rules FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='milestone_escalation_rules' AND policyname='Authenticated users can manage milestone escalation rules'
    ) THEN
        CREATE POLICY "Authenticated users can manage milestone escalation rules"
            ON public.milestone_escalation_rules FOR ALL
            USING (auth.uid() IS NOT NULL)
            WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='milestone_escalation_actions' AND policyname='Milestone escalation actions are viewable by everyone'
    ) THEN
        CREATE POLICY "Milestone escalation actions are viewable by everyone"
            ON public.milestone_escalation_actions FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='milestone_escalation_actions' AND policyname='Authenticated users can update milestone escalation actions'
    ) THEN
        CREATE POLICY "Authenticated users can update milestone escalation actions"
            ON public.milestone_escalation_actions FOR UPDATE
            USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- ==============================
-- Trigger helpers for milestones
-- ==============================

CREATE OR REPLACE FUNCTION public.ensure_default_milestone_escalation_rules(p_party_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.milestone_escalation_rules (
        party_id,
        threshold,
        action_type,
        action_title,
        action_body
    ) VALUES
        (
            p_party_id,
            100,
            'media_outreach',
            'Media outreach package',
            'Prepare and send a local media brief highlighting citizen support and urgency.'
        ),
        (
            p_party_id,
            500,
            'formal_letter',
            'Formal letter to senior authority',
            'Draft and dispatch a formal letter to district/state authority with documented evidence.'
        ),
        (
            p_party_id,
            1000,
            'higher_authority',
            'Escalate to higher authority',
            'Escalate issue to higher-level authority and request a time-bound public response.'
        )
    ON CONFLICT (party_id, threshold, action_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.maybe_create_milestone_escalation_actions(p_party_id UUID)
RETURNS VOID AS $$
DECLARE
    current_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER
    INTO current_count
    FROM public.memberships
    WHERE party_id = p_party_id AND left_at IS NULL;

    IF current_count IN (100, 500, 1000) THEN
        PERFORM public.ensure_default_milestone_escalation_rules(p_party_id);

        INSERT INTO public.milestone_escalation_actions (
            party_id,
            rule_id,
            threshold,
            action_type,
            action_title,
            action_body,
            member_count_at_event,
            status
        )
        SELECT
            r.party_id,
            r.id,
            r.threshold,
            r.action_type,
            r.action_title,
            r.action_body,
            current_count,
            'triggered'
        FROM public.milestone_escalation_rules r
        WHERE r.party_id = p_party_id
          AND r.threshold = current_count
          AND r.is_enabled = TRUE
        ON CONFLICT (party_id, threshold, action_type) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_membership_collective_campaigns()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.maybe_create_milestone_escalation_actions(NEW.party_id);
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.left_at IS NOT NULL AND NEW.left_at IS NULL) THEN
            PERFORM public.maybe_create_milestone_escalation_actions(NEW.party_id);
        END IF;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_membership_collective_campaigns ON public.memberships;
CREATE TRIGGER trg_membership_collective_campaigns
AFTER INSERT OR UPDATE OF left_at ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.handle_membership_collective_campaigns();
