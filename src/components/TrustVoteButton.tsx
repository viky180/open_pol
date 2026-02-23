'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { MemberWithVotes } from '@/types/database';

interface TrustVoteButtonProps {
    partyId: string;
    memberId: string;
    memberName: string;
    currentUserId: string | null;
    hasVoted: boolean;
    votedFor: string | null;
    onVoteChange: () => void;
}

export function TrustVoteButton({
    partyId,
    memberId,
    memberName,
    currentUserId,
    hasVoted,
    votedFor,
    onVoteChange
}: TrustVoteButtonProps) {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const isVotedForThis = votedFor === memberId;
    const canVote = currentUserId && currentUserId !== memberId;

    const handleVote = async () => {
        if (!currentUserId || loading) return;
        setLoading(true);

        try {
            if (isVotedForThis) {
                // Withdraw vote
                await supabase
                    .from('trust_votes')
                    .delete()
                    .eq('party_id', partyId)
                    .eq('from_user_id', currentUserId);
            } else {
                // If already voted for someone else, first remove that vote
                if (hasVoted) {
                    await supabase
                        .from('trust_votes')
                        .delete()
                        .eq('party_id', partyId)
                        .eq('from_user_id', currentUserId);
                }

                // Give new vote
                await supabase
                    .from('trust_votes')
                    .insert({
                        party_id: partyId,
                        from_user_id: currentUserId,
                        to_user_id: memberId
                    });
            }

            onVoteChange();
        } catch (err) {
            console.error('Vote error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!canVote) return null;

    return (
        <button
            onClick={handleVote}
            disabled={loading}
            className={`btn btn-sm ${isVotedForThis ? 'btn-danger' : 'btn-success'} min-w-[100px]`}
            title={isVotedForThis ? 'Remove your choice' : `Choose ${memberName} to speak for you`}
        >
            {loading ? '...' : isVotedForThis ? '✋ Remove choice' : '🗳️ Choose'}
        </button>
    );
}

// Member list component
interface MemberListProps {
    members: MemberWithVotes[];
    partyId: string;
    currentUserId: string | null;
    votedFor: string | null;
    onVoteChange: () => void;
}

export function MemberList({
    members,
    partyId,
    currentUserId,
    votedFor,
    onVoteChange
}: MemberListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(25);

    const filteredMembers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return members;

        return members.filter(member =>
            (member.display_name || 'anonymous').toLowerCase().includes(query)
        );
    }, [members, searchQuery]);

    const sortedMembers = useMemo(() => {
        return [...filteredMembers].sort((a, b) => b.trust_votes - a.trust_votes);
    }, [filteredMembers]);

    const visibleMembers = useMemo(() => sortedMembers.slice(0, visibleCount), [sortedMembers, visibleCount]);
    const hasMoreMembers = visibleMembers.length < sortedMembers.length;

    return (
        <div className="flex flex-col gap-3">
            {members.length > 15 && (
                <div className="rounded-xl border border-border-primary bg-bg-tertiary p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="text-xs sm:text-sm text-text-muted">
                            Showing {visibleMembers.length} of {sortedMembers.length} member{sortedMembers.length !== 1 ? 's' : ''}
                        </div>
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(event) => {
                                setSearchQuery(event.target.value);
                                setVisibleCount(25);
                            }}
                            placeholder="Search members"
                            className="input sm:max-w-xs"
                            aria-label="Search members"
                        />
                    </div>
                </div>
            )}

            {visibleMembers.map((member) => (
                <div
                    key={member.user_id}
                    className={`card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 ${member.is_leader ? 'border-primary bg-primary/10' : ''} ${member.is_subgroup_leader ? 'border-primary/30' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`avatar avatar-sm ${member.is_leader ? 'leader-badge' : ''}`}>
                            {(member.display_name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                            <div className="font-medium text-sm">
                                {member.display_name || 'Anonymous'}
                                {member.is_leader && (
                                    <span className="ml-2 text-xs text-secondary">
                                        Representative
                                    </span>
                                )}
                                {member.is_subgroup_leader && (
                                    <span className="ml-2 text-xs text-primary font-medium">
                                        🏛️ Sub-group leader
                                    </span>
                                )}
                            </div>
                            {member.is_subgroup_leader && member.subgroup_name && (
                                <div className="text-xs text-text-muted">
                                    Leads: {member.subgroup_name}
                                </div>
                            )}
                            <div className="text-xs text-text-muted">
                                {member.trust_votes} trust{member.trust_votes !== 1 ? ' signals' : ' signal'}
                            </div>
                        </div>
                    </div>

                    <TrustVoteButton
                        partyId={partyId}
                        memberId={member.user_id}
                        memberName={member.display_name || 'member'}
                        currentUserId={currentUserId}
                        hasVoted={!!votedFor}
                        votedFor={votedFor}
                        onVoteChange={onVoteChange}
                    />
                </div>
            ))}

            {hasMoreMembers && (
                <button
                    type="button"
                    onClick={() => setVisibleCount(prev => prev + 25)}
                    className="btn btn-secondary self-center"
                >
                    Load 25 more members
                </button>
            )}

            {members.length === 0 && (
                <div className="empty-state">
                    <p>No members yet. Join this issue group to help establish representation.</p>
                </div>
            )}

            {members.length > 0 && sortedMembers.length === 0 && (
                <div className="empty-state">
                    <p>No members match your search.</p>
                </div>
            )}
        </div>
    );
}
