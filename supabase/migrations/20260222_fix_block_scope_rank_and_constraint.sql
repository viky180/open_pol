-- Fix location scope enum/check and ranking after city -> block rename.
-- Without this, inserting a child with location_scope='block' can fail
-- with scope validation errors because old DB objects may still reference 'city'.

-- Normalize legacy data first (safe if no rows use 'city').
UPDATE public.parties
SET location_scope = 'block'
WHERE location_scope = 'city';

-- Recreate scope constraint to include 'block' (and not 'city').
ALTER TABLE public.parties
    DROP CONSTRAINT IF EXISTS parties_location_scope_check;

ALTER TABLE public.parties
    ADD CONSTRAINT parties_location_scope_check
    CHECK (location_scope IN ('national', 'state', 'district', 'block', 'panchayat', 'village'));

-- Recreate rank helper with block scope.
CREATE OR REPLACE FUNCTION public.location_scope_rank(scope TEXT)
RETURNS INT AS $$
BEGIN
    RETURN CASE scope
        WHEN 'national'  THEN 1
        WHEN 'state'     THEN 2
        WHEN 'district'  THEN 3
        WHEN 'block'     THEN 4
        WHEN 'panchayat' THEN 5
        WHEN 'village'   THEN 6
        ELSE 99
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
