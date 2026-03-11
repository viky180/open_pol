-- Flat Level-Independent Leader Selection
-- =========================================
-- New model:
--   - Each geographic level competes independently.
--   - The group with the most members at a given (location_scope, category_id) wins.
--   - The trust-vote winner inside that winning group becomes the level's leader.
--   - parent_party_id is kept for display/browsing hierarchy only.
--   - group_affiliations no longer contribute to leader selection math.
--
-- Membership constraint (enforced in API, not DB):
--   A user may belong to at most ONE active group per location_scope level.
--   (village: one, district: one, state: one, etc.  independently)

-- ============================================
-- 1. Rewrite get_party_leader
-- ============================================
CREATE OR REPLACE FUNCTION public.get_party_leader(p_party_id UUID)
RETURNS UUID AS $$
DECLARE
    v_scope            TEXT;
    v_category_id      UUID;
    v_winning_party_id UUID;
BEGIN
    -- What level + issue category is this group?
    SELECT location_scope, category_id
    INTO v_scope, v_category_id
    FROM public.parties
    WHERE id = p_party_id;

    IF v_scope IS NULL THEN
        RETURN NULL;
    END IF;

    -- Among ALL groups at the same (level + category), pick the one with the most members.
    -- Tie-break: oldest group wins (created_at ASC).
    SELECT id INTO v_winning_party_id
    FROM public.parties
    WHERE location_scope = v_scope
      AND (
          (category_id = v_category_id)
          OR (category_id IS NULL AND v_category_id IS NULL)
      )
    ORDER BY member_count DESC, created_at ASC
    LIMIT 1;

    IF v_winning_party_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Leader = highest trust-vote recipient within the winning group
    RETURN (
        SELECT to_user_id
        FROM public.trust_votes
        WHERE party_id = v_winning_party_id
          AND expires_at > NOW()
        GROUP BY to_user_id
        ORDER BY COUNT(*) DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 2. Rewrite is_coalition_eligible_voter
--    A user is eligible to vote at a level if they are
--    an active member of ANY group at that same level+category.
-- ============================================
CREATE OR REPLACE FUNCTION public.is_coalition_eligible_voter(
    p_party_id UUID,
    p_user_id  UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_scope       TEXT;
    v_category_id UUID;
BEGIN
    SELECT location_scope, category_id
    INTO v_scope, v_category_id
    FROM public.parties
    WHERE id = p_party_id;

    IF v_scope IS NULL THEN
        RETURN FALSE;
    END IF;

    -- User is eligible if they have an active membership in any group
    -- at the same (scope + category), regardless of which specific group.
    RETURN EXISTS (
        SELECT 1
        FROM public.memberships m
        INNER JOIN public.parties p ON p.id = m.party_id
        WHERE m.user_id = p_user_id
          AND m.left_at IS NULL
          AND p.location_scope = v_scope
          AND (
              (p.category_id = v_category_id)
              OR (p.category_id IS NULL AND v_category_id IS NULL)
          )
    );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_party_leader(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_coalition_eligible_voter(UUID, UUID) TO anon, authenticated;
