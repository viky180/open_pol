-- Categories for issues (e.g., Health)
-- Adds a minimal, optional categorization layer on top of parties (issues).

-- ============================================
-- CATEGORIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(name),
    UNIQUE(slug)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public read (categories are shared taxonomy)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public'
          AND tablename='categories'
          AND policyname='Categories are viewable by everyone'
    ) THEN
        CREATE POLICY "Categories are viewable by everyone"
            ON public.categories FOR SELECT
            USING (true);
    END IF;
END $$;

-- ============================================
-- PARTIES: ADD OPTIONAL CATEGORY FK
-- ============================================

ALTER TABLE public.parties
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parties_category
    ON public.parties(category_id);
