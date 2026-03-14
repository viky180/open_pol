-- Standardize founding group names to: "Founding group <issue>"
-- for all scopes.

UPDATE public.parties AS p
SET issue_text = trim(concat_ws(' ', 'Founding group', i.issue_text))
FROM public.issues AS i
WHERE p.issue_id = i.id
  AND COALESCE(p.is_founding_group, FALSE) = TRUE;
