-- Add structured location fields to profiles table
-- Supports both urban and rural Indian administrative hierarchies.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country    TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS state      TEXT,
  ADD COLUMN IF NOT EXISTS area_type  TEXT CHECK (area_type IN ('urban', 'rural')),
  -- Urban fields
  ADD COLUMN IF NOT EXISTS city         TEXT,
  ADD COLUMN IF NOT EXISTS corporation  TEXT,
  ADD COLUMN IF NOT EXISTS ward         TEXT,
  ADD COLUMN IF NOT EXISTS locality     TEXT,
  -- Rural fields
  ADD COLUMN IF NOT EXISTS district    TEXT,
  ADD COLUMN IF NOT EXISTS block       TEXT,
  ADD COLUMN IF NOT EXISTS panchayat   TEXT,
  ADD COLUMN IF NOT EXISTS village     TEXT,
  -- GPS raw data
  ADD COLUMN IF NOT EXISTS lat        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gps_label  TEXT;

-- Index for filtering by state (common query)
CREATE INDEX IF NOT EXISTS idx_profiles_state ON public.profiles(state);
