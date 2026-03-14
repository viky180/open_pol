"use client";

import Link from 'next/link';

interface GroupPreviewItem {
    id: string;
    name: string;
    memberCount: number;
    category: string;
}

interface GroupPreviewProps {
    groups: GroupPreviewItem[];
}

export function GroupPreview({ groups }: GroupPreviewProps) {
    if (groups.length === 0) {
        return (
            <section className="py-12 sm:py-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="empty-state">
                        <svg className="empty-state-icon mb-2 text-text-muted w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-text-primary">Be the first to start a movement</h3>
                        <p className="text-sm text-text-secondary max-w-sm mx-auto">
                            There are currently no active groups featured. Start your own group to begin organizing in your community.
                        </p>
                        <Link href="/group/create" className="btn btn-primary mt-4">
                            Start a Group
                        </Link>
                    </div>
                </div>
            </section>
        );
    }

    const displayGroups = groups.slice(0, 4);

    return (
        <section className="py-12 sm:py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-10">
                    <p className="brand-kicker">Live organizing</p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                        Active issue groups across India
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-sm text-text-secondary">
                        Join a group already gathering support, or study how others are organizing around concrete issues before starting your own.
                    </p>
                </div>

                <div className="space-y-3">
                    {displayGroups.map((group, index) => (
                        <Link
                            key={group.id}
                            href={`/group/${group.id}`}
                            className="brand-panel flex items-center gap-4 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"
                        >
                            <div className="h-11 w-11 shrink-0 rounded-full border border-border-primary bg-bg-tertiary flex items-center justify-center text-xs font-semibold text-text-muted">
                                {String(index + 1).padStart(2, '0')}
                            </div>

                            <div className="flex-1 min-w-0 text-left">
                                <h3 className="font-semibold text-text-primary truncate">{group.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                                    <span className="uppercase tracking-[0.1em]">{group.category}</span>
                                    <span className="h-1 w-1 rounded-full bg-border-secondary" />
                                    <span>{group.memberCount.toLocaleString()} members</span>
                                </div>
                            </div>

                            <span className="text-sm font-medium text-primary">View</span>
                        </Link>
                    ))}
                </div>

                <div className="text-center mt-8">
                    <Link href="/discover" className="btn btn-secondary">
                        Browse all groups
                    </Link>
                </div>
            </div>
        </section>
    );
}
