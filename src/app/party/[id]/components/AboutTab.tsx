'use client';

import type { Party, QAMetrics } from '@/types/database';
import { getProgressTarget, getProgressHint, StatTile } from './PartyDetailShared';

interface AboutTabProps {
    memberCount: number;
    totalBackers: number;
    qaMetrics: QAMetrics;
    currentParentParty: Party | null;
    parentTotalMembers: number | null;
    parentResponseRate: number | null;
    parentLastActive: string | null;
    parentHasLeader: boolean;
}

/** Milestone nodes at 10, 50, 100 members */
function GrowthMilestones({ count }: { count: number }) {
    const milestones = [
        { value: 10, label: '10' },
        { value: 50, label: '50' },
        { value: 100, label: '100' },
    ];

    return (
        <div className="mt-4">
            <div className="relative flex items-center gap-0">
                {/* Track line */}
                <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-border-primary/60 rounded-full" aria-hidden="true" />
                <div
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-primary/60 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((count / 100) * (100 - 8), 92)}%` }}
                    aria-hidden="true"
                />

                {milestones.map((m) => {
                    const reached = count >= m.value;
                    return (
                        <div key={m.value} className="relative z-10 flex flex-col items-center flex-1">
                            <div
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${reached
                                        ? 'border-primary bg-primary text-white'
                                        : 'border-border-primary bg-bg-card text-text-muted'
                                    }`}
                            >
                                {reached ? '✓' : m.label}
                            </div>
                            <span className={`mt-1.5 text-[10px] font-medium ${reached ? 'text-primary' : 'text-text-muted'}`}>
                                {m.label}
                            </span>
                        </div>
                    );
                })}
            </div>
            <p className="mt-3 text-xs text-text-muted">{getProgressHint(count)}</p>
        </div>
    );
}

export function AboutTab({
    memberCount,
    totalBackers,
    qaMetrics,
    currentParentParty,
    parentTotalMembers,
    parentResponseRate,
    parentLastActive,
    parentHasLeader,
}: AboutTabProps) {
    const answeredQuestions = Math.max(qaMetrics.total_questions - qaMetrics.unanswered_questions, 0);
    const responseRate = qaMetrics.total_questions > 0
        ? Math.round((answeredQuestions / qaMetrics.total_questions) * 100)
        : 0;

    const leveragePercent = parentTotalMembers && parentTotalMembers > 0
        ? Math.round((memberCount / parentTotalMembers) * 100)
        : null;

    const parentLastActiveLabel = parentLastActive
        ? new Date(parentLastActive).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
        })
        : null;

    const progressTarget = getProgressTarget(totalBackers);

    return (
        <section
            id="party-section-about"
            role="tabpanel"
            aria-labelledby="party-tab-about"
            className="animate-fade-in space-y-10 border-t border-border-primary/40 pt-8"
        >
            {/* ── Stats Grid ── */}
            <div>
                <h2 className="text-xl font-semibold text-text-primary mb-4">Stats</h2>
                <div className="grid grid-cols-3 gap-3">
                    <StatTile value={totalBackers.toLocaleString('en-IN')} label="Members" />
                    <StatTile
                        value={`${responseRate}%`}
                        label="Response rate"
                        valueClassName={responseRate >= 75 ? 'text-success' : responseRate >= 40 ? 'text-warning' : 'text-danger'}
                    />
                    <StatTile
                        value={qaMetrics.unanswered_questions}
                        label="Awaiting answers"
                        valueClassName={qaMetrics.unanswered_questions > 0 ? 'text-warning' : 'text-text-primary'}
                    />
                </div>
            </div>

            {/* ── Growth Milestones ── */}
            <div className="border-t border-border-primary/40 pt-8">
                <h2 className="text-xl font-semibold text-text-primary">Growth</h2>
                <p className="mt-1 text-sm text-text-secondary">
                    {totalBackers.toLocaleString('en-IN')} of {progressTarget} members
                </p>
                <GrowthMilestones count={totalBackers} />
            </div>

            {/* ── Parent Community ── */}
            {currentParentParty && (
                <div className="border-t border-border-primary/40 pt-8">
                    <h2 className="text-xl font-semibold text-text-primary">Parent community</h2>
                    <div className="mt-4 rounded-xl border border-border-primary bg-bg-tertiary/30 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-text-primary truncate">
                                {currentParentParty.issue_text}
                            </p>
                            {leveragePercent !== null && (
                                <span className="badge text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary">
                                    {leveragePercent}% share
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
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
                                    {parentLastActiveLabel || '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Recent Activity placeholder ── */}
            <div className="border-t border-border-primary/40 pt-8">
                <h2 className="text-xl font-semibold text-text-primary">Recent Activity</h2>
                <p className="mt-3 text-sm text-text-muted">Activity feed coming soon.</p>
            </div>
        </section>
    );
}
