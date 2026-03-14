'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrustSelectionScreen } from '@/components/TrustSelectionScreen';
import type { LevelData, AvailableGroup } from './page';

interface Props {
    levels: LevelData[];
    currentUserId: string;
    nationalId: string;
    issueId: string;
    issueText: string;
    categoryId: string | null;
}

function buildCreateGroupUrl(level: LevelData, issueText: string, nationalId: string): string {
    const params = new URLSearchParams({
        issue: issueText,
        location_scope: level.scope,
        parent: nationalId,
        ...(level.userState    ? { state_name: level.userState }       : {}),
        ...(level.userDistrict ? { district_name: level.userDistrict } : {}),
        ...(level.userVillage  ? { village_name: level.userVillage }   : {}),
    });
    return `/group/create?${params.toString()}`;
}

export function ElectWizardClient({ levels, currentUserId, nationalId, issueId, issueText, categoryId }: Props) {
    void issueId;
    void categoryId;
    const router = useRouter();
    // Start at the first step where the user hasn't voted yet (or hasn't joined)
    const getInitialStep = () => {
        const firstPending = levels.findIndex(l => !l.joinedPartyId || !l.votedFor);
        return firstPending === -1 ? 0 : firstPending;
    };
    const [currentStep, setCurrentStep] = useState(getInitialStep);
    const [finishing, setFinishing] = useState(false);
    const [joiningPartyId, setJoiningPartyId] = useState<string | null>(null);
    const [joinError, setJoinError] = useState<string | null>(null);

    if (levels.length === 0) {
        router.push(`/group/${nationalId}`);
        return null;
    }

    const currentLevel = levels[currentStep];
    const isLastStep = currentStep === levels.length - 1;

    const handleNext = () => {
        setJoinError(null);
        if (isLastStep) {
            setFinishing(true);
            router.push(`/group/${nationalId}`);
            router.refresh();
        } else {
            setCurrentStep(s => s + 1);
        }
    };

    const handleSkip = () => {
        handleNext();
    };

    const handleJoinGroup = async (partyId: string) => {
        setJoiningPartyId(partyId);
        setJoinError(null);
        try {
            const res = await fetch(`/api/parties/${partyId}/join`, { method: 'POST' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || 'Unable to join group');
            }
            // Once joined, refresh the page data so this step turns from "availableGroups" into "TrustSelectionScreen"
            router.refresh();
        } catch (err) {
            setJoinError(err instanceof Error ? err.message : 'Unable to join group');
        } finally {
            setJoiningPartyId(null);
        }
    };

    const stepLabel = currentLevel.scope.charAt(0).toUpperCase() + currentLevel.scope.slice(1);

    const renderLevelContent = () => {
        if (currentLevel.joinedPartyId && currentLevel.joinedMembers) {
            // User has joined this level. Show the election screen.
            return (
                <div className="bg-bg-secondary p-5 rounded-[1.2rem] border border-border-primary mb-6">
                    <div className="mb-4">
                        <span className="text-xs uppercase tracking-wider font-bold text-[var(--iux-ochre)] bg-[var(--iux-ochre)]/10 px-2.5 py-1 rounded border border-[var(--iux-ochre)]/20">
                            {currentLevel.joinedPartyName}
                        </span>
                    </div>

                    <TrustSelectionScreen
                        partyId={currentLevel.joinedPartyId}
                        partyName={currentLevel.joinedPartyName!}
                        members={currentLevel.joinedMembers}
                        currentUserId={currentUserId}
                        votedFor={currentLevel.votedFor}
                        onVoteChange={handleNext}
                    />

                    {currentLevel.joinedMembers.length <= 1 && (
                        <div className="mt-4 pt-4 border-t border-border-primary text-center space-y-3">
                            <p className="text-sm text-text-muted">You are the first member here. Invite others later to start electing a voice!</p>
                            <button
                                onClick={handleNext}
                                className="btn btn-primary w-full"
                                disabled={finishing}
                            >
                                {finishing ? 'Finishing...' : 'Continue to next step'}
                            </button>
                        </div>
                    )}

                    {currentLevel.joinedMembers.length > 1 && (
                        <div className="mt-4 pt-4 border-t border-border-primary text-center space-y-2">
                            {currentLevel.votedFor && (
                                <button
                                    onClick={handleNext}
                                    className="btn btn-primary w-full"
                                    disabled={finishing}
                                >
                                    {finishing ? 'Finishing...' : isLastStep ? 'Finish' : 'Continue →'}
                                </button>
                            )}
                            <button
                                onClick={handleSkip}
                                className="btn btn-secondary w-full"
                                disabled={finishing}
                            >
                                {finishing ? 'Finishing...' : 'Skip for now'}
                            </button>
                        </div>
                    )}
                </div>
            );
        }

        // User hasn't joined this level yet.
        const canFindGroups = (currentLevel.scope === 'state' && currentLevel.userState) ||
                              (currentLevel.scope === 'district' && currentLevel.userState && currentLevel.userDistrict) ||
                              (currentLevel.scope === 'village' && currentLevel.userState && currentLevel.userDistrict && currentLevel.userVillage);

        if (!canFindGroups) {
            return (
                <div className="bg-bg-secondary p-8 text-center rounded-[1.2rem] border border-border-primary mb-6">
                    <p className="text-sm text-text-secondary mb-4">
                        You need to set your location profile to see groups at the {currentLevel.scope} level.
                    </p>
                    <button onClick={handleSkip} className="btn btn-secondary w-full" disabled={finishing}>
                        {finishing ? 'Finishing...' : 'Skip this step'}
                    </button>
                </div>
            );
        }

        const createGroupUrl = buildCreateGroupUrl(currentLevel, issueText, nationalId);

        return (
            <div className="bg-bg-secondary p-6 rounded-[1.2rem] border border-border-primary mb-6">
                <p className="text-sm text-text-secondary mb-6">
                    Join a group at the {currentLevel.scope} level to help elect its leader.
                </p>

                {joinError && <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{joinError}</div>}

                {currentLevel.availableGroups && currentLevel.availableGroups.length > 0 ? (
                    <>
                        <div className="space-y-3 mb-6">
                            {currentLevel.availableGroups.map((group: AvailableGroup) => (
                                <div key={group.partyId} className="rounded-xl border border-border-primary bg-bg-card p-4 transition-all hover:border-[var(--iux-ochre)]">
                                    <div className="flex justify-between items-start gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-text-primary text-sm">{group.partyName}</h3>
                                                {group.isFoundingGroup && (
                                                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--iux-ochre)] bg-[var(--iux-ochre)]/10 px-1.5 py-0.5 rounded border border-[var(--iux-ochre)]/20">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-text-muted mt-1">{group.memberCount} members</p>
                                        </div>
                                        <button
                                            onClick={() => handleJoinGroup(group.partyId)}
                                            disabled={joiningPartyId !== null}
                                            className="btn btn-primary btn-sm shrink-0 disabled:opacity-50"
                                        >
                                            {joiningPartyId === group.partyId ? 'Joining...' : 'Join Group'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-center space-y-3">
                            <button onClick={handleSkip} className="btn btn-secondary w-full" disabled={finishing}>
                                {finishing ? 'Finishing...' : 'Skip for now'}
                            </button>
                            <Link href={createGroupUrl} className="block text-xs text-text-muted underline">
                                Prefer a different approach? Start your own group here
                            </Link>
                        </div>
                    </>
                ) : (
                    <div className="text-center p-6 border border-dashed border-border-primary rounded-xl mb-6 space-y-4">
                        <p className="text-sm text-text-muted">No groups found at your {currentLevel.scope} level yet.</p>
                        <Link href={createGroupUrl} className="btn btn-primary btn-sm inline-block">
                            Start the founding group here
                        </Link>
                        <div>
                            <button onClick={handleSkip} className="text-xs text-text-muted underline" disabled={finishing}>
                                {finishing ? 'Finishing...' : 'Skip for now'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <section className="brand-surface min-h-[70vh]">
            <div className="container mx-auto px-4 py-10 sm:py-14 max-w-xl">
                <div className="brand-panel animate-fade-in p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <p className="brand-kicker">Local Group Setup • Step {currentStep + 1} of {levels.length}</p>
                            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mt-2" style={{ fontFamily: 'var(--font-display)' }}>
                                {stepLabel} Level
                            </h1>
                        </div>
                    </div>

                    {renderLevelContent()}

                    {/* Progress indicators */}
                    <div className="flex justify-center gap-1.5 mt-8">
                        {levels.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    i === currentStep ? 'w-6 bg-primary' : i < currentStep ? 'w-2 bg-primary/40' : 'w-2 bg-border-primary'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
