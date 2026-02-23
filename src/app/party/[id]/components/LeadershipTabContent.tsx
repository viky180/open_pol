'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MemberWithVotes, QuestionWithAnswers } from '@/types/database';
import { MemberList } from '@/components/TrustVoteButton';
import { LeaderSection } from '@/components/LeaderSection';
import { SectionHeader, JoinToParticipateCard, EmptyState, type PrimaryAction } from './PartyDetailShared';

interface LeadershipTabContentProps {
    partyId: string;
    isMember: boolean;
    isSubgroupMember: boolean;
    leader: MemberWithVotes | null;
    currentUserId: string | null;
    votedFor: string | null;
    voteExpiresAt: string | null;
    trustedLeaderName: string | null;
    members: MemberWithVotes[];
    subgroupLeaderSupports: Array<{
        partyId: string;
        partyIssueText: string;
        leaderUserId: string;
        leaderName: string | null;
        trustVotes: number;
    }>;
    latestAnsweredQuestion: QuestionWithAnswers | null;
    primaryAction: PrimaryAction;
    onRefresh: () => void;
    ariaLabelledBy?: string;
}

export function LeadershipTabContent({
    partyId,
    isMember,
    isSubgroupMember,
    leader,
    currentUserId,
    votedFor,
    voteExpiresAt,
    trustedLeaderName,
    members,
    subgroupLeaderSupports,
    latestAnsweredQuestion,
    primaryAction,
    onRefresh,
    ariaLabelledBy = 'party-tab-leadership',
}: LeadershipTabContentProps) {
    const [showMemberList, setShowMemberList] = useState(false);

    return (
        <section
            id="party-section-leadership"
            role="tabpanel"
            className="space-y-6 party-section-anchor"
            aria-labelledby={ariaLabelledBy}
        >
            <SectionHeader
                icon="L"
                title="Choose your representative"
                description="Your vote determines who speaks for this group. Trust expires automatically and can be updated anytime."
                gradientClassName="bg-bg-secondary"
                glowClassName="hidden"
            />

            <LeaderSection leader={leader} latestStatement={latestAnsweredQuestion} />

            {subgroupLeaderSupports.length > 0 && (
                <div className="brand-panel p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-text-muted mb-2">Sub-group leader candidates</div>
                    <p className="text-sm text-text-secondary mb-3">
                        These sub-group leaders are eligible candidates for this group&apos;s leadership vote.
                    </p>
                    <div className="space-y-2">
                        {subgroupLeaderSupports.map((support) => (
                            <div
                                key={`${support.partyId}-${support.leaderUserId}`}
                                className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
                            >
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-text-primary truncate">{support.leaderName || 'Anonymous'}</div>
                                    <div className="text-xs text-text-muted truncate">
                                        Leads{' '}
                                        <Link href={`/party/${support.partyId}`} className="text-primary hover:underline">
                                            {support.partyIssueText}
                                        </Link>
                                    </div>
                                </div>
                                <div className="text-xs text-primary font-medium whitespace-nowrap">Nominated ✓</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(isMember || isSubgroupMember) ? (
                <div className="space-y-6">
                    {!isMember && isSubgroupMember && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
                            <div>
                                <div className="font-medium text-text-primary">Voting from your sub-group</div>
                                <div className="text-sm text-text-muted">
                                    As a sub-group member, you can vote for this group&apos;s leadership.
                                </div>
                            </div>
                        </div>
                    )}

                    {votedFor && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                            <div>
                                <div className="font-medium text-text-primary">Your trust is with {trustedLeaderName || 'someone'}</div>
                                {voteExpiresAt && (
                                    <div className="text-sm text-text-muted">
                                        Expires {new Date(voteExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="brand-panel p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <p className="text-sm text-text-secondary">View all members to choose or update your trust vote.</p>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setShowMemberList((prev) => !prev)}
                                aria-expanded={showMemberList}
                                aria-controls="leadership-member-list"
                            >
                                {showMemberList ? 'Hide members' : `Show members and vote (${members.length})`}
                            </button>
                        </div>
                    </div>

                    {showMemberList && (
                        <div id="leadership-member-list">
                            {members.length > 0 ? (
                                <MemberList
                                    members={members}
                                    partyId={partyId}
                                    currentUserId={currentUserId}
                                    votedFor={votedFor}
                                    onVoteChange={onRefresh}
                                />
                            ) : (
                                <EmptyState
                                    icon="M"
                                    title="No members yet"
                                    description="Be the first to join and lead this group!"
                                />
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <JoinToParticipateCard
                    icon="L"
                    title="Join to participate in leadership"
                    description="Join to shape leadership, steer direction, and add your weight to this coalition."
                    actionLabel={primaryAction.label}
                    actionDisabled={primaryAction.disabled}
                    onAction={primaryAction.onClick}
                />
            )}
        </section>
    );
}

