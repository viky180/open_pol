-- Ensure parties_with_member_counts view exists for API pagination
CREATE OR REPLACE VIEW parties_with_member_counts AS
SELECT
    p.*,
    COUNT(m.id) FILTER (WHERE m.left_at IS NULL)::INTEGER AS member_count,
    CASE
        WHEN COUNT(m.id) FILTER (WHERE m.left_at IS NULL) <= 10 THEN 1
        WHEN COUNT(m.id) FILTER (WHERE m.left_at IS NULL) <= 100 THEN 2
        WHEN COUNT(m.id) FILTER (WHERE m.left_at IS NULL) <= 1000 THEN 3
        ELSE 4
    END AS level
FROM parties p
LEFT JOIN memberships m ON m.party_id = p.id
GROUP BY p.id;

GRANT SELECT ON parties_with_member_counts TO anon, authenticated;