"use client";

import Link from 'next/link';

interface LandingHeroProps {
    totalGroups: number;
    totalMembers: number;
    totalLocations: number;
}

export function LandingHero({ totalGroups, totalMembers, totalLocations }: LandingHeroProps) {
    return (
        <section className="brand-surface border-b border-border-primary/60">
            <div className="editorial-page editorial-page--wide py-10 sm:py-14">
                <div className="editorial-hero">
                    <p className="editorial-hero__eyebrow">Built for issue-based organizing in India</p>
                    <h1 className="editorial-hero__title">
                        Turn a local problem
                        <br />
                        into visible political pressure.
                    </h1>
                    <p className="editorial-hero__body">
                        Open Politics helps Indian citizens organize around real issues like water, roads, jobs, transport, safety, and local governance.
                        Start or join a group in your area, build support people can see, choose who represents your members, and scale from pincode to district to state without losing local control.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2 text-xs sm:text-sm">
                        <span className="issue-meta-chip">Pincode-based discovery</span>
                        <span className="issue-meta-chip">Issue groups, not party high command</span>
                        <span className="issue-meta-chip">Transparent support and trust</span>
                        <span className="issue-meta-chip">Petitions and funding</span>
                    </div>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                        <Link href="/discover" className="btn btn-secondary btn-lg">
                            Explore local groups
                        </Link>
                        <Link href="/party/create" className="btn btn-primary btn-lg">
                            Start an issue group
                        </Link>
                    </div>

                    <div className="editorial-metrics">
                        <div className="editorial-metric">
                            <div className="editorial-metric__value">{totalGroups.toLocaleString()}</div>
                            <div className="editorial-metric__label">Groups live</div>
                        </div>
                        <div className="editorial-metric">
                            <div className="editorial-metric__value">{totalMembers.toLocaleString()}</div>
                            <div className="editorial-metric__label">Citizens organizing</div>
                        </div>
                        <div className="editorial-metric">
                            <div className="editorial-metric__value">{totalLocations.toLocaleString()}</div>
                            <div className="editorial-metric__label">Places active</div>
                        </div>
                        <div className="editorial-metric">
                            <div className="editorial-metric__value">Local</div>
                            <div className="editorial-metric__label">Organize by issue</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
