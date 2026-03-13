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

const RECONFIRMATION_DAYS = 180;

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
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const sortedMembers = [...members]
        .filter((member) => member.user_id !== currentUserId)
        .sort((a, b) => b.trust_votes - a.trust_votes);

    const handleConfirmTrust = async () => {
        if (!currentUserId || !selectedMember || loading) return;
        setLoading(true);

        try {
            if (votedFor) {
                await supabase
                    .from('trust_votes')
                    .delete()
                    .eq('party_id', partyId)
                    .eq('from_user_id', currentUserId);
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + RECONFIRMATION_DAYS);

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
            console.error('Backing error:', err);
        } finally {
            setLoading(false);
        }
    };

    const hasChanged = selectedMember !== votedFor;
    const selectedMemberName =
        sortedMembers.find((member) => member.user_id === selectedMember)?.display_name || 'this member';

    return (
        <div className="max-w-lg mx-auto" id="trust-selection-screen">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-text-primary mb-2">Choose who speaks for you</h2>
                <p className="text-sm text-text-secondary">
                    Pick one member from <span className="font-medium">{partyName}</span> to speak for you.
                </p>
            </div>

            <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4 mb-6">
                <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">Change</span>
                        <div>
                            <div className="text-sm font-medium text-text-primary">You can change this any time</div>
                            <div className="text-xs text-text-muted">Your choice is never permanent.</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">Reminder</span>
                        <div>
                            <div className="text-sm font-medium text-text-primary">It lasts for 6 months</div>
                            <div className="text-xs text-text-muted">We&apos;ll ask you to confirm it again after that.</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <div className="text-xs uppercase tracking-[0.15em] text-text-muted mb-3">Members</div>

                {sortedMembers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border-primary bg-bg-secondary p-6 text-center">
                        <p className="text-sm text-text-muted">No one else is available to choose yet.</p>
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
                                    <input
                                        type="radio"
                                        name="trust-member"
                                        value={member.user_id}
                                        checked={isSelected}
                                        onChange={() => setSelectedMember(member.user_id)}
                                        className="w-4 h-4 text-primary accent-primary"
                                    />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-text-primary truncate">
                                                {member.display_name || 'Anonymous'}
                                            </span>
                                            {member.is_leader && (
                                                <span className="text-[10px] uppercase tracking-wide text-primary">
                                                    Current leader
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-text-muted">
                                            {member.trust_votes} trust vote{member.trust_votes !== 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    <Link
                                        href={`/member/${member.user_id}`}
                                        onClick={(event) => event.stopPropagation()}
                                        className="text-xs text-text-muted hover:text-primary transition-colors"
                                    >
                                        View profile
                                    </Link>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedMember && (
                <div className="mb-8">
                    <div className="text-xs uppercase tracking-[0.15em] text-text-muted mb-3">Your current choice</div>
                    <p className="text-sm text-text-secondary">
                        You currently back <span className="font-medium text-text-primary">{selectedMemberName}</span>.
                        We&apos;ll ask you to confirm that again in 6 months.
                    </p>
                </div>
            )}

            <div className="flex flex-col gap-3">
                <button
                    onClick={handleConfirmTrust}
                    disabled={!selectedMember || loading || !hasChanged}
                    className="btn btn-primary btn-lg w-full"
                >
                    {loading ? 'Saving...' : 'Save choice'}
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
                        You can change this any time from the group page.
                    </p>
                )}
            </div>
        </div>
    );
}
