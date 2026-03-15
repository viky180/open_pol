-- Add description column to parties for mission statements
-- This helps differentiate competing groups with the same issue name
ALTER TABLE public.parties
    ADD COLUMN IF NOT EXISTS description TEXT CHECK (char_length(description) <= 500);
