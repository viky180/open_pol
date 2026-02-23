'use client';

interface MemberStatusCardProps {
    partyId: string;
    trustedLeaderName: string | null;
    voteExpiresAt: string | null;
    memberSince: string | null;
    onManageTrustClick: () => void;
    onExitClick: () => void;
}

function getDaysRemaining(expiresAt: string): number {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function formatExpiryDate(date: string): string {
    const expiry = new Date(date);
    return expiry.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
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
    voteExpiresAt,
    memberSince,
    onManageTrustClick,
    onExitClick,
}: MemberStatusCardProps) {
    const daysRemaining = voteExpiresAt ? getDaysRemaining(voteExpiresAt) : null;
    const expiryDate = voteExpiresAt ? formatExpiryDate(voteExpiresAt) : null;

    return (
        <div className="card-glass mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">
                Your status
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Your trust choice */}
                <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4">
                    <div className="text-xs text-text-muted mb-1">Your trusted representative</div>
                    <div className="font-medium text-text-primary">
                        {trustedLeaderName || 'No representative chosen'}
                    </div>
                    {voteExpiresAt && daysRemaining !== null && (
                        <div className="text-xs text-text-muted mt-1">
                            {daysRemaining > 0 ? (
                                <>
                                    Expires on {expiryDate}
                                    {daysRemaining <= 7 && (
                                        <span className="text-warning ml-1">(renew soon)</span>
                                    )}
                                </>
                            ) : (
                                <span className="text-warning">Choice expired</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Member Since */}
                <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4">
                    <div className="text-xs text-text-muted mb-1">Member since</div>
                    <div className="font-medium text-text-primary">
                        {memberSince ? formatMemberSince(memberSince) : 'Unknown'}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border-primary">
                <button
                    onClick={onManageTrustClick}
                    className="text-sm text-primary hover:underline"
                >
                    Choose who speaks for you →
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
