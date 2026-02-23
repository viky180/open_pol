-- Permission-first location support for party creation
-- Adds optional lat/lng so party discovery can work with browser geolocation
-- while keeping pincode as fallback for users who deny permission.

ALTER TABLE public.parties
    ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'parties_lat_range_check'
    ) THEN
        ALTER TABLE public.parties
            ADD CONSTRAINT parties_lat_range_check
            CHECK (lat IS NULL OR (lat >= -90 AND lat <= 90));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'parties_lng_range_check'
    ) THEN
        ALTER TABLE public.parties
            ADD CONSTRAINT parties_lng_range_check
            CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_parties_lat_lng ON public.parties(lat, lng);
