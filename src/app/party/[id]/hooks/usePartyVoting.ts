'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type StatusTone = 'success' | 'error' | 'info';

interface UsePartyVotingProps {
    partyId: string;
    currentUserId: string | null;
    isMember: boolean;
    isEligibleVoter?: boolean;
    onStatusMessage: (tone: StatusTone, text: string) => void;
    onAuthRequired: () => void;
    onRefresh: () => void;
}

export function usePartyVoting({
    partyId,
    currentUserId,
    isMember,
    isEligibleVoter = false,
    onStatusMessage,
    onAuthRequired,
    onRefresh,
}: UsePartyVotingProps) {
    const supabase = createClient();
    const [showVoteOptions, setShowVoteOptions] = useState(false);
    const [voteLoadingFor, setVoteLoadingFor] = useState<string | null>(null);

    const handleVoteChange = async (toUserId: string) => {
        if (!currentUserId) {
            onAuthRequired();
            return;
        }
        if (!isMember && !isEligibleVoter) {
            onStatusMessage('info', 'Join a group in this hierarchy to choose a representative.');
            return;
        }

        setVoteLoadingFor(toUserId);
        try {
            await supabase
                .from('trust_votes')
                .delete()
                .eq('party_id', partyId)
                .eq('from_user_id', currentUserId);

            const { error: insertError } = await supabase
                .from('trust_votes')
                .insert({ party_id: partyId, from_user_id: currentUserId, to_user_id: toUserId });

            if (insertError) throw insertError;

            setShowVoteOptions(false);
            onStatusMessage('success', 'Your trust vote was updated.');
            onRefresh();
        } catch {
            onStatusMessage('error', 'Could not update your vote. Please try again.');
        } finally {
            setVoteLoadingFor(null);
        }
    };

    return {
        showVoteOptions,
        setShowVoteOptions,
        voteLoadingFor,
        handleVoteChange,
    };
}
