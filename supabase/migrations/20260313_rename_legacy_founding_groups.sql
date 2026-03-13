-- Rename legacy founding groups so their primary title reflects the issue branch.
-- "Founding group" remains a status/badge, not the visible group name.

UPDATE public.parties AS p
SET issue_text = CASE
    WHEN p.location_scope = 'national' THEN i.issue_text
    WHEN p.location_scope = 'state' THEN trim(concat_ws(' ', NULLIF(COALESCE(p.state_name, p.location_label), ''), i.issue_text))
    WHEN p.location_scope = 'district' THEN trim(concat_ws(' ', NULLIF(COALESCE(p.district_name, p.location_label), ''), i.issue_text))
    WHEN p.location_scope = 'block' THEN trim(concat_ws(' ', NULLIF(COALESCE(p.block_name, p.location_label), ''), i.issue_text))
    WHEN p.location_scope = 'panchayat' THEN trim(concat_ws(' ', NULLIF(COALESCE(p.panchayat_name, p.location_label), ''), i.issue_text))
    WHEN p.location_scope = 'village' THEN trim(concat_ws(' ', NULLIF(COALESCE(p.village_name, p.location_label), ''), i.issue_text))
    ELSE i.issue_text
END
FROM public.issues AS i
WHERE p.issue_id = i.id
  AND COALESCE(p.is_founding_group, FALSE) = TRUE
  AND lower(trim(p.issue_text)) = 'founding group';
