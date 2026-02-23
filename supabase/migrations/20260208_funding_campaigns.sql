-- Funding Campaigns for Group Causes
-- Enables transparent crowdfunding with UPI integration

-- ==============================
-- Funding Campaigns
-- ==============================

CREATE TABLE IF NOT EXISTS public.funding_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    goal_amount INTEGER NOT NULL CHECK (goal_amount > 0),
    upi_id TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_funding_campaigns_party
    ON public.funding_campaigns (party_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_funding_campaigns_status
    ON public.funding_campaigns (status, ends_at);

-- ==============================
-- Funding Donations
-- ==============================

CREATE TABLE IF NOT EXISTS public.funding_donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.funding_campaigns(id) ON DELETE CASCADE,
    donor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    donor_name TEXT NOT NULL,
    donor_message TEXT,
    upi_transaction_id TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funding_donations_campaign
    ON public.funding_donations (campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_funding_donations_donor
    ON public.funding_donations (donor_id, created_at DESC);

-- ==============================
-- RLS Policies
-- ==============================

ALTER TABLE public.funding_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_donations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Funding campaigns viewable by everyone
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='funding_campaigns' AND policyname='Funding campaigns are viewable by everyone'
    ) THEN
        CREATE POLICY "Funding campaigns are viewable by everyone"
            ON public.funding_campaigns FOR SELECT USING (true);
    END IF;

    -- Authenticated users can create/manage campaigns
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='funding_campaigns' AND policyname='Authenticated users can manage funding campaigns'
    ) THEN
        CREATE POLICY "Authenticated users can manage funding campaigns"
            ON public.funding_campaigns FOR ALL
            USING (auth.uid() IS NOT NULL)
            WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    -- Donations viewable by everyone (transparency)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='funding_donations' AND policyname='Funding donations are viewable by everyone'
    ) THEN
        CREATE POLICY "Funding donations are viewable by everyone"
            ON public.funding_donations FOR SELECT USING (true);
    END IF;

    -- Authenticated users can create donations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='funding_donations' AND policyname='Authenticated users can create donations'
    ) THEN
        CREATE POLICY "Authenticated users can create donations"
            ON public.funding_donations FOR INSERT
            WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    -- Leaders can verify donations (update)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='funding_donations' AND policyname='Authenticated users can update donations'
    ) THEN
        CREATE POLICY "Authenticated users can update donations"
            ON public.funding_donations FOR UPDATE
            USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- ==============================
-- Helper Functions
-- ==============================

-- Get campaign total raised amount
CREATE OR REPLACE FUNCTION public.get_campaign_raised_amount(p_campaign_id UUID)
RETURNS INTEGER AS $$
    SELECT COALESCE(SUM(amount)::INTEGER, 0)
    FROM public.funding_donations
    WHERE campaign_id = p_campaign_id AND is_verified = TRUE;
$$ LANGUAGE sql STABLE;

-- Get campaign donor count
CREATE OR REPLACE FUNCTION public.get_campaign_donor_count(p_campaign_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(DISTINCT donor_id)::INTEGER
    FROM public.funding_donations
    WHERE campaign_id = p_campaign_id AND is_verified = TRUE;
$$ LANGUAGE sql STABLE;

-- ==============================
-- Trigger for updated_at
-- ==============================

CREATE OR REPLACE FUNCTION public.update_funding_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_funding_campaign_updated ON public.funding_campaigns;
CREATE TRIGGER trg_funding_campaign_updated
BEFORE UPDATE ON public.funding_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_funding_campaign_timestamp();
