-- Enforce single active party membership per user
-- Allows historical memberships via left_at

CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_user_active
    ON public.memberships(user_id)
    WHERE left_at IS NULL;