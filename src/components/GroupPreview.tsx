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
        return null;
    }

    const displayGroups = groups.slice(0, 4);

    return (
        <section className="py-12 sm:py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                        Active Groups
                    </h2>
                </div>

                <div className="space-y-3">
                    {displayGroups.map((group, index) => (
                        <Link
                            key={group.id}
                            href={`/party/${group.id}`}
                            className="brand-panel flex items-center gap-4 p-4 transition-colors hover:border-primary/40"
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
                        See all groups
                    </Link>
                </div>
            </div>
        </section>
    );
}
