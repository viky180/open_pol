-- Open Politics MVP - Seed Data
-- Demonstrates all core features

-- Note: Run this after schema.sql
-- These UUIDs are placeholders - in production, they come from auth.users

-- ============================================
-- DEMO USERS (profiles)
-- In real usage, these are created via auth signup
-- ============================================

-- For demo purposes, we'll use fixed UUIDs
-- User 1: Amit (Active in small party)
-- User 2: Priya (Active in small party)
-- User 3: Raj (Active in small party, current leader)
-- User 4: Sunita (Founder of large party)
-- User 5: Vikram (Active in large party)
-- User 6-15: Additional members for large party

-- ============================================
-- SAMPLE PARTIES
-- ============================================

-- Small Party: Clean Water Initiative (Level 1 - 5 members)
INSERT INTO parties (id, issue_text, pincodes, created_by) VALUES
('11111111-1111-1111-1111-111111111111', 
 'Demand clean drinking water supply for Jaipur 302001. Current water quality is unsafe for consumption.', 
 ARRAY['302001', '302002'], 
 NULL);

-- Large Party: Farmer Rights (Level 3 - 150+ members simulated)
INSERT INTO parties (id, issue_text, pincodes, created_by) VALUES
('22222222-2222-2222-2222-222222222222', 
 'Ensure minimum support price (MSP) guarantee for all crops in Maharashtra. Farmers deserve fair compensation.',
 ARRAY['411001', '411002', '411003', '411004', '411005'],
 NULL);

-- Medium Party: Education Reform (Level 2 - will have ~50 members)
INSERT INTO parties (id, issue_text, pincodes, created_by) VALUES
('33333333-3333-3333-3333-333333333333',
 'Demand quality government schools with proper infrastructure in rural Karnataka. Every child deserves education.',
 ARRAY['560001', '560002'],
 NULL);

-- ============================================
-- SAMPLE ALLIANCES
-- Small party allied with large party (enables support propagation)
-- ============================================

-- New schema uses (alliances, alliance_members). Each party can only be in one active alliance.
INSERT INTO alliances (id, name) VALUES
('88888888-8888-8888-8888-888888888888', 'Public Services Alliance')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Idempotent insert for alliance members (partial unique index prevents ON CONFLICT)
INSERT INTO alliance_members (alliance_id, party_id)
SELECT '88888888-8888-8888-8888-888888888888', v.party_id
FROM (VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid),
  ('22222222-2222-2222-2222-222222222222'::uuid),
  ('33333333-3333-3333-3333-333333333333'::uuid)
) AS v(party_id)
WHERE NOT EXISTS (
  SELECT 1
  FROM alliance_members am
  WHERE am.party_id = v.party_id
    AND am.left_at IS NULL
);

-- ============================================
-- HEALTH CATEGORY + HEALTHCARE ISSUES (seed)
-- These issue-parties start with NO members; people can join them later.
-- Sub-issues are represented using party_merges (parent issue <- child sub-issue)
-- ============================================

INSERT INTO categories (id, name, slug) VALUES
('99999999-9999-9999-9999-999999999999', 'Health', 'health'),
('aaaaaaaa-1111-1111-1111-111111111111', 'Corruption', 'corruption'),
('bbbbbbbb-2222-2222-2222-222222222222', 'Employment', 'employment'),
('cccccccc-3333-3333-3333-333333333333', 'Taxation', 'taxation'),
('dddddddd-4444-4444-4444-444444444444', 'Urban Governance', 'urban-governance'),
('eeeeeeee-5555-5555-5555-555555555555', 'Education & Skill', 'education-skill'),
('ffffffff-6666-6666-6666-666666666666', 'Social Justice', 'social-justice')
ON CONFLICT (slug) DO NOTHING;

-- Parent issues
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

-- Sub-issues (children)
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

-- Link sub-issues under their parent issues
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

-- ============================================
-- CORRUPTION CATEGORY + ANTI-CORRUPTION ISSUES (seed)
-- ============================================

-- Parent issues
INSERT INTO parties (id, issue_text, pincodes, category_id, created_by) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
 'Stop bribery in municipal permits (building approvals and trade licenses) through transparent online tracking.',
 ARRAY['110001','400001','560001'],
 'aaaaaaaa-1111-1111-1111-111111111111',
 NULL),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
 'End corruption in ration distribution: digitize stock tracking and publish shop-level allocations.',
 ARRAY['110001','302001','700001'],
 'aaaaaaaa-1111-1111-1111-111111111111',
 NULL),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
 'Fix recruitment scams in local government hiring: independent audits and public merit lists.',
 ARRAY['560001','600001','700001'],
 'aaaaaaaa-1111-1111-1111-111111111111',
 NULL)
ON CONFLICT (id) DO UPDATE SET
  issue_text = EXCLUDED.issue_text,
  pincodes = EXCLUDED.pincodes,
  category_id = EXCLUDED.category_id,
  updated_at = NOW();

