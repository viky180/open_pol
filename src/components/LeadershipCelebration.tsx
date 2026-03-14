'use client';

import { useEffect, useState } from 'react';
import { PartyPopper, Crown, X } from 'lucide-react';

type LeadershipCelebrationProps = {
    partyId: string;
    leaderName: string;
    isCurrentUserLeader: boolean;
};

const SEEN_KEY_PREFIX = 'openpolitics:leader_seen:';

/**
 * Celebratory banner with confetti when leadership changes.
 */
export function LeadershipCelebration({
    partyId,
    leaderName,
    isCurrentUserLeader,
}: LeadershipCelebrationProps) {
    const [show, setShow] = useState(false);
    const [confettiLoaded, setConfettiLoaded] = useState(false);

    useEffect(() => {
        // Check if we've already seen this leader
        const seenKey = `${SEEN_KEY_PREFIX}${partyId}`;
        try {
            const seenLeader = window.localStorage.getItem(seenKey);
            if (seenLeader !== leaderName) {
                // New leader! Show celebration
                setShow(true);
                window.localStorage.setItem(seenKey, leaderName);

                // Auto-dismiss after 8 seconds
                const timer = setTimeout(() => setShow(false), 8000);
                return () => clearTimeout(timer);
            }
        } catch {
            // Ignore localStorage errors
        }
    }, [partyId, leaderName]);

    // Load confetti dynamically
    useEffect(() => {
        if (!show) return;

        const loadConfetti = async () => {
            try {
                // Dynamically import canvas-confetti
                const confetti = (await import('canvas-confetti')).default;
                setConfettiLoaded(true);

                // Fire confetti!
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#6366f1', '#8b5cf6', '#a855f7', '#22c55e', '#eab308'],
                });

                // Second burst
                setTimeout(() => {
                    confetti({
                        particleCount: 50,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 },
                    });
                    confetti({
                        particleCount: 50,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 },
                    });
                }, 250);
            } catch {
                // canvas-confetti not installed, skip
                setConfettiLoaded(false);
            }
        };

        loadConfetti();
    }, [show]);

    if (!show) return null;

    return (
        <div className="mb-6 p-4 rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/10 to-primary/10 animate-fade-in">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Crown className="w-8 h-8 text-amber-500" />
                    <div>
                        {isCurrentUserLeader ? (
                            <>
                                <div className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    <PartyPopper className="w-5 h-5" /> You&apos;re now the leader!
                                </div>
                                <p className="text-sm text-text-secondary mt-1">
                                    As leader, you can manage this group&apos;s connections and represent your members.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="text-lg font-bold text-text-primary">
                                    {leaderName} is now leading this party!
                                </div>
                                <p className="text-sm text-text-secondary mt-1">
                                    Leadership is earned through member votes.
                                </p>
                            </>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setShow(false)}
                    className="text-text-muted hover:text-text-primary"
                    aria-label="Dismiss"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {!confettiLoaded && (
                <div className="mt-2 text-xs text-text-muted">
                    💡 Install <code>canvas-confetti</code> for celebration effects
                </div>
            )}
        </div>
    );
}
