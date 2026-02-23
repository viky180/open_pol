"use client";

import { useState } from 'react';
import Link from 'next/link';
import { loadProgressiveDisclosureState, type ProgressiveStage } from '@/lib/progressiveDisclosure';

interface HeroSectionProps {
    totalParties: number;
    totalMembers: number;
    totalPincodes: number;
}

/**
 * Simplified hero section with progressive disclosure.
 * First-time users see minimal CTAs; returning users see more options.
 */
export function HeroSection({ totalParties, totalMembers, totalPincodes }: HeroSectionProps) {
    const [stage] = useState<ProgressiveStage>(() => loadProgressiveDisclosureState().stage);
    const [showMoreOptions, setShowMoreOptions] = useState(false);

    const isFirstTime = stage === 'first_time';
    const showStats = !isFirstTime;

    return (
        <>
            {/* Hero Section */}
            <div className="text-center mb-10 sm:mb-12 px-5 py-8 sm:p-12 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 rounded-2xl border border-border-primary backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">
                    Fluid groups, real power
                </p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent tracking-tight">
                    {isFirstTime
                        ? "Start or Join \u2014 Groups That Move"
                        : "Your Groups, Always in Motion"}
                </h1>
                <p className="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8">
                    {isFirstTime
                        ? "Create a group, attach it to a bigger movement, or go independent anytime. Your group is never locked in."
                        : "Attach, detach, reorganize. Your groups move with your priorities \u2014 no central authority, no permanent structures."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-xs">
                    <span className="rounded-full border border-border-primary bg-bg-secondary px-3 py-1 text-text-secondary">Create</span>
                    <span className="text-text-muted">-&gt;</span>
                    <span className="rounded-full border border-border-primary bg-bg-secondary px-3 py-1 text-text-secondary">Attach</span>
                    <span className="text-text-muted">-&gt;</span>
                    <span className="rounded-full border border-border-primary bg-bg-secondary px-3 py-1 text-text-secondary">Detach</span>
                    <span className="text-text-muted">-&gt;</span>
                    <span className="rounded-full border border-border-primary bg-bg-secondary px-3 py-1 text-text-secondary">Reattach</span>
                </div>

                {/* Primary CTAs - Simplified for first-time users */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <Link
                        href="#party-list"
                        className="btn btn-primary btn-lg shadow-xl shadow-primary/20"
                        onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('party-list')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                    >
                        👋 Explore Movements
                    </Link>
                    <Link href="/party/create" className="btn btn-secondary btn-lg">
                        + Start a Flexible Group
                    </Link>
                </div>

                {/* Learn More - Collapsible for first-time users */}
                {isFirstTime && (
                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={() => setShowMoreOptions(!showMoreOptions)}
                            className="text-sm text-text-muted hover:text-text-secondary inline-flex items-center gap-1"
                        >
                            {showMoreOptions ? '▲' : '▼'} Learn more
                        </button>

                        {showMoreOptions && (
                            <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center animate-fade-in">
                                <a
                                    href="/example-indore-water.html"
                                    className="inline-flex items-center gap-2 text-sm text-secondary hover:text-secondary-dark"
                                >
                                    📍 See a real example
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Show use case link for returning users */}
                {!isFirstTime && (
                    <>
                        <div className="mt-6 pt-6 border-t border-border-primary/50">
                            <a
                                href="/example-indore-water.html"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-lg text-secondary hover:bg-secondary/20 transition-all group"
                            >
                                <span className="text-lg">📍</span>
                                <span className="font-medium">Real Use Case: Indore Drinking Water Crisis</span>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </a>
                        </div>
                    </>
                )}
            </div>

            {/* Stats - Only for returning users */}
            {showStats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="stat-card group hover:scale-[1.02] transition-transform">
                        <div className="stat-value text-primary group-hover:text-primary-dark transition-colors">{totalParties}</div>
                        <div className="stat-label">Issue-Parties</div>
                    </div>
                    <div className="stat-card group hover:scale-[1.02] transition-transform">
                        <div className="stat-value text-accent group-hover:text-accent-dark transition-colors">
                            {totalMembers}
                        </div>
                        <div className="stat-label">Total Members</div>
                    </div>
                    <div className="stat-card group hover:scale-[1.02] transition-transform">
                        <div className="stat-value text-secondary group-hover:text-secondary-dark transition-colors">
                            {totalPincodes}
                        </div>
                        <div className="stat-label">Pincodes Covered</div>
                    </div>
                </div>
            )}
        </>
    );
}
