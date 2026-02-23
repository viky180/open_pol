-- Remove primary affiliation fields from profiles

ALTER TABLE public.profiles
    DROP COLUMN IF EXISTS primary_party_id,
    DROP COLUMN IF EXISTS primary_changed_at;