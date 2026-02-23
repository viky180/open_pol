'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { MemberWithVotes } from '@/types/database';

interface TrustSelectionScreenProps {
    partyId: string;
    partyName: string;
    members: MemberWithVotes[];
    currentUserId: string | null;
    votedFor: string | null;
    onVoteChange: () => void;
    onClose?: () => void;
}

// Duration options in days
const TRUST_DURATIONS = [
    { value: 30, label: '30 days' },
    { value: 90, label: '3 months' },
    { value: 180, label: '6 months' },
    { value: 365, label: '1 year' },
];

export function TrustSelectionScreen({
    partyId,
    partyName,
    members,
    currentUserId,
    votedFor,
    onVoteChange,
    onClose,
}: TrustSelectionScreenProps) {
    const [selectedMember, setSelectedMember] = useState<string | null>(votedFor);
    const [duration, setDuration] = useState(90); // Default: 3 months
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    // Sort members by current trust (descending)
    const sortedMembers = [...members]
        .filter(m => m.user_id !== currentUserId) // Can't trust yourself
        .sort((a, b) => b.trust_votes - a.trust_votes);

    const handleConfirmTrust = async () => {
        if (!currentUserId || !selectedMember || loading) return;
        setLoading(true);

        try {
            // Remove existing vote first
            if (votedFor) {
                await supabase
                    .from('trust_votes')
                    .delete()
                    .eq('party_id', partyId)
                    .eq('from_user_id', currentUserId);
            }

            // Create new trust vote with expiry
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + duration);

            await supabase
                .from('trust_votes')
                .insert({
                    party_id: partyId,
                    from_user_id: currentUserId,
                    to_user_id: selectedMember,
                    expires_at: expiresAt.toISOString(),
                });

            onVoteChange();
            onClose?.();
        } catch (err) {
            console.error('Trust vote error:', err);
        } finally {
            setLoading(false);
        }
    };

    const hasChanged = selectedMember !== votedFor;

    return (
        <div className="max-w-lg mx-auto" id="trust-selection-screen">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                    Choose who speaks for you
                </h2>
                <p className="text-sm text-text-secondary">
                    Select a member to speak on your behalf in{' '}
                    <span className="font-medium">{partyName}</span>.
                </p>
            </div>

            {/* Explanation Card */}
            <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4 mb-6">
                <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">↩️</span>
                        <div>
                            <div className="text-sm font-medium text-text-primary">
                                You can leave anytime
                            </div>
                            <div className="text-xs text-text-muted">
                                Your choice is always reversible.
                            </div>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">⏳</span>
                        <div>
                            <div className="text-sm font-medium text-text-primary">
                                Your choice expires automatically
                            </div>
                            <div className="text-xs text-text-muted">
                                We’ll remind you before it expires.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Candidate List */}
            <div className="mb-6">
                <div className="text-xs uppercase tracking-[0.15em] text-text-muted mb-3">
                    Members
                </div>

                {sortedMembers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border-primary bg-bg-secondary p-6 text-center">
                        <p className="text-sm text-text-muted">
                            No other members to trust yet.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {sortedMembers.map((member) => {
                            const isSelected = selectedMember === member.user_id;

                            return (
                                <label
                                    key={member.user_id}
                                    className={`
                                        flex items-center gap-4 p-4 rounded-xl border cursor-pointer
                                        transition-all duration-200
                                        ${isSelected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border-primary bg-bg-card hover:border-border-secondary'
                                        }
                                    `}
                                >
                                    {/* Radio button */}
                                    <input
                                        type="radio"
                                        name="trust-member"
                                        value={member.user_id}
                                        checked={isSelected}
                                        onChange={() => setSelectedMember(member.user_id)}
                                        className="w-4 h-4 text-primary accent-primary"
                                    />

                                    {/* Member info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-text-primary truncate">
                                                {member.display_name || 'Anonymous'}
                                            </span>
                                            {member.is_leader && (
                                                <span className="text-[10px] uppercase tracking-wide text-primary">
                                                    Current representative
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-text-muted">
                                            {member.trust_votes} choice{member.trust_votes !== 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    {/* Profile link */}
                                    <Link
                                        href={`/member/${member.user_id}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-text-muted hover:text-primary transition-colors"
                                    >
                                        View profile →
                                    </Link>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Duration Selector */}
            {selectedMember && (
                <div className="mb-8">
                    <div className="text-xs uppercase tracking-[0.15em] text-text-muted mb-3">
                        Choice duration
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {TRUST_DURATIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setDuration(opt.value)}
                                className={`
                                    px-3 py-2 rounded-lg text-sm font-medium
                                    transition-all duration-200 border
                                    ${duration === opt.value
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border-primary bg-bg-card text-text-secondary hover:border-border-secondary'
                                    }
                                `}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-text-muted mt-2">
                        Your choice will expire on{' '}
                        {new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
                <button
                    onClick={handleConfirmTrust}
                    disabled={!selectedMember || loading || !hasChanged}
                    className="btn btn-primary btn-lg w-full"
                >
                    {loading ? 'Saving...' : 'Confirm choice'}
                </button>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="btn btn-secondary w-full"
                    >
                        Cancel
                    </button>
                )}

                {votedFor && (
                    <p className="text-xs text-text-muted text-center mt-2">
                        You can change your choice at any time from the group page.
                    </p>
                )}
            </div>
        </div>
    );
}
