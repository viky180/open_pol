-- Enhance alliances table with creator tracking and required name
-- Alliance name is now required (NOT NULL)

ALTER TABLE alliances ALTER COLUMN name SET NOT NULL;

ALTER TABLE alliances
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS description TEXT;
