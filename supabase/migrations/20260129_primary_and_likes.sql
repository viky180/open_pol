-- Add Primary affiliation (exclusive) + Party Likes (non-exclusive)
-- Apply this in Supabase SQL editor / migrations.

-- 1) Party likes table
CREATE TABLE IF NOT EXISTS public.party_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(party_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_party_likes_party ON public.party_likes(party_id);
CREATE INDEX IF NOT EXISTS idx_party_likes_user ON public.party_likes(user_id);

-- 2) RLS
ALTER TABLE public.party_likes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='party_likes' AND policyname='Party likes are viewable by everyone'
    ) THEN
        CREATE POLICY "Party likes are viewable by everyone" ON public.party_likes FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='party_likes' AND policyname='Users can like parties'
    ) THEN
        CREATE POLICY "Users can like parties" ON public.party_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='party_likes' AND policyname='Users can unlike parties'
    ) THEN
        CREATE POLICY "Users can unlike parties" ON public.party_likes FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
