-- Fix leader election: group competing parties by issue_id, not category_id
-- -------------------------------------------------------------------------
-- The flat level leader election was grouping parties at the same
-- (location_scope, category_id). Since the Issue hierarchy was introduced,
-- the correct grouping key is issue_id — the top-level Issue entity that
-- all groups in a hierarchy share. category_id is a broader taxonomy tag
-- and is incorrect for this purpose.

-- ============================================
-- 1. Rewrite get_party_leader
-- ============================================
CREATE OR REPLACE FUNCTION public.get_party_leader(p_party_id UUID)
RETURNS UUID AS $$
DECLARE
    v_scope        TEXT;
    v_issue_id     UUID;
    v_winning_id   UUID;
    v_trust_leader UUID;
BEGIN
    -- Resolve this group's level + issue
    SELECT location_scope, issue_id
    INTO v_scope, v_issue_id
    FROM public.parties
    WHERE id = p_party_id;

    IF v_scope IS NULL THEN
        RETURN NULL;
    END IF;

    -- Find the winning group at the same (scope + issue).
    -- Groups with no issue_id only compete against other no-issue groups.
    -- Tie-break: oldest group wins (created_at ASC).
    SELECT id INTO v_winning_id
    FROM public.parties
    WHERE location_scope = v_scope
      AND (
          (issue_id = v_issue_id)
          OR (issue_id IS NULL AND v_issue_id IS NULL)
      )
    ORDER BY member_count DESC, created_at ASC
    LIMIT 1;

    IF v_winning_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Primary: trust-vote winner inside the winning group
    SELECT to_user_id INTO v_trust_leader
    FROM public.trust_votes
    WHERE party_id = v_winning_id
      AND expires_at > NOW()
    GROUP BY to_user_id
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    IF v_trust_leader IS NOT NULL THEN
        RETURN v_trust_leader;
    END IF;

    -- Fallback: provisional founder-leader (earliest active member)
    RETURN (
        SELECT m.user_id
        FROM public.memberships m
        WHERE m.party_id = v_winning_id
          AND m.left_at IS NULL
        ORDER BY m.joined_at ASC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 2. Rewrite is_coalition_eligible_voter
--    A user is eligible to vote at a level if they are
--    an active member of ANY group at the same (scope + issue).
-- ============================================
CREATE OR REPLACE FUNCTION public.is_coalition_eligible_voter(
    p_party_id UUID,
    p_user_id  UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_scope    TEXT;
    v_issue_id UUID;
BEGIN
    SELECT location_scope, issue_id
    INTO v_scope, v_issue_id
    FROM public.parties
    WHERE id = p_party_id;

    IF v_scope IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.memberships m
        INNER JOIN public.parties p ON p.id = m.party_id
        WHERE m.user_id = p_user_id
          AND m.left_at IS NULL
          AND p.location_scope = v_scope
          AND (
              (p.issue_id = v_issue_id)
              OR (p.issue_id IS NULL AND v_issue_id IS NULL)
          )
    );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_party_leader(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_coalition_eligible_voter(UUID, UUID) TO anon, authenticated;
