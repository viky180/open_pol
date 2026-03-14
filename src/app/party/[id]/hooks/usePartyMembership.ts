'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type MembershipStatusTone = 'success' | 'error' | 'info';

type AutoProvisionPayload = {
    created?: Array<{ scope: 'state' | 'district' | 'village'; party_id: string }>;
    reused?: Array<{ scope: 'state' | 'district' | 'village'; party_id: string }>;
    skipped?: Array<{ scope: 'state' | 'district' | 'village'; reason: string }>;
} | null;

const AUTO_PROVISION_NOTICE_STORAGE_KEY = 'openpolitics:auto-provision-notice';
const AUTO_PROVISION_SCOPE_LABEL: Record<'state' | 'district' | 'village', string> = {
    state: 'State',
    district: 'District',
    village: 'Village',
};

function buildLocalPathMessage(autoProvision: AutoProvisionPayload): string | null {
    if (!autoProvision) return null;

    const createdScopes = (autoProvision.created || []).map((item) => AUTO_PROVISION_SCOPE_LABEL[item.scope]);
    const reusedScopes = (autoProvision.reused || []).map((item) => AUTO_PROVISION_SCOPE_LABEL[item.scope]);

    if (createdScopes.length === 0 && reusedScopes.length === 0) {
        return null;
    }

    const createdText = createdScopes.length > 0 ? `Created: ${createdScopes.join(', ')}` : null;
    const reusedText = reusedScopes.length > 0 ? `Ready: ${reusedScopes.join(', ')}` : null;
    const detail = [createdText, reusedText].filter(Boolean).join(' · ');

    return `Your local path is ready. ${detail}`;
}

function persistAutoProvisionNotice(targetPartyId: string, autoProvision: AutoProvisionPayload) {
    if (typeof window === 'undefined' || !autoProvision) return;

    const created = autoProvision.created || [];
    const reused = autoProvision.reused || [];
    const skipped = autoProvision.skipped || [];

    if (created.length === 0 && reused.length === 0 && skipped.length === 0) return;

    const payload = {
        targetPartyId,
        created,
        reused,
        skipped,
        createdAt: Date.now(),
    };

    try {
        window.sessionStorage.setItem(AUTO_PROVISION_NOTICE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // best effort only
    }
}

interface UsePartyMembershipParams {
    partyId: string;
    currentUserId: string | null;
    isMember: boolean;
    /** Party ID of an existing membership at the same scope level (if any). */
    sameScopeConflictPartyId: string | null;
    memberSince: string | null;
    singleMembershipHint: string;
    onStatusMessage: (tone: MembershipStatusTone, text: string) => void;
    onJoinSuccess?: (autoProvision: AutoProvisionPayload) => void;
}

export function usePartyMembership({
    partyId,
    currentUserId,
    isMember,
    sameScopeConflictPartyId,
    memberSince,
    singleMembershipHint,
    onStatusMessage,
    onJoinSuccess,
}: UsePartyMembershipParams) {
    const supabase = createClient();
    const [joinLoading, setJoinLoading] = useState(false);
    const [optimisticIsMember, setOptimisticIsMember] = useState(isMember);
    const [optimisticSameScopeConflictPartyId, setOptimisticSameScopeConflictPartyId] = useState(sameScopeConflictPartyId);
    const [optimisticMemberSince, setOptimisticMemberSince] = useState(memberSince);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);

    useEffect(() => {
        setOptimisticIsMember(isMember);
        setOptimisticSameScopeConflictPartyId(sameScopeConflictPartyId);
        setOptimisticMemberSince(memberSince);
    }, [isMember, sameScopeConflictPartyId, memberSince, partyId]);

    // Blocked only when there is a SAME-SCOPE conflict — users can join one group per scope level independently.
    const hasMembershipElsewhere = !!optimisticSameScopeConflictPartyId;
    const joinDisabled = joinLoading || hasMembershipElsewhere;
    const joinButtonLabel = hasMembershipElsewhere ? 'One group only' : (joinLoading ? 'Joining...' : 'Join this group');

    const performJoin = async () => {
        const previousSameScopeConflict = optimisticSameScopeConflictPartyId;
        const previousMemberSince = optimisticMemberSince;

        setOptimisticIsMember(true);
        // After joining this group there is no longer a same-scope conflict for THIS group.
        setOptimisticSameScopeConflictPartyId(null);
        setOptimisticMemberSince(new Date().toISOString());

        setJoinLoading(true);
        try {
            const response = await fetch(`/api/parties/${partyId}/join`, { method: 'POST' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.error || 'Could not join this group');
            }

            const localPathMessage = buildLocalPathMessage(payload?.autoProvision || null);
            persistAutoProvisionNotice(partyId, payload?.autoProvision || null);
            if (localPathMessage && typeof window !== 'undefined') {
                window.sessionStorage.setItem('openpolitics:join-notice', localPathMessage);
            }

            if (localPathMessage) {
                onStatusMessage('success', localPathMessage);
            }

            onJoinSuccess?.(payload?.autoProvision ?? null);
        } catch (err) {
            console.error('Join error:', err);
            setOptimisticIsMember(isMember);
            setOptimisticSameScopeConflictPartyId(previousSameScopeConflict);
            setOptimisticMemberSince(previousMemberSince);
            onStatusMessage('error', err instanceof Error ? err.message : 'Could not join this group');
        } finally {
            setJoinLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!currentUserId) {
            setShowAuthModal(true);
            return;
        }

        if (hasMembershipElsewhere) {
            onStatusMessage('info', singleMembershipHint);
            return;
        }

        await performJoin();
    };

    const handleLeave = async () => {
        if (!currentUserId) return;

        const previousMemberSince = optimisticMemberSince;

        setOptimisticIsMember(false);
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
            setOptimisticIsMember(isMember);
            setOptimisticMemberSince(previousMemberSince);
            onStatusMessage('error', 'Could not leave this group. Please try again.');
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
