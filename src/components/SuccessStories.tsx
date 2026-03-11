"use client";

import Link from 'next/link';

interface SuccessStory {
    id: string;
    title: string;
    outcome: string;
    memberCount: number;
    daysToWin: number;
    location: string;
}

const HARDCODED_STORIES: SuccessStory[] = [
    {
        id: '1',
        title: 'Clean Water for Jaipur',
        outcome: 'Municipal corporation approved a new filtration plant',
        memberCount: 847,
        daysToWin: 45,
        location: 'Jaipur, Rajasthan',
    },
    {
        id: '2',
        title: 'Traffic Safety in HSR Layout',
        outcome: 'Speed breakers and pedestrian crossings were installed',
        memberCount: 234,
        daysToWin: 28,
        location: 'Bengaluru, Karnataka',
    },
    {
        id: '3',
        title: 'Save Aarey Forest',
        outcome: 'Metro route plan was adjusted to preserve tree cover',
        memberCount: 12500,
        daysToWin: 180,
        location: 'Mumbai, Maharashtra',
    },
    {
        id: '4',
        title: 'Pune Water Groups Reorganize',
        outcome: 'Three neighborhood water groups detached, reorganized by ward, and won separate pipeline approvals',
        memberCount: 1420,
        daysToWin: 90,
        location: 'Pune, Maharashtra',
    },
];

export function SuccessStories() {
    return (
        <section className="py-16 bg-bg-secondary border-y border-border-primary">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-12">
                    <p className="brand-kicker">Verified Outcomes</p>
                    <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                        Local groups that moved policy
                    </h2>
                    <p className="text-text-secondary max-w-2xl mx-auto mt-3">
                        Open Politics is designed for measurable local wins. Group flexibility — attaching, detaching, reorganizing — is part of why these campaigns succeeded.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {HARDCODED_STORIES.map((story) => (
                        <article
                            key={story.id}
                            className="brand-panel p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40"
                        >
                            <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Case {story.id}</p>
                            <h3 className="font-semibold text-text-primary mt-2 leading-snug min-h-[44px]">{story.title}</h3>
                            <p className="text-sm text-text-secondary mt-2 min-h-[66px]">{story.outcome}</p>

                            <div className="mt-4 pt-4 border-t border-border-primary space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-text-muted">Members</span>
                                    <span className="font-semibold text-primary">{story.memberCount.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-text-muted">Time to outcome</span>
                                    <span className="font-semibold text-text-primary">{story.daysToWin} days</span>
                                </div>
                                <div className="text-xs text-text-muted pt-1">{story.location}</div>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="text-center mt-10">
                    <Link href="/discover" className="btn btn-primary">
                        Start a flexible campaign
                    </Link>
                </div>
            </div>
        </section>
    );
}
