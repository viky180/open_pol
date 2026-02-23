'use client';

import type { PartyMilestone } from '@/types/database';

function formatMilestoneTitle(m: PartyMilestone) {
    if (m.milestone_type === 'members_threshold') {
        return `Level Up: ${m.threshold} members`;
    }
    return 'Milestone';
}

function formatMilestoneBody(m: PartyMilestone, issueText: string) {
    if (m.milestone_type === 'members_threshold') {
        return `“${issueText.slice(0, 90)}${issueText.length > 90 ? '…' : ''}” just crossed ${m.threshold} members.`;
    }
    return 'A collective milestone was reached.';
}

export function PartyMilestoneFeed({
    milestones,
    issueText,
}: {
    milestones: PartyMilestone[];
    issueText: string;
}) {
    if (!milestones || milestones.length === 0) {
        return (
            <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4 text-sm text-text-secondary">
                Milestones appear when the group takes action. Start by asking a public question or inviting one new member.
            </div>
        );
    }

    return (
        <div className="mb-6">
            <h2 className="text-sm font-semibold text-text-secondary mb-3">🎉 Milestones</h2>
            <div className="space-y-3">
                {milestones.map((m) => (
                    <div
                        key={m.id}
                        className="p-4 rounded-xl border border-border-primary bg-gradient-to-r from-emerald-500/10 to-indigo-500/10"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-text-primary">
                                    {formatMilestoneTitle(m)}
                                </div>
                                <div className="text-sm text-text-secondary mt-1">
                                    {formatMilestoneBody(m, issueText)}
                                </div>
                            </div>
                            <div className="text-xs text-text-muted whitespace-nowrap">
                                {new Date(m.created_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                })}
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 items-center">
                            <span className="badge badge-level-2 border">Collective</span>
                            <span className="badge border">👥 {m.member_count_at_event}</span>
                            <span className="text-xs text-text-muted">
                                Records collective progress for public legitimacy.
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
