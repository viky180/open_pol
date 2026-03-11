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
    // Get latest answer from leader for statement preview
    const leaderStatement = latestStatement?.answers?.find(
        a => a.answered_by === leader?.user_id
    );

    const scopeLabel = locationScope ? (SCOPE_LABELS[locationScope] ?? locationScope) : null;

    // ── Copy for group-internal leader card ──
    const groupCardSubtitle = leader
        ? 'This member received the most trust votes from within this group.'
        : 'No trust votes yet. Members of this group can back any other member as their preferred leader.';

    // ── Copy for level leader card ──
    const levelCardSubtitle = isWinningGroup
        ? `This group currently has the most members at the ${scopeLabel?.toLowerCase() ?? 'level'} level, so its leader officially represents this level.`
        : winningGroupName
            ? <>The group <span className="font-semibold text-text-primary">{winningGroupName}</span> currently leads this level. Its internally-elected leader speaks for the whole {scopeLabel?.toLowerCase() ?? 'level'}.</>
            : `Members of the leading group at each level trust-vote to elect their representative.`;

    return (
        <div id="leader-section">
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">
                {isGroupLeaderCard
                    ? 'Group-internal leader'
                    : scopeLabel ? `${scopeLabel} Level Official Representative` : 'Current representative'}
            </div>
            <p className="text-sm text-text-secondary mb-4">
                {isGroupLeaderCard ? groupCardSubtitle : levelCardSubtitle}
            </p>

            {/* Current Leader */}
            <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4 mb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="text-xs text-text-muted mb-1">
                            {isGroupLeaderCard
                                ? 'Most trusted in this group'
                                : scopeLabel ? `${scopeLabel} representative` : 'Current representative'}
                        </div>
                        {leader ? (
                            <>
                                <div className="font-semibold text-text-primary text-lg">
                                    {leader.display_name || 'Anonymous'}
                                </div>
                                <div className="text-sm text-text-muted">
                                    {leader.trust_votes} trust vote{leader.trust_votes !== 1 ? 's' : ''}
                                </div>
                            </>
                        ) : (
                            <div className="text-text-secondary">
                                {isGroupLeaderCard
                                    ? 'No votes cast yet — be the first to back someone.'
                                    : 'No representative selected yet at this level.'}
                            </div>
                        )}
                    </div>

                    {/* Winning badge — only on the level leader card */}
                    {!isGroupLeaderCard && isWinningGroup && (
                        <div className="flex-shrink-0 rounded-full border border-success/20 bg-success/10 px-2 py-1 text-[11px] font-medium text-success">
                            Leading group
                        </div>
                    )}
                </div>

                {/* Statement preview */}
                {leaderStatement && (
                    <div className="mt-4 pt-4 border-t border-border-primary">
                        <div className="text-xs text-text-muted mb-2">Latest statement</div>
                        <p className="text-sm text-text-secondary line-clamp-2">
                            &quot;{leaderStatement.answer_text}&quot;
                        </p>
                    </div>
                )}
            </div>

            <div className="text-sm text-text-muted">
                {isGroupLeaderCard
                    ? 'Trust votes are cast within this group and can be changed at any time.'
                    : isWinningGroup
                        ? 'Keep growing your group\'s membership to remain the level representative.'
                        : 'Back members in this group to grow its influence. The group with the most members provides the level leader.'}
            </div>
        </div>
    );
}
