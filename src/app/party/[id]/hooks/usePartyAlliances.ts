'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AllianceWithMembers, Party } from '@/types/database';

interface UsePartyAlliancesParams {
    party: Party;
    alliances: AllianceWithMembers[];
    otherParties: Party[];
    currentUserId: string | null;
}

export function usePartyAlliances({
    party,
    alliances,
    otherParties,
    currentUserId,
}: UsePartyAlliancesParams) {
    const router = useRouter();
    const [alliancePartyId, setAlliancePartyId] = useState('');
    const [allianceLoading, setAllianceLoading] = useState(false);
    const [allianceError, setAllianceError] = useState('');
    const [optimisticAlliances, setOptimisticAlliances] = useState(alliances);
    const [revokeLoadingId, setRevokeLoadingId] = useState<string | null>(null);
    const [revokeError, setRevokeError] = useState('');

    useEffect(() => {
        setOptimisticAlliances(alliances);
    }, [alliances, party.id]);

    const allianceCardLoading = allianceLoading || revokeLoadingId !== null;

    const handleCreateAlliance = async () => {
        if (!currentUserId) {
            const returnPath = `/party/${party.id}`;
            router.push(`/auth?returnTo=${encodeURIComponent(returnPath)}`);
            return;
        }

        if (!alliancePartyId) {
            setAllianceError('Select a group to support.');
            return;
        }

        setAllianceLoading(true);
        setAllianceError('');

        try {
            const selectedParty = otherParties.find(otherParty => otherParty.id === alliancePartyId);
            const optimisticAllianceId = `optimistic-${party.id}-${alliancePartyId}-${Date.now()}`;
            const optimisticEntry: AllianceWithMembers = {
                id: optimisticAllianceId,
                created_at: new Date().toISOString(),
                created_by: currentUserId,
                description: null,
                disbanded_at: null,
                name: '',
                members: [
                    {
                        id: `optimistic-member-self-${optimisticAllianceId}`,
                        alliance_id: optimisticAllianceId,
                        party_id: party.id,
                        joined_at: new Date().toISOString(),
                        left_at: null,
                        party,
                    },
                    {
                        id: `optimistic-member-other-${optimisticAllianceId}`,
                        alliance_id: optimisticAllianceId,
                        party_id: alliancePartyId,
                        joined_at: new Date().toISOString(),
                        left_at: null,
                        party: selectedParty || {
                            ...party,
                            id: alliancePartyId,
                            issue_text: 'Selected group',
                        },
                    },
                ],
            };

            setOptimisticAlliances(prev => [optimisticEntry, ...prev]);

            const response = await fetch('/api/alliances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    party_ids: [party.id, alliancePartyId],
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData?.error || 'Failed to create alliance');
            }

            setAlliancePartyId('');
        } catch (err) {
            console.error('Alliance creation error:', err);
            setOptimisticAlliances(alliances);
            setAllianceError(err instanceof Error ? err.message : 'Failed to create alliance');
        } finally {
            setAllianceLoading(false);
        }
    };

    const handleLeaveAlliance = async (allianceId: string) => {
        if (!currentUserId) {
            const returnPath = `/party/${party.id}`;
            router.push(`/auth?returnTo=${encodeURIComponent(returnPath)}`);
            return;
        }

        setRevokeLoadingId(allianceId);
        setRevokeError('');

        try {
            setOptimisticAlliances(prev => prev
                .map(alliance => {
                    if (alliance.id !== allianceId) return alliance;
                    const remainingMembers = alliance.members.filter(member => member.party_id !== party.id);
                    return {
                        ...alliance,
                        members: remainingMembers,
                    };
                })
                .filter(alliance => alliance.members.length >= 2));

            const response = await fetch('/api/alliances', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alliance_id: allianceId,
                    party_id: party.id,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData?.error || 'Failed to leave alliance');
            }
        } catch (err) {
            console.error('Alliance leave error:', err);
            setOptimisticAlliances(alliances);
            setRevokeError(err instanceof Error ? err.message : 'Failed to leave alliance');
        } finally {
            setRevokeLoadingId(null);
        }
    };

    return {
        alliancePartyId,
        setAlliancePartyId,
        allianceLoading,
        allianceError,
        optimisticAlliances,
        revokeLoadingId,
        revokeError,
        allianceCardLoading,
        handleCreateAlliance,
        handleLeaveAlliance,
    };
}

