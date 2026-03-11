import { createClient } from '@/lib/supabase/server';
import { getOnboardingStatus } from '@/lib/onboarding';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const requestedNext = searchParams.get('next') ?? '/';

    const normalizeNextPath = (value: string): string => {
        if (!value.startsWith('/')) return '/';
        if (value.startsWith('//')) return '/';
        return value;
    };

    const next = normalizeNextPath(requestedNext);
    let redirectPath = next;

    if (code) {
        const supabase = await createClient();
        await supabase.auth.exchangeCodeForSession(code);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) {
            const onboardingStatus = await getOnboardingStatus({
                getProfile: async () => {
                    const { data } = await supabase
                        .from('profiles')
                        .select('display_name, pincode')
                        .eq('id', user.id)
                        .maybeSingle();
                    return data;
                },
                getActiveMembershipCount: async () => {
                    const { count } = await supabase
                        .from('memberships')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .is('left_at', null);
                    return count;
                },
            });
            const { data: profile } = await supabase
                .from('profiles')
                .select('created_at')
                .eq('id', user.id)
                .maybeSingle();

            const createdAt = profile?.created_at ? new Date(profile.created_at).getTime() : null;
            const isRecentlyCreatedAccount =
                createdAt !== null &&
                !Number.isNaN(createdAt) &&
                Date.now() - createdAt < 1000 * 60 * 15;

            const shouldSendToWelcome =
                isRecentlyCreatedAccount || (onboardingStatus.shouldCompleteOnboarding && next === '/');

            // Route new signups, and returning users with incomplete activation landing on home,
            // through the unified onboarding flow.
            if (shouldSendToWelcome) {
                const welcomeParams = new URLSearchParams();
                if (next && next !== '/welcome') {
                    welcomeParams.set('next', next);
                }
                redirectPath = welcomeParams.toString()
                    ? `/welcome?${welcomeParams.toString()}`
                    : '/welcome';
            }
        }
    }

    return NextResponse.redirect(new URL(redirectPath, origin));
}