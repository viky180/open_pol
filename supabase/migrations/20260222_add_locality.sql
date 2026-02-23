-- Add locality_name column to parties table
-- Locality is an optional sub-area level below Ward/Village (or Corporation/Panchayat)
ALTER TABLE parties ADD COLUMN IF NOT EXISTS locality_name TEXT;
