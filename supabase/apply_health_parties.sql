-- Run this in Supabase SQL Editor to add categories and health parties
-- This combines the migration and relevant seed data

-- ============================================
-- STEP 1: CREATE CATEGORIES TABLE
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

-- Drop policy if exists and recreate (idempotent)
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone"
    ON public.categories FOR SELECT
    USING (true);

-- ============================================
-- STEP 2: ADD CATEGORY_ID TO PARTIES
-- ============================================

ALTER TABLE public.parties
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parties_category
    ON public.parties(category_id);

-- ============================================
-- STEP 3: INSERT HEALTH CATEGORY
-- ============================================

INSERT INTO categories (id, name, slug) VALUES
('99999999-9999-9999-9999-999999999999', 'Health', 'health')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- STEP 4: INSERT HEALTH PARENT ISSUES
-- ============================================

INSERT INTO parties (id, issue_text, pincodes, category_id, created_by) VALUES
('44444444-4444-4444-4444-444444444444',
 'Make essential medicines affordable and consistently available (stock-outs in govt facilities hurt patients).',
 ARRAY['110001','400001','560001','700001'],
 '99999999-9999-9999-9999-999999999999',
 NULL),
('55555555-5555-5555-5555-555555555555',
 'Strengthen primary healthcare (PHCs/CHCs) with adequate staff, shorter wait times, and reliable diagnostics.',
 ARRAY['110001','400001','560001','700001'],
 '99999999-9999-9999-9999-999999999999',
 NULL),
('66666666-6666-6666-6666-666666666666',
 'Fix health insurance claim denials and delays (cashless approvals + transparent grievance redressal).',
 ARRAY['110001','400001','560001','700001'],
 '99999999-9999-9999-9999-999999999999',
 NULL),
('77777777-7777-7777-7777-777777777777',
 'Improve maternal & child health services: 24x7 delivery care, functioning ambulances, and respectful treatment.',
 ARRAY['110001','400001','560001','700001'],
 '99999999-9999-9999-9999-999999999999',
 NULL)
ON CONFLICT (id) DO UPDATE SET
  issue_text = EXCLUDED.issue_text,
  pincodes = EXCLUDED.pincodes,
  category_id = EXCLUDED.category_id,
  updated_at = NOW();

-- ============================================
-- STEP 5: INSERT HEALTH SUB-ISSUES
-- ============================================

INSERT INTO parties (id, issue_text, pincodes, category_id, created_by) VALUES
('44444444-4444-4444-4444-444444444445',
 'Ensure essential medicines are always in stock in government hospitals/PHCs (publish stock levels; prevent stock-outs).',
 ARRAY['110001','400001','560001','700001'],
 '99999999-9999-9999-9999-999999999999',
 NULL),
('44444444-4444-4444-4444-444444444446',
 'Regulate prices of essential drugs and common medical devices (caps + procurement transparency).',
 ARRAY['110001','400001','560001','700001'],
 '99999999-9999-9999-9999-999999999999',
 NULL),
('55555555-5555-5555-5555-555555555556',
 'Fill doctor/nurse vacancies at PHCs/CHCs; ensure 24x7 emergency coverage in underserved areas.',
 ARRAY['110001','400001','560001','700001'],
 '99999999-9999-9999-9999-999999999999',
 NULL),
('55555555-5555-5555-5555-555555555557',
 'Reduce OPD wait times via token/appointment systems and basic triage at public hospitals.',
 ARRAY['110001','400001','560001','700001'],
 '99999999-9999-9999-9999-999999999999',
 NULL),
('66666666-6666-6666-6666-666666666667',
 'Stop unjust claim denials: publish denial reasons, audit patterns, and improve grievance turnaround.',
 ARRAY['110001','400001','560001','700001'],
 '99999999-9999-9999-9999-999999999999',
 NULL),
('66666666-6666-6666-6666-666666666668',
 'Guarantee time-bound cashless approvals for emergency admissions (e.g., within 30 minutes).',
 ARRAY['110001','400001','560001','700001'],
 '99999999-9999-9999-9999-999999999999',
 NULL),
('77777777-7777-7777-7777-777777777778',
 'Ensure 24x7 delivery and newborn care services at CHCs/FRUs with trained staff and equipment.',
 ARRAY['110001','400001','560001','700001'],
 '99999999-9999-9999-9999-999999999999',
 NULL),
('77777777-7777-7777-7777-777777777779',
 'Improve ambulance response times for pregnant women and emergencies (GPS tracking + accountability).',
 ARRAY['110001','400001','560001','700001'],
 '99999999-9999-9999-9999-999999999999',
 NULL)
ON CONFLICT (id) DO UPDATE SET
  issue_text = EXCLUDED.issue_text,
  pincodes = EXCLUDED.pincodes,
  category_id = EXCLUDED.category_id,
  updated_at = NOW();

-- ============================================
-- STEP 6: LINK SUB-ISSUES TO PARENTS
-- ============================================

INSERT INTO party_merges (child_party_id, parent_party_id, merged_by)
SELECT v.child_party_id, v.parent_party_id, NULL
FROM (VALUES
  ('44444444-4444-4444-4444-444444444445'::uuid, '44444444-4444-4444-4444-444444444444'::uuid),
  ('44444444-4444-4444-4444-444444444446'::uuid, '44444444-4444-4444-4444-444444444444'::uuid),
  ('55555555-5555-5555-5555-555555555556'::uuid, '55555555-5555-5555-5555-555555555555'::uuid),
  ('55555555-5555-5555-5555-555555555557'::uuid, '55555555-5555-5555-5555-555555555555'::uuid),
  ('66666666-6666-6666-6666-666666666667'::uuid, '66666666-6666-6666-6666-666666666666'::uuid),
  ('66666666-6666-6666-6666-666666666668'::uuid, '66666666-6666-6666-6666-666666666666'::uuid),
  ('77777777-7777-7777-7777-777777777778'::uuid, '77777777-7777-7777-7777-777777777777'::uuid),
  ('77777777-7777-7777-7777-777777777779'::uuid, '77777777-7777-7777-7777-777777777777'::uuid)
) AS v(child_party_id, parent_party_id)
WHERE NOT EXISTS (
  SELECT 1
  FROM party_merges pm
  WHERE pm.child_party_id = v.child_party_id
    AND pm.demerged_at IS NULL
);

-- Done! Your health parties should now appear on the home page.
