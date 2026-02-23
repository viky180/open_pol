"use client";

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LandingHeroProps {
    totalGroups: number;
    totalMembers: number;
    totalLocations: number;
}

export function LandingHero({ totalGroups, totalMembers, totalLocations }: LandingHeroProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [animatedMembers, setAnimatedMembers] = useState(0);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const target = totalMembers;
        const duration = 1500;
        const steps = 30;
        const increment = target / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                setAnimatedMembers(target);
                clearInterval(timer);
            } else {
                setAnimatedMembers(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [totalMembers]);

    useEffect(() => {
        router.prefetch('/discover');
    }, [router]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        const url = trimmed
            ? `/discover?q=${encodeURIComponent(trimmed)}`
            : '/discover';

        startTransition(() => {
            router.push(url);
        });
    };

    return (
        <section className="brand-surface">
            <div className="container mx-auto px-4 py-12 sm:py-20 max-w-5xl">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="brand-title">
                        Groups that grow together — and can walk away
                    </h1>
                    <p className="mt-4 text-lg sm:text-xl text-text-secondary leading-relaxed">
                        Start a group, join a bigger coalition, or go independent anytime. Your group, your choice.
                    </p>
                    <p className="mt-3 text-sm text-text-muted">
                        Groups form coalitions and split when they disagree — from village to national level.
                    </p>
                </div>

                <div className="brand-panel mt-8 p-5 sm:p-6 max-w-3xl mx-auto">
                    <form onSubmit={handleSearch} className="space-y-3">
                        <div className="relative group">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for an issue: water, roads, schools"
                                className="w-full px-5 py-4 pr-32 rounded-xl bg-white border border-border-primary text-base text-text-primary placeholder:text-text-muted shadow-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isPending}
                                className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary px-5 py-2.5 rounded-lg font-semibold"
                            >
                                {isPending ? 'Finding...' : 'Search'}
                            </button>
                        </div>
                        <p className="text-sm text-text-muted">Try: clean water, traffic safety, local schools, electricity cuts.</p>
                    </form>
                </div>

                <div className="brand-panel mt-6 p-5 sm:p-6 max-w-3xl mx-auto">
                    <div className="grid grid-cols-3 gap-4 text-left">
                        <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Members</p>
                            <p className="text-3xl sm:text-4xl font-bold text-primary mt-1 tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                                {animatedMembers.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Groups</p>
                            <p className="text-3xl sm:text-4xl font-bold text-accent mt-1 tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                                {totalGroups}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Locations</p>
                            <p className="text-3xl sm:text-4xl font-bold text-text-primary mt-1 tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                                {totalLocations}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/auth" className="btn btn-secondary btn-lg">
                        Sign in
                    </Link>
                    <Link href="/discover" className="btn btn-ghost btn-lg">
                        Browse groups
                    </Link>
                </div>
            </div>
        </section>
    );
}

