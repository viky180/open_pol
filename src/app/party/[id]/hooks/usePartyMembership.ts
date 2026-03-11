'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type MembershipStatusTone = 'success' | 'error' | 'info';
type JoinOptionRelation = 'current' | 'sibling' | 'child';

type AutoProvisionPayload = {
    created?: Array<{ scope: 'state' | 'district' | 'village'; party_id: string }>;
    reused?: Array<{ scope: 'state' | 'district' | 'village'; party_id: string }>;
    skipped?: Array<{ scope: 'state' | 'district' | 'village'; reason: string }>;
} | null;

const AUTO_PROVISION_NOTICE_STORAGE_KEY = 'openpolitics:auto-provision-notice';

function buildLocalPathMessage(autoProvision: AutoProvisionPayload): string | null {
    if (!autoProvision) return null;

    const createdScopes = (autoProvision.created || []).map((item) => item.scope);
    const reusedScopes = (autoProvision.reused || []).map((item) => item.scope);

    if (createdScopes.length === 0 && reusedScopes.length === 0) {
        return null;
    }

    const createdText = createdScopes.length > 0 ? `Created: ${createdScopes.join(', ')}` : null;
    const reusedText = reusedScopes.length > 0 ? `Ready: ${reusedScopes.join(', ')}` : null;
    const detail = [createdText, reusedText].filter(Boolean).join(' · ');

    return `Local leadership path is ready. ${detail}`;
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

export interface JoinGroupOption {
    id: string;
    issue_text: string;
    icon_svg?: string | null;
    icon_image_url?: string | null;
    memberCount: number;
    relation: JoinOptionRelation;
}

interface UsePartyMembershipParams {
    partyId: string;
    partyIssueText: string;
    partyIconSvg?: string | null;
    partyIconImageUrl?: string | null;
    partyMemberCount: number;
    currentUserId: string | null;
    isMember: boolean;
    activeMembershipPartyId: string | null;
    memberSince: string | null;
    siblingGroups: Array<{ id: string; issue_text: string; icon_svg?: string | null; icon_image_url?: string | null; memberCount: number }>;
    childGroups: Array<{ id: string; issue_text: string; icon_svg?: string | null; icon_image_url?: string | null; memberCount: number }>;
    singleMembershipHint: string;
    onStatusMessage: (tone: MembershipStatusTone, text: string) => void;
}

export function usePartyMembership({
    partyId,
    partyIssueText,
    partyIconSvg,
    partyIconImageUrl,
    partyMemberCount,
    currentUserId,
    isMember,
    activeMembershipPartyId,
    memberSince,
    siblingGroups,
    childGroups,
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
    const [showJoinSelectionModal, setShowJoinSelectionModal] = useState(false);

    useEffect(() => {
        setOptimisticIsMember(isMember);
        setOptimisticActiveMembershipPartyId(activeMembershipPartyId);
        setOptimisticMemberSince(memberSince);
    }, [isMember, activeMembershipPartyId, memberSince, partyId]);

    const hasMembershipElsewhere = !!optimisticActiveMembershipPartyId && optimisticActiveMembershipPartyId !== partyId;
    const joinDisabled = joinLoading || hasMembershipElsewhere;
    const joinButtonLabel = hasMembershipElsewhere ? 'One group only' : (joinLoading ? 'Joining...' : 'Join this issue group');

    const joinOptions = useMemo<JoinGroupOption[]>(() => {
        const optionsMap = new Map<string, JoinGroupOption>();

        optionsMap.set(partyId, {
            id: partyId,
            issue_text: partyIssueText,
            icon_svg: partyIconSvg || null,
            icon_image_url: partyIconImageUrl || null,
            memberCount: partyMemberCount,
            relation: 'current',
        });

        siblingGroups.forEach((sibling) => {
            if (!optionsMap.has(sibling.id)) {
                optionsMap.set(sibling.id, {
                    id: sibling.id,
                    issue_text: sibling.issue_text,
                    icon_svg: sibling.icon_svg || null,
                    icon_image_url: sibling.icon_image_url || null,
                    memberCount: sibling.memberCount,
                    relation: 'sibling',
                });
            }
        });

        childGroups.forEach((child) => {
            if (!optionsMap.has(child.id)) {
                optionsMap.set(child.id, {
                    id: child.id,
                    issue_text: child.issue_text,
                    icon_svg: child.icon_svg || null,
                    icon_image_url: child.icon_image_url || null,
                    memberCount: child.memberCount,
                    relation: 'child',
                });
            }
        });

        return Array.from(optionsMap.values());
    }, [partyId, partyIssueText, partyIconSvg, partyIconImageUrl, partyMemberCount, siblingGroups, childGroups]);

    const shouldPromptJoinChoice = !optimisticIsMember && (siblingGroups.length > 0 || childGroups.length > 0);

    const performJoin = async (targetPartyId: string) => {
        const isJoiningCurrentParty = targetPartyId === partyId;
        const selectedOption = joinOptions.find((option) => option.id === targetPartyId) || null;

        const previousMembershipState = {
            isMember: optimisticIsMember,
            activeMembershipPartyId: optimisticActiveMembershipPartyId,
            memberSince: optimisticMemberSince,
        };

        if (isJoiningCurrentParty) {
            setOptimisticIsMember(true);
            setOptimisticActiveMembershipPartyId(partyId);
            setOptimisticMemberSince(new Date().toISOString());
        }

        setJoinLoading(true);
        try {
            const response = await fetch(`/api/parties/${targetPartyId}/join`, { method: 'POST' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.error || 'Unable to join party');
            }

            const localPathMessage = buildLocalPathMessage(payload?.autoProvision || null);
            persistAutoProvisionNotice(targetPartyId, payload?.autoProvision || null);
            if (localPathMessage && typeof window !== 'undefined') {
                window.sessionStorage.setItem('openpolitics:join-notice', localPathMessage);
            }

            if (!isJoiningCurrentParty) {
                const selectedName = selectedOption?.issue_text || 'selected chapter';
                onStatusMessage('success', `Joined ${selectedName}. Redirecting...`);
                window.location.href = `/party/${targetPartyId}`;
            } else if (localPathMessage) {
                onStatusMessage('success', localPathMessage);
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

    const handleJoin = async () => {
        if (!currentUserId) {
            setShowAuthModal(true);
            return;
        }

        if (hasMembershipElsewhere) {
            onStatusMessage('info', singleMembershipHint);
            return;
        }

        if (shouldPromptJoinChoice) {
            setShowJoinSelectionModal(true);
            return;
        }

        await performJoin(partyId);
    };

    const handleJoinSelection = async (targetPartyId: string) => {
        if (joinLoading) return;
        setShowJoinSelectionModal(false);
        await performJoin(targetPartyId);
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
        showJoinSelectionModal,
        setShowJoinSelectionModal,
        joinOptions,
        handleJoin,
        handleJoinSelection,
        handleLeave,
    };
}
