import type { MemberWithVotes, QuestionWithAnswers } from '@/types/database';

interface LeaderSectionProps {
    leader: MemberWithVotes | null;
    latestStatement: QuestionWithAnswers | null;
    locationScope?: string | null;
    isWinningGroup?: boolean;
    winningGroupName?: string | null;
    /** When true, this card shows the group's own internal leader (not the level leader) */
    isGroupLeaderCard?: boolean;
}

const SCOPE_LABELS: Record<string, string> = {
    village: 'Village',
    panchayat: 'Panchayat',
    block: 'Block',
    district: 'District',
    state: 'State',
    national: 'National',
};

export function LeaderSection({
    leader,
    latestStatement,
    locationScope,
    isWinningGroup,
    winningGroupName,
    isGroupLeaderCard = false,
}: LeaderSectionProps) {
    const leaderStatement = latestStatement?.answers?.find(
        (answer) => answer.answered_by === leader?.user_id
    );

    const scopeLabel = locationScope ? (SCOPE_LABELS[locationScope] ?? locationScope) : null;

    const groupCardSubtitle = leader
        ? 'This person has the most trust votes in this group.'
        : 'No one has trust votes yet. Members of this group can back any other member as leader.';

    const levelCardSubtitle = isWinningGroup
        ? `This group has the most members at the ${scopeLabel?.toLowerCase() ?? 'level'} level, so its leader speaks for this level.`
        : winningGroupName
            ? <>The group <span className="font-semibold text-text-primary">{winningGroupName}</span> has the most members at this level, so its leader speaks for this level.</>
            : 'At each level, the group with the most members provides the representative.';

    return (
        <div id="leader-section">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-text-muted">
                {isGroupLeaderCard
                    ? 'Leader in this group'
                    : scopeLabel ? `${scopeLabel} representative` : 'Current representative'}
            </div>
            <p className="mb-4 text-sm text-text-secondary">
                {isGroupLeaderCard ? groupCardSubtitle : levelCardSubtitle}
            </p>

            <div className="mb-4 rounded-xl border border-border-primary bg-bg-tertiary p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="mb-1 text-xs text-text-muted">
                            {isGroupLeaderCard
                                ? 'Most trusted member'
                                : scopeLabel ? `${scopeLabel} representative` : 'Current representative'}
                        </div>
                        {leader ? (
                            <>
                                <div className="text-lg font-semibold text-text-primary">
                                    {leader.display_name || 'Anonymous'}
                                </div>
                                <div className="text-sm text-text-muted">
                                    {leader.trust_votes} trust vote{leader.trust_votes !== 1 ? 's' : ''}
                                </div>
                            </>
                        ) : (
                            <div className="text-text-secondary">
                                {isGroupLeaderCard
                                    ? 'No trust votes yet. Be the first to back someone.'
                                    : 'No representative has been chosen at this level yet.'}
                            </div>
                        )}
                    </div>

                    {!isGroupLeaderCard && isWinningGroup && (
                        <div className="flex-shrink-0 rounded-full border border-success/20 bg-success/10 px-2 py-1 text-[11px] font-medium text-success">
                            Largest group
                        </div>
                    )}
                </div>

                {leaderStatement && (
                    <div className="mt-4 border-t border-border-primary pt-4">
                        <div className="mb-2 text-xs text-text-muted">Latest answer</div>
                        <p className="line-clamp-2 text-sm text-text-secondary">
                            &quot;{leaderStatement.answer_text}&quot;
                        </p>
                    </div>
                )}
            </div>

            <div className="text-sm text-text-muted">
                {isGroupLeaderCard
                    ? 'Trust votes happen inside this group, and you can change yours at any time.'
                    : isWinningGroup
                        ? 'Keep growing this group if you want it to stay the representative here.'
                        : 'If this group grows to the most members, its leader will speak for this level.'}
            </div>
        </div>
    );
}
