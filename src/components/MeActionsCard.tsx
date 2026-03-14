'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MeActionsCardProps {
    partyId: string;
    partyName: string;
}

export function MeActionsCard({ partyId, partyName }: MeActionsCardProps) {
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const router = useRouter();

    const handleExit = async () => {
        if (isLeaving) return;
        setIsLeaving(true);

        try {
            const response = await fetch(`/api/parties/${partyId}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedback: null }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error?.error || 'Unable to exit group');
            }

            router.refresh();
        } catch (error) {
            console.error('Exit group error:', error);
            alert(error instanceof Error ? error.message : 'Unable to exit group');
        } finally {
            setIsLeaving(false);
            setShowExitConfirm(false);
        }
    };

    return (
        <div className="card">
            <h2 className="text-sm font-semibold text-text-secondary mb-4">Actions</h2>
            <div className="flex flex-col gap-3">
                <Link href={`/group/${partyId}#leader-section`} className="btn btn-primary btn-sm">
                    Manage backing
                </Link>
                <button
                    type="button"
                    onClick={() => setShowExitConfirm(true)}
                    className="btn btn-secondary btn-sm text-text-muted hover:text-danger"
                >
                    Exit group
                </button>
            </div>

            <p className="text-xs text-text-muted mt-4">
                You are in control. Exiting removes your backing and voice immediately.
            </p>

            {showExitConfirm && (
                <div className="mt-4 rounded-xl border border-border-primary bg-bg-tertiary p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Exit confirmation</div>
                    <p className="text-sm text-text-secondary mt-2">
                        Exit {partyName}? You can join another group at any time.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-3">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                                setShowExitConfirm(false);
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleExit}
                            disabled={isLeaving}
                        >
                            {isLeaving ? 'Exiting...' : 'Confirm exit'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
