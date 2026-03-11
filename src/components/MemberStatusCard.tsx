'use client';

interface MemberStatusCardProps {
    partyId: string;
    trustedLeaderName: string | null;
    voteExpiresAt: string | null;
    memberSince: string | null;
    onManageTrustClick: () => void;
    onExitClick: () => void;
}

function formatMemberSince(date: string): string {
    const joined = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - joined.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
}

export function MemberStatusCard({
    trustedLeaderName,
    memberSince,
    onManageTrustClick,
    onExitClick,
}: MemberStatusCardProps) {
    return (
        <div className="card-glass mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">
                Your status
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4">
                    <div className="text-xs text-text-muted mb-1">Your trusted voice</div>
                    <div className="font-medium text-text-primary">
                        {trustedLeaderName || 'No voice chosen'}
                    </div>
                    {trustedLeaderName && (
                        <div className="text-xs text-text-muted mt-1">
                            Your support for <span className="text-text-secondary">{trustedLeaderName}</span> is active.
                            You&apos;ll be asked to confirm it in 6 months.
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4">
                    <div className="text-xs text-text-muted mb-1">Member since</div>
                    <div className="font-medium text-text-primary">
                        {memberSince ? formatMemberSince(memberSince) : 'Unknown'}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border-primary">
                <button
                    onClick={onManageTrustClick}
                    className="text-sm text-primary hover:underline"
                >
                    Choose who speaks for you -&gt;
                </button>
                <button
                    onClick={onExitClick}
                    className="text-sm text-text-muted hover:text-danger transition"
                >
                    Leave group
                </button>
            </div>
        </div>
    );
}
