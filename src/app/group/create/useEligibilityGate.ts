import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseEligibilityGateOptions {
    parentPartyId: string;
    isAdmin: boolean;
}

interface UseEligibilityGateReturn {
    isLoggedIn: boolean | null;
    activeMembershipPartyId: string | null;
    isLeavingCurrentGroup: boolean;
    eligibilityLoading: boolean;
    canCreateChildWithoutJoining: boolean;
    hasBlockingMembership: boolean;
    handleLeaveCurrentGroup: () => Promise<void>;
    leaveError: string | null;
    clearLeaveError: () => void;
}

export function useEligibilityGate({
    parentPartyId,
    isAdmin,
}: UseEligibilityGateOptions): UseEligibilityGateReturn {
    const supabase = createClient();

    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [activeMembershipPartyId, setActiveMembershipPartyId] = useState<string | null>(null);
    const [isLeavingCurrentGroup, setIsLeavingCurrentGroup] = useState(false);
    const [eligibilityLoading, setEligibilityLoading] = useState(true);
    const [leaveError, setLeaveError] = useState<string | null>(null);

    useEffect(() => {
        const loadEligibility = async () => {
            setEligibilityLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setIsLoggedIn(false);
                    setActiveMembershipPartyId(null);
                    return;
                }

                setIsLoggedIn(true);

                const { data: activeMembership } = await supabase
                    .from('memberships')
                    .select('party_id')
                    .eq('user_id', user.id)
                    .is('left_at', null)
                    .maybeSingle();

                setActiveMembershipPartyId(activeMembership?.party_id || null);
            } catch {
                setIsLoggedIn(false);
                setActiveMembershipPartyId(null);
            } finally {
                setEligibilityLoading(false);
            }
        };

        loadEligibility();
    }, [supabase]);

    const canCreateChildWithoutJoining =
        !!parentPartyId &&
        (isAdmin || (!!activeMembershipPartyId && activeMembershipPartyId === parentPartyId));

    // Only block if creating a STANDALONE group while already in a different group.
    // Child group creation (parentPartyId set) never blocks — it simply skips auto-join.
    const hasBlockingMembership = !parentPartyId && !!activeMembershipPartyId;

    const handleLeaveCurrentGroup = async () => {
        if (!activeMembershipPartyId || isLeavingCurrentGroup) return;

        setIsLeavingCurrentGroup(true);
        setLeaveError(null);

        try {
            const response = await fetch(`/api/parties/${activeMembershipPartyId}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedback: null }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.error || 'Unable to leave your current group');
            }

            setActiveMembershipPartyId(null);
        } catch (err) {
            setLeaveError(err instanceof Error ? err.message : 'Unable to leave your current group');
        } finally {
            setIsLeavingCurrentGroup(false);
        }
    };

    const clearLeaveError = () => setLeaveError(null);

    return {
        isLoggedIn,
        activeMembershipPartyId,
        isLeavingCurrentGroup,
        eligibilityLoading,
        canCreateChildWithoutJoining,
        hasBlockingMembership,
        handleLeaveCurrentGroup,
        leaveError,
        clearLeaveError,
    };
}
