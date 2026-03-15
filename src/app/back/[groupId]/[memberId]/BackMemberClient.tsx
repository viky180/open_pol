'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastContext';

interface BackMemberClientProps {
    groupId: string;
    groupName: string;
    memberId: string;
    memberName: string;
    memberBio: string | null;
    currentUserId: string;
    isMember: boolean;
    alreadyVotedFor: string | null;
    isSelf: boolean;
}

type Step = 'idle' | 'loading' | 'done' | 'already';

export function BackMemberClient({
    groupId,
    groupName,
    memberId,
    memberName,
    memberBio,
    isMember,
    alreadyVotedFor,
    isSelf,
}: BackMemberClientProps) {
    const { showToast } = useToast();
    const alreadyBackingThis = alreadyVotedFor === memberId;
    const [step, setStep] = useState<Step>(alreadyBackingThis ? 'already' : 'idle');

    const handleBack = async () => {
        setStep('loading');
        try {
            // Auto-join if needed
            if (!isMember) {
                const joinRes = await fetch(`/api/parties/${groupId}/join`, { method: 'POST' });
                if (!joinRes.ok) {
                    const payload = await joinRes.json().catch(() => ({}));
                    throw new Error(payload?.error ?? 'Could not join the group');
                }
            }

            // Cast trust vote
            const voteRes = await fetch(`/api/parties/${groupId}/trust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to_user_id: memberId }),
            });
            if (!voteRes.ok) {
                const payload = await voteRes.json().catch(() => ({}));
                throw new Error(payload?.error ?? 'Could not save your trust vote');
            }

            setStep('done');
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            setStep('idle');
        }
    };

    if (isSelf) {
        return (
            <div className="max-w-sm w-full text-center space-y-4">
                <p className="text-text-secondary text-sm">You cannot back yourself.</p>
                <Link href={`/group/${groupId}`} className="btn btn-secondary w-full">
                    Go to group
                </Link>
            </div>
        );
    }

    if (step === 'done') {
        return (
            <div className="max-w-sm w-full space-y-6 animate-fade-in">
                <div className="rounded-2xl border border-border-primary bg-bg-card p-6 text-center space-y-3">
                    <div className="text-4xl">✓</div>
                    <h1 className="text-xl font-semibold text-text-primary">You&apos;re backing {memberName}</h1>
                    <p className="text-sm text-text-secondary">
                        {memberName} now speaks for you in <span className="font-medium">{groupName}</span>.
                        You can change this any time from the group page.
                    </p>
                </div>
                <Link href={`/group/${groupId}`} className="btn btn-secondary w-full text-center block">
                    Go to group
                </Link>
            </div>
        );
    }

    if (step === 'already') {
        return (
            <div className="max-w-sm w-full space-y-6 animate-fade-in">
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-3">
                    <div className="text-4xl">✓</div>
                    <h1 className="text-xl font-semibold text-text-primary">Already backing {memberName}</h1>
                    <p className="text-sm text-text-secondary">
                        You already trust {memberName} to speak for you in{' '}
                        <span className="font-medium">{groupName}</span>.
                    </p>
                </div>
                <Link href={`/group/${groupId}`} className="btn btn-secondary w-full text-center block">
                    Go to group
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-sm w-full space-y-6 animate-fade-in">
            {/* Header */}
            <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-[0.15em] text-text-muted">{groupName}</p>
                <h1 className="text-2xl font-bold text-text-primary">Back {memberName}</h1>
                <p className="text-sm text-text-secondary">
                    Give {memberName} your trust vote — they&apos;ll speak for you in this group.
                </p>
            </div>

            {/* Member card */}
            <div className="rounded-2xl border border-border-primary bg-bg-card p-5 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="avatar avatar-md flex-shrink-0">
                        {memberName[0].toUpperCase()}
                    </div>
                    <div>
                        <div className="font-semibold text-text-primary">{memberName}</div>
                        <div className="text-xs text-text-muted">Member of {groupName}</div>
                    </div>
                </div>
                {memberBio && (
                    <p className="text-sm text-text-secondary italic border-l-2 border-primary/30 pl-3">
                        &ldquo;{memberBio}&rdquo;
                    </p>
                )}
            </div>

            {/* What this means */}
            <div className="rounded-xl border border-border-primary bg-bg-tertiary px-4 py-3 text-sm text-text-secondary space-y-1">
                <p><span className="font-medium text-text-primary">What happens:</span></p>
                <ul className="list-disc pl-4 space-y-0.5 text-xs">
                    {!isMember && <li>You&apos;ll join <span className="font-medium">{groupName}</span> automatically</li>}
                    <li>{memberName} becomes your voice in this group</li>
                    <li>Your trust lasts 6 months — change it any time</li>
                </ul>
            </div>

            {/* CTA */}
            <button
                onClick={handleBack}
                disabled={step === 'loading'}
                className="btn btn-primary btn-lg w-full"
            >
                {step === 'loading' ? 'Saving...' : `Back ${memberName}`}
            </button>

            <Link
                href={`/group/${groupId}`}
                className="block text-center text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
                See the full group instead
            </Link>
        </div>
    );
}
