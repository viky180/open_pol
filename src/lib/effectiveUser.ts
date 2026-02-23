import type { User } from '@supabase/supabase-js';
import { isAdminUserId } from '@/lib/admin';

export const ADMIN_IMPERSONATION_COOKIE = 'op_admin_acting_as';

type SupabaseWithAuth = {
    auth: {
        getUser: () => Promise<{ data: { user: User | null } }>;
    };
};

export type EffectiveUserContext = {
    realUser: User;
    effectiveUserId: string;
    isAdmin: boolean;
    isImpersonating: boolean;
    impersonatedUserId: string | null;
};

export function getImpersonationCookieFromRequestLike(request: {
    cookies: { get: (name: string) => { value: string } | undefined };
}) {
    return request.cookies.get(ADMIN_IMPERSONATION_COOKIE)?.value;
}

export function getCookieValueFromRequestLike(
    request: { cookies: { get: (name: string) => { value: string } | undefined } },
    name: string
) {
    return request.cookies.get(name)?.value;
}

export async function getEffectiveUserContext(
    supabase: SupabaseWithAuth,
    getCookie: (name: string) => string | undefined
): Promise<EffectiveUserContext | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const isAdmin = isAdminUserId(user.id);
    const impersonatedUserId = isAdmin ? (getCookie(ADMIN_IMPERSONATION_COOKIE) || null) : null;
    const isImpersonating = Boolean(impersonatedUserId && impersonatedUserId !== user.id);

    return {
        realUser: user,
        effectiveUserId: impersonatedUserId || user.id,
        isAdmin,
        isImpersonating,
        impersonatedUserId,
    };
}