-- Sub-issues (children)
INSERT INTO parties (id, issue_text, pincodes, category_id, created_by) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
 'Publish real-time status of building permits, fees, and timelines to reduce bribe-seeking in approvals.',
 ARRAY['110001','400001','560001'],
 'aaaaaaaa-1111-1111-1111-111111111111',
 NULL),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
 'Install grievance redressal and CCTV audits in ration shops to curb illegal diversion.',
 ARRAY['110001','302001','700001'],
 'aaaaaaaa-1111-1111-1111-111111111111',
 NULL),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
 'Mandate third-party oversight on recruitment exams and publish anonymized scoring data.',
 ARRAY['560001','600001','700001'],
 'aaaaaaaa-1111-1111-1111-111111111111',
 NULL)
ON CONFLICT (id) DO UPDATE SET
  issue_text = EXCLUDED.issue_text,
  pincodes = EXCLUDED.pincodes,
  category_id = EXCLUDED.category_id,
  updated_at = NOW();

-- Link sub-issues under their parent issues
INSERT INTO party_merges (child_party_id, parent_party_id, merged_by)
SELECT v.child_party_id, v.parent_party_id, NULL
FROM (VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'::uuid)
) AS v(child_party_id, parent_party_id)
WHERE NOT EXISTS (
  SELECT 1
  FROM party_merges pm
  WHERE pm.child_party_id = v.child_party_id
    AND pm.demerged_at IS NULL
);

-- ============================================
-- SAMPLE PARTY SUPPORTS
-- Demonstrates explicit and implicit support
-- ============================================

-- Large party explicitly supports an issue
INSERT INTO party_supports (from_party_id, to_party_id, support_type, target_type, target_id) VALUES
('22222222-2222-2222-2222-222222222222', 
 '11111111-1111-1111-1111-111111111111', 
 'explicit', 
 'issue', 
 '11111111-1111-1111-1111-111111111111');

-- Medium party implicitly supports (via alliance with large party)
INSERT INTO party_supports (from_party_id, to_party_id, support_type, target_type, target_id) VALUES
('33333333-3333-3333-3333-333333333333', 
 '11111111-1111-1111-1111-111111111111', 
 'implicit', 
 'issue', 
 '11111111-1111-1111-1111-111111111111');

-- ============================================
-- SAMPLE QUESTIONS
-- Q&A board demonstration
-- ============================================

INSERT INTO questions (id, party_id, question_text) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 '22222222-2222-2222-2222-222222222222',
 'What specific MSP rates are you demanding for wheat and rice?');

INSERT INTO questions (id, party_id, question_text) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 '22222222-2222-2222-2222-222222222222',
 'How do you plan to pressure the state government on this issue?');

INSERT INTO questions (id, party_id, question_text) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc',
 '11111111-1111-1111-1111-111111111111',
 'What is the current water contamination level in 302001?');

-- ============================================
-- SAMPLE ANSWERS
-- ============================================

INSERT INTO answers (question_id, answer_text) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'We demand Rs 2500/quintal for wheat and Rs 2200/quintal for rice, based on C2+50% formula recommended by Swaminathan Commission.');

-- Note: bbbbbbbb question is UNANSWERED (demonstrates metrics)

-- ============================================
-- SAMPLE REVOCATION
-- Demonstrates a smaller party revoking implicit support
-- ============================================

INSERT INTO revocations (party_id, revoking_party_id, target_type, target_id, reason) VALUES
('22222222-2222-2222-2222-222222222222',
 '33333333-3333-3333-3333-333333333333',
 'question',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 'We disagree with the approach suggested in this question. Our party prefers dialogue over pressure tactics.');

-- ============================================
-- SAMPLE ESCALATION
-- Small party escalates to larger party
-- ============================================

INSERT INTO escalations (source_party_id, target_party_id) VALUES
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- ============================================
-- DEMO DATA SUMMARY
-- ============================================
-- 
-- Parties:
--   1. Clean Water Jaipur (Small, Level 1) - ID: 11111111...
--   2. Farmer Rights Maharashtra (Large, Level 3) - ID: 22222222...
--   3. Education Reform Karnataka (Medium, Level 2) - ID: 33333333...
--
-- Alliances:
--   - Clean Water <-> Farmer Rights
--   - Education Reform <-> Farmer Rights
--
-- Supports:
--   - Farmer Rights EXPLICITLY supports Clean Water's issue
--   - Education Reform IMPLICITLY supports Clean Water (via alliance)
--
-- Revocation:
--   - Education Reform revoked support for a specific question on Farmer Rights
--
-- Questions:
--   - 2 questions on Farmer Rights (1 answered, 1 unanswered)
--   - 1 question on Clean Water
--
-- This demonstrates:
--   ✅ Multiple party sizes/levels
--   ✅ Alliance formation
--   ✅ Explicit support
--   ✅ Implicit support propagation
--   ✅ Support revocation
--   ✅ Q&A with answered/unanswered questions
--   ✅ Issue escalation
