"use client";

import Link from 'next/link';

interface LandingHeroProps {
    totalGroups: number;
    totalMembers: number;
    totalLocations: number;
}

export function LandingHero({ totalGroups, totalMembers, totalLocations }: LandingHeroProps) {
    void totalGroups;
    void totalMembers;
    void totalLocations;

    return (
        <section className="brand-surface">
            <div className="container mx-auto px-4 py-16 sm:py-24 max-w-5xl">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="brand-title">
                        Organize for power — without giving it away.
                    </h1>
                    <p className="mt-4 text-lg sm:text-xl text-text-secondary leading-relaxed">
                        Build local groups. Form coalitions. Scale from village to national.
                        <br />
                        Align when it makes sense. Walk away when it doesn’t.
                    </p>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/party/create" className="btn btn-primary btn-lg">
                        Start a Group
                    </Link>
                    <Link href="/discover" className="btn btn-secondary btn-lg">
                        Explore Movements
                    </Link>
                </div>

                <p className="mt-4 text-sm text-text-muted text-center">
                    No gatekeepers. No permanent loyalty. Only voluntary alignment.
                </p>
            </div>
        </section>
    );
}

