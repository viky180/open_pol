-- Normalize any remaining legacy placeholder names ("Founding group")
-- to the canonical format: "Founding group <issue_text>".
--
-- This removes the need for runtime name patching in discover/page code.
-- Rows that still have the bare placeholder are effectively founding groups.

UPDATE public.parties AS p
SET
    issue_text = trim(concat_ws(' ', 'Founding group', i.issue_text)),
    is_founding_group = TRUE
FROM public.issues AS i
WHERE p.issue_id = i.id
  AND lower(trim(coalesce(p.issue_text, ''))) = 'founding group';
