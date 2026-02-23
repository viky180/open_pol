-- Harden invitations update security.
-- 1) Replace permissive update policy.
-- 2) Add trigger guard to allow only acceptance updates.
--
-- NOTE:
-- This migration is guarded so it can be run safely even if the
-- invitations table has not been created yet.

DO $$
BEGIN
  IF to_regclass('public.invitations') IS NULL THEN
    RAISE NOTICE 'Skipping invitations hardening: table public.invitations does not exist yet.';
    RETURN;
  END IF;

  -- Replace permissive policy:
  --   USING (auth.uid() IS NOT NULL)
  EXECUTE 'DROP POLICY IF EXISTS "Invitations can be updated for acceptance" ON public.invitations';

  EXECUTE '
    CREATE POLICY "Users can accept invitations once"
    ON public.invitations
    FOR UPDATE
    TO authenticated
    USING (
      accepted_by IS NULL
      AND auth.uid() IS NOT NULL
      AND inviter_id <> auth.uid()
    )
    WITH CHECK (
      accepted_by = auth.uid()
      AND accepted_at IS NOT NULL
      AND inviter_id <> auth.uid()
    )
  ';

  EXECUTE '
    CREATE OR REPLACE FUNCTION public.enforce_invitation_acceptance_update()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      -- Only acceptance fields are mutable during UPDATE.
      IF NEW.party_id IS DISTINCT FROM OLD.party_id
         OR NEW.inviter_id IS DISTINCT FROM OLD.inviter_id
         OR NEW.invite_code IS DISTINCT FROM OLD.invite_code
         OR NEW.created_at IS DISTINCT FROM OLD.created_at
         OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
      THEN
        RAISE EXCEPTION ''Only invitation acceptance fields can be updated'';
      END IF;

      -- Single-use acceptance semantics.
      IF OLD.accepted_by IS NOT NULL THEN
        RAISE EXCEPTION ''Invitation is already accepted'';
      END IF;

      IF NEW.accepted_by IS NULL OR NEW.accepted_at IS NULL THEN
        RAISE EXCEPTION ''accepted_by and accepted_at are required'';
      END IF;

      RETURN NEW;
    END;
    $fn$
  ';

  EXECUTE 'DROP TRIGGER IF EXISTS trg_enforce_invitation_acceptance_update ON public.invitations';

  EXECUTE '
    CREATE TRIGGER trg_enforce_invitation_acceptance_update
    BEFORE UPDATE ON public.invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_invitation_acceptance_update()
  ';
END;
$$;
