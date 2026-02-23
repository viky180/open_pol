-- Rename city_name column to block_name
ALTER TABLE parties RENAME COLUMN city_name TO block_name;

-- Update location_scope values from 'city' to 'block'
UPDATE parties SET location_scope = 'block' WHERE location_scope = 'city';
