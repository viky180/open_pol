-- Candidacies
-- Any member of a group can declare themselves as a leadership candidate.
-- This signals intent to lead and makes them more visible in the trust vote screen.
-- Leadership is still determined by trust votes (flat model) — declaring candidacy
-- does not grant any automatic status, it only surfaces the member to voters.

CREATE TABLE public.candidacies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    party_id    UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    declared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ,
    UNIQUE (user_id, party_id)
);

-- Indexes
CREATE INDEX idx_candidacies_party ON public.candidacies(party_id) WHERE withdrawn_at IS NULL;
CREATE INDEX idx_candidacies_user  ON public.candidacies(user_id)  WHERE withdrawn_at IS NULL;

-- RLS
ALTER TABLE public.candidacies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidacies are viewable by everyone"
    ON public.candidacies FOR SELECT USING (true);

CREATE POLICY "Users can insert own candidacies"
    ON public.candidacies FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own candidacies"
    ON public.candidacies FOR UPDATE USING (auth.uid() = user_id);
