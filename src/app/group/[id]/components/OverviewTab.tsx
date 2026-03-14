'use client';

import { Check } from 'lucide-react';
import { type MemberWithVotes } from '@/types/database';

interface OverviewTabProps {
    partyId: string;
    optimisticIsMember: boolean;
    trustedMember: MemberWithVotes | null;
    votedFor: string | null;
    voteExpiresInDays: number | null;
    showVoteOptions: boolean;
    onToggleVoteOptions: () => void;
    candidateMembers: MemberWithVotes[];
    voteLoadingFor: string | null;
    onVoteChange: (toUserId: string) => void;
    onJoin: () => void;
    joinLoading: boolean;
    joinDisabled: boolean;
    onStatusMessage: (tone: 'success' | 'error' | 'info', text: string) => void;
    onRefresh: () => void;
}

export function OverviewTab({
    optimisticIsMember,
    trustedMember,
    votedFor,
    voteExpiresInDays,
    showVoteOptions,
    onToggleVoteOptions,
    candidateMembers,
    voteLoadingFor,
    onVoteChange,
    onJoin,
    joinLoading,
    joinDisabled,
}: OverviewTabProps) {
    return (
        <section
            id="party-section-overview"
            role="tabpanel"
            aria-labelledby="party-tab-overview"
            className="animate-fade-in space-y-10"
        >
            {/* Representation */}
            <div className="border-t border-border-primary/40 pt-8">
                <h2 className="text-xl font-semibold text-text-primary">Representation</h2>
                {!optimisticIsMember ? (
                    <div className="mt-4">
                        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
                            Members choose who speaks for this group. Trust expires automatically and can be changed anytime.
                        </p>
                        <button
                            type="button"
                            onClick={onJoin}
                            disabled={joinDisabled || joinLoading}
                            className="btn btn-primary mt-5"
                        >
                            {joinLoading ? 'Joining...' : 'Join to choose voice'}
                        </button>
                    </div>
                ) : (
                    <div className="mt-4">
                        <p className="text-sm text-text-secondary">
                            You trust: <strong>{trustedMember?.display_name || 'No one yet'}</strong>
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                            Expires in: {voteExpiresInDays === null ? 'Not set' : `${voteExpiresInDays} day${voteExpiresInDays === 1 ? '' : 's'}`}
                        </p>
                        <button
                            type="button"
                            onClick={onToggleVoteOptions}
                            className="btn btn-secondary mt-5"
                        >
                            {showVoteOptions ? 'Hide options' : 'Change vote'}
                        </button>

                        {showVoteOptions && (
                            <ul className="mt-4 space-y-2">
                                {candidateMembers.map((member) => (
                                    <li key={member.user_id} className="flex items-center justify-between gap-3 rounded-lg border border-border-primary bg-bg-card px-3 py-2 text-sm transition-colors hover:bg-bg-hover">
                                        <span className="text-text-primary">
                                            {member.display_name || 'Anonymous'}
                                            <span className="ml-2 text-text-muted">({member.trust_votes})</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onVoteChange(member.user_id)}
                                            disabled={voteLoadingFor !== null}
                                            className={`btn btn-sm ${member.user_id === votedFor ? 'btn-secondary' : 'btn-primary'}`}
                                        >
                                            {voteLoadingFor === member.user_id ? 'Saving...' : member.user_id === votedFor ? <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Current</span> : 'Trust'}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
