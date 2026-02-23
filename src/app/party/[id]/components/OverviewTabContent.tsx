'use client';

import type { Party } from '@/types/database';

interface OverviewActivityItem {
    id: string;
    text: string;
    timestamp: string;
}

interface OverviewTabContentProps {
    totalQuestions: number;
    responseRate: number;
    unansweredQuestions: number;
    onOpenParticipation: () => void;
    onOpenStructure: () => void;
    totalBackers: number;
    growthTarget: number;
    growthProgress: number;
    remainingForUnlock: number;
    nextUnlockLabel: string;
    recentActivity: OverviewActivityItem[];
    memberCount: number;
    parentTotalMembers: number | null;
    parentResponseRate: number | null;
    parentLastActive: string | null;
    parentHasLeader: boolean;
    currentParentParty: Party | null;
}

function getResponseRateClass(rate: number) {
    if (rate === 0) return 'text-danger/70';
    if (rate < 40) return 'text-danger';
    if (rate < 75) return 'text-warning';
    return 'text-success';
}

function getResponseRateHelper(rate: number, totalQuestions: number) {
    if (totalQuestions === 0 || rate === 0) return 'No responses yet';
    if (rate < 40) return 'Low response coverage';
    if (rate < 75) return 'Response flow improving';
    return 'Healthy response flow';
}

export function OverviewTabContent({
    totalQuestions,
    responseRate,
    unansweredQuestions,
    onOpenParticipation,
    onOpenStructure,
    totalBackers,
    growthTarget,
    growthProgress,
    remainingForUnlock,
    nextUnlockLabel,
    recentActivity,
    memberCount,
    parentTotalMembers,
    parentResponseRate,
    parentLastActive,
    parentHasLeader,
    currentParentParty,
}: OverviewTabContentProps) {
    const leveragePercent = parentTotalMembers && parentTotalMembers > 0
        ? Math.round((memberCount / parentTotalMembers) * 100)
        : null;

    const parentLastActiveLabel = parentLastActive
        ? new Date(parentLastActive).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        : 'Unknown';

    return (
        <section
            id="party-section-overview"
            role="tabpanel"
            className="party-section-anchor"
            aria-labelledby="party-tab-overview"
        >
            <div className="border-t border-border-primary/70 pt-10">

                {currentParentParty && (
                    <div className="mb-10">
                        <h2 className="text-lg font-semibold text-text-primary">Community</h2>
                        <div className="mt-4 rounded-xl border border-border-primary bg-bg-tertiary/30 p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-medium text-text-primary truncate">
                                    Parent: {currentParentParty.issue_text}
                                </p>
                                {leveragePercent !== null && (
                                    <span className="badge text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary">
                                        {leveragePercent}% share
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                <div className="rounded-lg border border-border-primary bg-bg-card p-2.5">
                                    <p className="text-xs text-text-muted">Leader</p>
                                    <p className={parentHasLeader ? 'text-success font-medium' : 'text-warning font-medium'}>
                                        {parentHasLeader ? 'Available' : 'Not set'}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border-primary bg-bg-card p-2.5">
                                    <p className="text-xs text-text-muted">Response rate</p>
                                    <p className="text-text-primary font-medium">
                                        {parentResponseRate !== null ? `${parentResponseRate}%` : 'N/A'}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border-primary bg-bg-card p-2.5">
                                    <p className="text-xs text-text-muted">Last active</p>
                                    <p className="text-text-primary font-medium">
                                        {parentLastActiveLabel}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <h2 className="text-lg font-semibold text-text-primary">Group Health</h2>
                <div className="mt-4 divide-y divide-border-primary/70 sm:grid sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
                    <div className="px-0 py-3 sm:px-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Response Rate</p>
                        <p className={`mt-1 text-2xl font-semibold ${getResponseRateClass(responseRate)}`}>
                            {responseRate}%
                        </p>
                        <p className="mt-1 text-xs text-text-muted">{getResponseRateHelper(responseRate, totalQuestions)}</p>
                    </div>
                    <div className="px-0 py-3 sm:px-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Open Questions</p>
                        <p className="mt-1 text-2xl font-semibold text-text-primary">{totalQuestions}</p>
                    </div>
                    <div className="px-0 py-3 sm:px-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Awaiting Answers</p>
                        <p className="mt-1 text-2xl font-semibold text-text-primary">{unansweredQuestions}</p>
                    </div>
                </div>
            </div>

            <div className="mt-12 border-t border-border-primary/70 pt-10">
                <h2 className="text-lg font-semibold text-text-primary">Participate</h2>
                <p className="mt-2 text-sm text-text-secondary">
                    One action can improve representation and accountability today.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                    <li>Vote for representative</li>
                    <li>Ask public question</li>
                    <li>Help grow this group</li>
                </ul>
                <button type="button" onClick={onOpenParticipation} className="btn btn-secondary mt-5 rounded-md">
                    Vote or Ask a Question
                </button>
            </div>

            <div className="mt-12 border-t border-border-primary/70 pt-10">
                <h2 className="text-lg font-semibold text-text-primary">Growth</h2>
                <div className="mt-3 text-sm text-text-secondary">{totalBackers} members</div>
                <div className="progress-bar-container mt-3 h-3">
                    <div className="progress-bar-fill" style={{ width: `${growthProgress}%` }} />
                </div>
                <p className="mt-3 text-sm text-text-secondary">
                    {remainingForUnlock > 0
                        ? `${remainingForUnlock} more members to unlock ${nextUnlockLabel}`
                        : `${nextUnlockLabel} unlocked`}
                </p>
                <p className="text-xs text-text-muted mt-1">Next unlock target: {growthTarget} members</p>
            </div>

            <div className="mt-12 border-t border-border-primary/70 pt-10">
                <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
                {recentActivity.length > 0 ? (
                    <ul className="mt-4 divide-y divide-border-primary/70">
                        {recentActivity.map((item) => (
                            <li key={item.id} className="py-3">
                                <p className="text-sm text-text-primary">{item.text}</p>
                                <p className="text-xs text-text-muted mt-1">{item.timestamp}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="mt-4">
                        <p className="text-sm text-text-muted">No activity yet.</p>
                        <p className="text-sm text-text-secondary">Be the first to take action.</p>
                    </div>
                )}
            </div>

            {/* ===== Community Quick Actions (sub-groups only) ===== */}
            {currentParentParty && (
                <div className="mt-12 border-t border-border-primary/70 pt-10">
                    <h2 className="text-lg font-semibold text-text-primary">Community Actions</h2>
                    <p className="mt-1 text-sm text-text-secondary">
                        Need to switch parent, petition, or leave? Use one settings screen.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={onOpenStructure} className="btn btn-primary btn-sm">
                            Open community settings
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
