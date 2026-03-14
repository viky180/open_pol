'use client';

import { useEffect, useMemo } from 'react';
import type { MemberWithVotes, Party, QAMetrics, QuestionWithAnswers } from '@/types/database';
import {
    loadProgressiveDisclosureState,
    saveProgressiveDisclosureState,
    updateDisclosureEvent,
} from '@/lib/progressiveDisclosure';
import type { PrimaryAction } from '../components/PartyDetailShared';

export type PartySectionNavId = 'overview' | 'participate' | 'structure';

interface UsePartyDetailViewModelParams {
    activeSection: PartySectionNavId;
    party: Party;
    memberCount: number;
    directMemberCount: number;
    members: MemberWithVotes[];
    questions: QuestionWithAnswers[];
    qaMetrics: QAMetrics;
    currentParentParty: Party | null;

    currentUserId: string | null;
    isMember: boolean;
    optimisticIsMember: boolean;
    votedFor: string | null;
    voteExpiresAt: string | null;
    isLeader: boolean;
    joinLoading: boolean;
    joinDisabled: boolean;
    joinButtonLabel: string;
    onJoin: () => void;
    onLeaveIntent: () => void;
}

function formatCompactDate(value: string | null) {
    if (!value) return null;
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function usePartyDetailViewModel({
    activeSection,
    party,
    memberCount,
    directMemberCount,
    members,
    questions,
    qaMetrics,
    currentParentParty,

    currentUserId,
    isMember,
    optimisticIsMember,
    votedFor,
    voteExpiresAt,
    isLeader,
    joinLoading,
    joinDisabled,
    joinButtonLabel,
    onJoin,
    onLeaveIntent,
}: UsePartyDetailViewModelParams) {
    const leader = members.find(m => m.is_leader) || null;

    const votedForMember = votedFor ? members.find(m => m.user_id === votedFor) : null;
    const trustedLeaderName = votedForMember?.display_name || null;

    const latestAnsweredQuestion = questions.find(q =>
        q.answers?.some(a => a.answered_by === leader?.user_id)
    ) || null;

    const hasTrustVote = !!votedFor;
    const hasAskedOrAnswered = useMemo(() => {
        if (!currentUserId) return false;
        return questions.some(q => {
            const askedByMe = q.asked_by === currentUserId;
            const answeredByMe = (q.answers || []).some(a => a.answered_by === currentUserId);
            return askedByMe || answeredByMe;
        });
    }, [questions, currentUserId]);

    useEffect(() => {
        const disclosure = loadProgressiveDisclosureState();
        const shouldMarkJoined = isMember && !disclosure.events.joinedAnyParty;
        const shouldMarkVoted = hasTrustVote && !disclosure.events.votedTrust;
        const shouldMarkQa = hasAskedOrAnswered && !disclosure.events.askedOrAnswered;
        if (!shouldMarkJoined && !shouldMarkVoted && !shouldMarkQa) return;

        let next = disclosure;
        if (shouldMarkJoined) next = updateDisclosureEvent(next, 'joinedAnyParty');
        if (shouldMarkVoted) next = updateDisclosureEvent(next, 'votedTrust');
        if (shouldMarkQa) next = updateDisclosureEvent(next, 'askedOrAnswered');

        const changed =
            next.stage !== disclosure.stage
            || next.dismissedHints !== disclosure.dismissedHints
            || next.events.joinedAnyParty !== disclosure.events.joinedAnyParty
            || next.events.votedTrust !== disclosure.events.votedTrust
            || next.events.askedOrAnswered !== disclosure.events.askedOrAnswered;
        if (changed) {
            saveProgressiveDisclosureState(next);
        }
    }, [isMember, hasTrustVote, hasAskedOrAnswered]);

    const lastActiveLabel = useMemo(() => {
        if (!party.updated_at) return 'Active recently';
        const updated = new Date(party.updated_at);
        return `Active ${updated.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
        })}`;
    }, [party.updated_at]);

    const totalBackers = memberCount;
    const supporterGroupMemberCount = Math.max(memberCount - directMemberCount, 0);
    const answeredQuestions = Math.max(qaMetrics.total_questions - qaMetrics.unanswered_questions, 0);
    const responseRate = qaMetrics.total_questions > 0
        ? Math.round((answeredQuestions / qaMetrics.total_questions) * 100)
        : 0;

    const sectionSummary = useMemo(() => {
        if (activeSection === 'overview') {
            return {
                title: optimisticIsMember ? 'Start with one action today' : 'Join to participate in this group',
                subtitle: optimisticIsMember
                    ? 'Choose a voice or ask your first public question to get started.'
                    : 'Members can vote, ask public questions, and coordinate growth actions.',
            };
        }
        if (activeSection === 'participate') {
            return {
                title: leader ? `Voice: ${leader.display_name || 'Anonymous'}` : 'No voice selected yet',
                subtitle: `${qaMetrics.total_questions} public question${qaMetrics.total_questions === 1 ? '' : 's'} with ${responseRate}% response rate`,
            };
        }
        if (activeSection === 'structure') {
            return {
                title: currentParentParty ? 'Connected in hierarchy' : 'Standalone group for now',
                subtitle: currentParentParty
                    ? `Parent group: ${currentParentParty.issue_text.slice(0, 90)}`
                    : 'Attach to a parent or add child groups to improve coordination.',
            };
        }
        return {
            title: currentParentParty ? 'Connected in hierarchy' : 'Standalone group for now',
            subtitle: currentParentParty
                ? `Parent group: ${currentParentParty.issue_text.slice(0, 90)}`
                : 'Attach to a parent or add child groups to improve coordination.',
        };
    }, [
        activeSection,
        leader,
        qaMetrics.total_questions,
        responseRate,
        currentParentParty,
        optimisticIsMember,
    ]);

    const leaderTrustLine = (() => {
        if (!leader) return 'No voice yet. Any member can become trusted to represent this issue.';
        if (votedFor === leader.user_id && voteExpiresAt) {
            return `Your backing for this voice ends on ${formatCompactDate(voteExpiresAt)} unless renewed.`;
        }
        return 'Backing is temporary and revocable. Members can change voices at any time.';
    })();

    const primaryAction: PrimaryAction = (() => {
        if (!optimisticIsMember) {
            return {
                label: joinButtonLabel,
                onClick: onJoin,
                disabled: joinDisabled,
                className: 'btn btn-primary btn-sm',
            };
        }
        if (isLeader) {
            return {
                label: 'You represent this group',
                onClick: undefined,
                disabled: true,
                className: 'btn btn-primary btn-sm opacity-90 cursor-default',
            };
        }
        return {
            label: joinLoading ? 'Leaving...' : 'Leave group',
            onClick: onLeaveIntent,
            disabled: joinLoading,
            className: 'btn btn-primary btn-sm',
        };
    })();

    return {
        leader,
        trustedLeaderName,
        latestAnsweredQuestion,
        lastActiveLabel,
        totalBackers,
        supporterGroupMemberCount,
        responseRate,
        sectionSummary,
        leaderTrustLine,
        primaryAction,
    };
}
