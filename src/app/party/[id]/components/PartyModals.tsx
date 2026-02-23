'use client';

import { useRouter } from 'next/navigation';
import type { MemberWithVotes } from '@/types/database';
import { TrustSelectionScreen } from '@/components/TrustSelectionScreen';

/* ── Leave Modal ── */

interface LeaveModalProps {
    partyIssueText: string;
    joinLoading: boolean;
    onCancel: () => void;
    onLeave: () => void;
}

export function LeaveModal({ partyIssueText, joinLoading, onCancel, onLeave }: LeaveModalProps) {
    return (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
            <div className="card max-w-md w-full">
                <div className="mb-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                        Walking away from group
                    </div>
                    <h2 className="text-lg font-semibold text-text-primary mt-2">
                        Leave {partyIssueText || 'this group'}?
                    </h2>
                    <p className="text-sm text-text-secondary mt-2">
                        You&apos;ll no longer be represented by this group, and your weight will be removed from its coalition.
                    </p>
                </div>
                <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4 text-sm text-text-secondary">
                    <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-2">
                        What changes now
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Your choice is removed immediately</li>
                        <li>Representation ends</li>
                        <li>You can join another group anytime</li>
                    </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={onCancel}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onLeave}
                        className="btn btn-primary"
                        disabled={joinLoading}
                    >
                        {joinLoading ? 'Leaving...' : 'Leave group'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Auth Modal ── */

interface AuthModalProps {
    partyId: string;
    onCancel: () => void;
}

export function AuthModal({ partyId, onCancel }: AuthModalProps) {
    const router = useRouter();

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
            <div className="card max-w-md w-full">
                <h3 className="text-lg font-semibold mb-2">Create an account to join</h3>
                <p className="text-sm text-text-secondary mb-4">
                    We need a verified account so voting stays secure and one-person-one-vote is enforced.
                    You&apos;ll also be able to participate in Q&A and alliances.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={onCancel}
                        className="btn btn-secondary"
                    >
                        Not now
                    </button>
                    <button
                        onClick={() => {
                            const returnPath = `/party/${partyId}`;
                            router.push(`/auth?returnTo=${encodeURIComponent(returnPath)}`);
                        }}
                        className="btn btn-primary"
                    >
                        Continue to sign in
                    </button>
                </div>
                <p className="text-xs text-text-muted mt-4 text-center">
                    🔒 We never sell your data.
                </p>
            </div>
        </div>
    );
}

/* ── Trust Selection Modal ── */

interface TrustSelectionModalProps {
    partyId: string;
    partyName: string;
    members: MemberWithVotes[];
    currentUserId: string | null;
    votedFor: string | null;
    onVoteChange: () => void;
    onClose: () => void;
}

export function TrustSelectionModal({
    partyId,
    partyName,
    members,
    currentUserId,
    votedFor,
    onVoteChange,
    onClose,
}: TrustSelectionModalProps) {
    return (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
            <div className="card max-w-lg w-full my-8">
                <TrustSelectionScreen
                    partyId={partyId}
                    partyName={partyName}
                    members={members}
                    currentUserId={currentUserId}
                    votedFor={votedFor}
                    onVoteChange={onVoteChange}
                    onClose={onClose}
                />
            </div>
        </div>
    );
}
