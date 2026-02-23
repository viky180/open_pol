-- Migration: Multi-Party Alliances
-- Date: 2026-01-30
-- Description: Redesign alliances from pair-based to multi-party model

-- ============================================
-- Step 1: Drop old alliance structure
-- ============================================

-- Drop old trigger
DROP TRIGGER IF EXISTS trg_enforce_single_active_alliance ON public.alliances;

-- Drop old function
DROP FUNCTION IF EXISTS public.enforce_single_active_alliance();

-- Drop old index
DROP INDEX IF EXISTS idx_alliances_active;

-- Drop old alliances table
DROP TABLE IF EXISTS public.alliances CASCADE;

-- ============================================
-- Step 2: Create new alliance structure
-- ============================================

-- ALLIANCES (the alliance entity)
CREATE TABLE alliances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,  -- optional alliance name
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    disbanded_at TIMESTAMPTZ
);

-- ALLIANCE_MEMBERS (junction table linking parties to alliances)
CREATE TABLE alliance_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alliance_id UUID NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    left_at TIMESTAMPTZ,
    -- Each party can only be in ONE active alliance at a time
    -- This constraint is enforced via partial unique index below
    CONSTRAINT fk_alliance FOREIGN KEY (alliance_id) REFERENCES alliances(id),
    CONSTRAINT fk_party FOREIGN KEY (party_id) REFERENCES parties(id)
);

-- ============================================
-- Step 3: Indexes
-- ============================================

-- Ensure each party can only be in one active alliance (where left_at IS NULL)
CREATE UNIQUE INDEX idx_alliance_members_party_active 
ON alliance_members(party_id) 
WHERE left_at IS NULL;

-- Index for querying alliance members
CREATE INDEX idx_alliance_members_alliance ON alliance_members(alliance_id) WHERE left_at IS NULL;

-- Index for active alliances
CREATE INDEX idx_alliances_active ON alliances(id) WHERE disbanded_at IS NULL;

-- ============================================
-- Step 4: Row Level Security
-- ============================================

ALTER TABLE alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_members ENABLE ROW LEVEL SECURITY;

-- Alliances: Public read, authenticated create/update
CREATE POLICY "Alliances are viewable by everyone" 
ON alliances FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create alliances" 
ON alliances FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update alliances" 
ON alliances FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Alliance Members: Public read, authenticated manage
CREATE POLICY "Alliance members are viewable by everyone" 
ON alliance_members FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join alliances" 
ON alliance_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can leave alliances" 
ON alliance_members FOR UPDATE USING (auth.uid() IS NOT NULL);
