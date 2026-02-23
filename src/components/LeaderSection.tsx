import type { MemberWithVotes, QuestionWithAnswers } from '@/types/database';

interface LeaderSectionProps {
    leader: MemberWithVotes | null;
    latestStatement: QuestionWithAnswers | null;
}

export function LeaderSection({
    leader,
    latestStatement,
}: LeaderSectionProps) {
    // Get latest answer from leader for statement preview
    const leaderStatement = latestStatement?.answers?.find(
        a => a.answered_by === leader?.user_id
    );

    return (
        <div className="card mb-6" id="leader-section">
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">
                Leadership
            </div>
            <p className="text-sm text-text-secondary mb-4">
                Your choice determines who speaks for the group. It’s reversible and expires automatically.
            </p>

            {/* Current Leader */}
            <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4 mb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="text-xs text-text-muted mb-1">Current representative</div>
                        {leader ? (
                            <>
                                <div className="font-semibold text-text-primary text-lg">
                                    {leader.display_name || 'Anonymous'}
                                </div>
                                <div className="text-sm text-text-muted">
                                    {leader.trust_votes} choice{leader.trust_votes !== 1 ? 's' : ''}
                                </div>
                            </>
                        ) : (
                            <div className="text-text-secondary">
                                No representative yet — be the first to choose
                            </div>
                        )}
                    </div>

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
                Choose or change your vote from the members list below.
            </div>
        </div>
    );
}
