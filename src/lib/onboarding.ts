export type OnboardingNextStep = 'profile' | 'group' | 'complete';

export type OnboardingStatus = {
    hasDisplayName: boolean;
    hasPincode: boolean;
    hasActiveMembership: boolean;
    progressCount: number;
    totalSteps: number;
    shouldCompleteOnboarding: boolean;
    nextStep: OnboardingNextStep;
};

type OnboardingDataLoader = {
    getProfile: () => Promise<{ display_name: string | null; pincode: string | null } | null>;
    getActiveMembershipCount: () => Promise<number | null>;
};

export async function getOnboardingStatus(
    loader: OnboardingDataLoader,
): Promise<OnboardingStatus> {
    const [profile, activeMembershipCount] = await Promise.all([
        loader.getProfile(),
        loader.getActiveMembershipCount(),
    ]);

    const hasDisplayName = Boolean(profile?.display_name?.trim());
    const hasPincode = Boolean(profile?.pincode);
    const hasActiveMembership = (activeMembershipCount ?? 0) > 0;
    const totalSteps = 2;
    const progressCount = Number(hasDisplayName) + Number(hasActiveMembership);

    return {
        hasDisplayName,
        hasPincode,
        hasActiveMembership,
        progressCount,
        totalSteps,
        shouldCompleteOnboarding: !hasActiveMembership,
        nextStep: !hasDisplayName ? 'profile' : !hasActiveMembership ? 'group' : 'complete',
    };
}