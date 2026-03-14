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
                        Turn frustrated citizens
                        <br />
                        into an organized political force.
                    </h1>
                    <p className="editorial-hero__body">
                        Channel scattered frustration into a structured group with a democratically chosen leader who stays continuously accountable to members — not to a party. And if you want to build a career in politics, this is where real common people back you and fund you.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2 text-xs sm:text-sm">
                        <span className="issue-meta-chip">Frustration → organized group</span>
                        <span className="issue-meta-chip">Democratically chosen leaders</span>
                        <span className="issue-meta-chip">Continuous accountability</span>
                        <span className="issue-meta-chip">Funded by common people</span>
                    </div>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                        <Link href="/discover" className="btn btn-primary btn-lg">
                            Find your local group
                        </Link>
                        <Link href="/party/create" className="btn btn-secondary btn-lg">
                            Start an issue group
                        </Link>
                    </div>
                    <p className="mt-3 text-sm text-white/60">Join free. One group per level. Change your mind any time.</p>

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
                            <div className="editorial-metric__value">₹0</div>
                            <div className="editorial-metric__label">Free to organize</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
