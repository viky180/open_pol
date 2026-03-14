'use client';

import Link from 'next/link';

type AutoProvisionScope = 'state' | 'district' | 'village';

const SCOPE_LABEL: Record<AutoProvisionScope, string> = {
    state: 'State',
    district: 'District',
    village: 'Village',
};

interface PostJoinCTABannerProps {
    hasVoted: boolean;
    onCastVote: () => void;
    autoProvisionLinks?: Array<{ scope: AutoProvisionScope; party_id: string }>;
    missingLocationScopes?: AutoProvisionScope[];
    electWizardUrl?: string;
    onDismiss: () => void;
}

export function PostJoinCTABanner({
    hasVoted,
    onCastVote,
    autoProvisionLinks = [],
    missingLocationScopes = [],
    electWizardUrl,
    onDismiss,
}: PostJoinCTABannerProps) {
    // Steps: 0=Join, 1=Explore, 2=Cast vote, 3=Elect at all levels (if wizard available), 4=Invite
    const hasWizard = !!electWizardUrl;

    const steps = [
        { label: 'Join this group' },
        { label: 'Explore members and discussions' },
        { label: 'Cast your trust vote' },
        ...(hasWizard ? [{ label: 'Elect leaders at all levels' }] : []),
        { label: 'Invite others' },
    ];

    // currentStep: which step is currently active
    // 0=join (never shown since user is already a member)
    // 1=explore (active right after joining — nudge to look around first)
    // 2=vote (not voted yet, but explored)
    // 3=wizard (voted, wizard available)
    const currentStep = !hasVoted ? 1 : (hasWizard ? 3 : 3);

    return (
        <div className="mb-4 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-4 text-sm text-text-primary animate-fade-in">
            <p className="issue-section-kicker">You&apos;re in — take a look around</p>

            <ol className="mt-3 space-y-2">
                {steps.map((step, idx) => {
                    const isDone = idx < currentStep;
                    const isActive = idx === currentStep;

                    return (
                        <li
                            key={step.label}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${isDone
                                ? 'border-success/20 bg-success/5'
                                : isActive
                                    ? 'border-accent/25 bg-accent/[0.06]'
                                    : 'border-border-primary bg-bg-secondary/50'
                                }`}
                        >
                            <div
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${isDone
                                    ? 'border-success/40 bg-success/15 text-success'
                                    : isActive
                                        ? 'border-accent/40 bg-accent/15 text-accent'
                                        : 'border-border-primary bg-bg-secondary text-text-muted'
                                    }`}
                                style={{ fontFamily: 'var(--font-mono)' }}
                            >
                                {isDone ? '✓' : idx + 1}
                            </div>
                            <span className={`text-sm ${isDone ? 'text-success line-through decoration-success/40' : isActive ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>
                                {step.label}
                            </span>
                        </li>
                    );
                })}
            </ol>

            {/* CTA for current active step */}
            {!hasVoted && (
                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={onCastVote}
                    >
                        Cast trust vote
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={onDismiss}
                    >
                        Maybe later
                    </button>
                </div>
            )}

            {hasVoted && hasWizard && (
                <div className="mt-4">
                    <Link href={electWizardUrl!} className="btn btn-primary btn-sm w-full text-center block">
                        Elect leaders at all levels →
                    </Link>
                </div>
            )}

            {!hasWizard && autoProvisionLinks.length > 0 && (
                <div className="mt-4 border-t border-accent/15 pt-3">
                    <p className="text-xs text-text-muted">Your local chapters at other levels:</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {autoProvisionLinks.map((item) => (
                            <Link
                                key={`${item.scope}-${item.party_id}`}
                                href={`/party/${item.party_id}`}
                                className="btn btn-secondary btn-sm"
                            >
                                Open {SCOPE_LABEL[item.scope]} group →
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {missingLocationScopes.length > 0 && (
                <div className="mt-4 border-t border-warning/20 pt-3">
                    <p className="text-xs text-text-muted">
                        Local chapters at {missingLocationScopes.map(s => SCOPE_LABEL[s]).join(', ')} level{missingLocationScopes.length > 1 ? 's' : ''} could not be created — your profile is missing that location.
                    </p>
                    <Link href="/settings/profile" className="mt-2 inline-block btn btn-ghost btn-sm">
                        Complete your profile →
                    </Link>
                </div>
            )}

            <button
                type="button"
                className="mt-3 text-xs text-text-muted underline"
                onClick={onDismiss}
            >
                Dismiss
            </button>
        </div>
    );
}
