-- Founding national groups for each issue
-- --------------------------------------
-- Adds a neutral founding national group for every issue that does not yet
-- have a top-level national group. These groups start without a leader.

ALTER TABLE public.parties
    ADD COLUMN IF NOT EXISTS is_founding_group BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO public.parties (
    issue_text,
    pincodes,
    category_id,
    created_by,
    issue_id,
    node_type,
    location_scope,
    location_label,
    is_founding_group
)
SELECT
    'Founding group',
    '{}',
    i.category_id,
    i.created_by,
    i.id,
    'community',
    'national',
    'India',
    TRUE
FROM public.issues i
WHERE NOT EXISTS (
    SELECT 1
    FROM public.parties p
    WHERE p.issue_id = i.id
      AND p.location_scope = 'national'
      AND p.parent_party_id IS NULL
);

CREATE OR REPLACE FUNCTION public.enforce_founding_group_trust_vote_threshold()
RETURNS TRIGGER AS $$
DECLARE
    v_is_founding BOOLEAN;
    v_scope TEXT;
    v_member_count INTEGER;
BEGIN
    SELECT COALESCE(is_founding_group, FALSE), location_scope, member_count
    INTO v_is_founding, v_scope, v_member_count
    FROM public.parties
    WHERE id = NEW.party_id;

    IF v_scope = 'national' AND v_is_founding AND COALESCE(v_member_count, 0) < 50 THEN
        RAISE EXCEPTION 'Leadership election for the founding group opens after 50 members join.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_founding_group_trust_vote_threshold ON public.trust_votes;

CREATE TRIGGER trg_enforce_founding_group_trust_vote_threshold
    BEFORE INSERT ON public.trust_votes
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_founding_group_trust_vote_threshold();

CREATE OR REPLACE FUNCTION public.get_party_leader(p_party_id UUID)
RETURNS UUID AS $$
DECLARE
    v_scope                TEXT;
    v_issue_id             UUID;
    v_winning_id           UUID;
    v_trust_leader         UUID;
    v_winning_member_count INTEGER;
    v_winning_is_founding  BOOLEAN;
BEGIN
    SELECT location_scope, issue_id
    INTO v_scope, v_issue_id
    FROM public.parties
    WHERE id = p_party_id;

    IF v_scope IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT id, member_count, COALESCE(is_founding_group, FALSE)
    INTO v_winning_id, v_winning_member_count, v_winning_is_founding
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

    SELECT to_user_id INTO v_trust_leader
    FROM public.trust_votes
    WHERE party_id = v_winning_id
      AND expires_at > NOW()
    GROUP BY to_user_id
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    IF v_scope = 'national' AND v_winning_is_founding THEN
        IF COALESCE(v_winning_member_count, 0) < 50 THEN
            RETURN NULL;
        END IF;

        RETURN v_trust_leader;
    END IF;

    IF v_trust_leader IS NOT NULL THEN
        RETURN v_trust_leader;
    END IF;

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

GRANT EXECUTE ON FUNCTION public.get_party_leader(UUID) TO anon, authenticated;