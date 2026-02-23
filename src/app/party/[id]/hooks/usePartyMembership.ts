'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type MembershipStatusTone = 'success' | 'error' | 'info';

interface UsePartyMembershipParams {
    partyId: string;
    currentUserId: string | null;
    isMember: boolean;
    activeMembershipPartyId: string | null;
    memberSince: string | null;
    singleMembershipHint: string;
    onStatusMessage: (tone: MembershipStatusTone, text: string) => void;
}

export function usePartyMembership({
    partyId,
    currentUserId,
    isMember,
    activeMembershipPartyId,
    memberSince,
    singleMembershipHint,
    onStatusMessage,
}: UsePartyMembershipParams) {
    const supabase = createClient();
    const [joinLoading, setJoinLoading] = useState(false);
    const [optimisticIsMember, setOptimisticIsMember] = useState(isMember);
    const [optimisticActiveMembershipPartyId, setOptimisticActiveMembershipPartyId] = useState(activeMembershipPartyId);
    const [optimisticMemberSince, setOptimisticMemberSince] = useState(memberSince);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);

    useEffect(() => {
        setOptimisticIsMember(isMember);
        setOptimisticActiveMembershipPartyId(activeMembershipPartyId);
        setOptimisticMemberSince(memberSince);
    }, [isMember, activeMembershipPartyId, memberSince, partyId]);

    const hasMembershipElsewhere = !!optimisticActiveMembershipPartyId && optimisticActiveMembershipPartyId !== partyId;
    const joinDisabled = joinLoading || hasMembershipElsewhere;
    const joinButtonLabel = hasMembershipElsewhere ? 'One group only' : (joinLoading ? 'Joining...' : 'Join this issue group');

    const handleJoin = async () => {
        if (!currentUserId) {
            setShowAuthModal(true);
            return;
        }

        if (hasMembershipElsewhere) {
            onStatusMessage('info', singleMembershipHint);
            return;
        }

        const previousMembershipState = {
            isMember: optimisticIsMember,
            activeMembershipPartyId: optimisticActiveMembershipPartyId,
            memberSince: optimisticMemberSince,
        };

        setOptimisticIsMember(true);
        setOptimisticActiveMembershipPartyId(partyId);
        setOptimisticMemberSince(new Date().toISOString());
        setJoinLoading(true);
        try {
            const response = await fetch(`/api/parties/${partyId}/join`, { method: 'POST' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData?.error || 'Unable to join party');
            }
        } catch (err) {
            console.error('Join error:', err);
            setOptimisticIsMember(previousMembershipState.isMember);
            setOptimisticActiveMembershipPartyId(previousMembershipState.activeMembershipPartyId);
            setOptimisticMemberSince(previousMembershipState.memberSince);
            onStatusMessage('error', err instanceof Error ? err.message : 'Unable to join party');
        } finally {
            setJoinLoading(false);
        }
    };

    const handleLeave = async () => {
        if (!currentUserId) return;

        const previousMembershipState = {
            isMember: optimisticIsMember,
            activeMembershipPartyId: optimisticActiveMembershipPartyId,
            memberSince: optimisticMemberSince,
        };

        setOptimisticIsMember(false);
        setOptimisticActiveMembershipPartyId(null);
        setOptimisticMemberSince(null);
        setJoinLoading(true);
        try {
            await supabase
                .from('memberships')
                .update({
                    left_at: new Date().toISOString(),
                    leave_feedback: null,
                })
                .eq('party_id', partyId)
                .eq('user_id', currentUserId)
                .is('left_at', null);

            await supabase
                .from('trust_votes')
                .delete()
                .eq('party_id', partyId)
                .eq('from_user_id', currentUserId);

            setShowLeaveModal(false);
        } catch (err) {
            console.error('Leave error:', err);
            setOptimisticIsMember(previousMembershipState.isMember);
            setOptimisticActiveMembershipPartyId(previousMembershipState.activeMembershipPartyId);
            setOptimisticMemberSince(previousMembershipState.memberSince);
            onStatusMessage('error', 'Could not leave the group. Please try again.');
        } finally {
            setJoinLoading(false);
        }
    };

    return {
        joinLoading,
        optimisticIsMember,
        optimisticMemberSince,
        hasMembershipElsewhere,
        joinDisabled,
        joinButtonLabel,
        showAuthModal,
        setShowAuthModal,
        showLeaveModal,
        setShowLeaveModal,
        handleJoin,
        handleLeave,
    };
}

