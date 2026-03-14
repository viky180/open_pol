"use client";

import { type KeyboardEventHandler } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface YourRepresentationCardProps {
    membership: {
        partyId: string;
        partyName: string;
        leaderName: string | null;
        trustExpiresInDays: number | null;
    } | null;
}

export function YourRepresentationCard({ membership }: YourRepresentationCardProps) {
    const router = useRouter();

    const handleCardNavigation = () => {
        if (membership?.partyId) {
            router.push(`/group/${membership.partyId}`);
            return;
        }
        router.push('/discover');
    };

    const handleCardKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardNavigation();
        }
    };

    if (!membership) {
        return (
            <div
                className="card-glass relative overflow-hidden group cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={handleCardNavigation}
                onKeyDown={handleCardKeyDown}
                aria-label="Find and join a group"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5 opacity-50" />

                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left p-2">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-bg-tertiary to-white border border-white/60 flex items-center justify-center text-xs font-semibold text-text-secondary shadow-sm group-hover:scale-105 transition-transform duration-300">
                        YOU
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-text-primary">
                            You haven&apos;t joined a group yet
                        </h2>
                        <p className="text-sm text-text-secondary mt-1 max-w-md">
                            Find a group for an issue you care about and make your voice heard.
                        </p>
                    </div>
                    <Link
                        href="/discover"
                        onClick={(event) => event.stopPropagation()}
                        className="btn btn-primary"
                    >
                        Find a Group
                    </Link>
                </div>
            </div>
        );
    }

    const { partyId, partyName, leaderName, trustExpiresInDays } = membership;

    return (
        <div
            className="card-glass group border-primary/10 hover:border-primary/30 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={handleCardNavigation}
            onKeyDown={handleCardKeyDown}
            aria-label={`Open your group ${partyName}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none opacity-50 group-hover:opacity-80 transition-opacity duration-300" />

            <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/10">
                                Your Voice
                            </span>
                        </div>

                        <h2 className="text-2xl font-bold text-text-primary leading-tight mb-2">
                            {partyName}
                        </h2>

                        {leaderName ? (
                            <div className="flex items-center gap-3 text-sm text-text-secondary bg-white/40 w-fit px-3 py-1.5 rounded-lg border border-white/50">
                                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
                                    L
                                </span>
                                <span>
                                    Voice: <span className="font-semibold text-text-primary">{leaderName}</span>
                                </span>
                            </div>
                        ) : (
                            <p className="text-sm text-text-muted italic px-2">
                                No voice chosen yet — be the first to back someone
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                        {trustExpiresInDays !== null && (
                            <div className={`
                                flex flex-col items-end px-3 py-2 rounded-xl border
                                ${trustExpiresInDays < 3
                                    ? 'bg-danger/5 border-danger/20'
                                    : 'bg-white/40 border-white/50'
                                }
                            `}>
                                <span className="text-[10px] uppercase tracking-wide text-text-muted font-medium">Renew in</span>
                                <span className={`text-lg font-bold font-mono leading-none mt-0.5 ${trustExpiresInDays < 3 ? 'text-danger' : 'text-primary'}`}>
                                    {trustExpiresInDays}d
                                </span>
                            </div>
                        )}
                    </div>
                </div>



                <div className="mt-4 flex items-center justify-end">
                    <Link
                        href={`/group/${partyId}`}
                        onClick={(event) => event.stopPropagation()}
                        className="text-sm font-semibold text-primary/80 hover:text-primary transition-all flex items-center gap-1.5 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-lg"
                    >
                        Go to group
                        <span>&gt;</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
