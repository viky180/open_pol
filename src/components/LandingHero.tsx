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
                        Turn frustration into organized political power.
                    </h1>
                    <p className="editorial-hero__body">
                        Citizens unite around issues, elect leaders democratically, and hold them accountable — not political parties.
                        <br /><br />
                        Want to enter politics? Build real support from citizens who organize, back you, and fund your journey.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2 text-xs sm:text-sm">
                        <span className="issue-meta-chip">Frustration → organized group</span>
                        <span className="issue-meta-chip">Democratically chosen leaders</span>
                        <span className="issue-meta-chip">Continuous accountability</span>
                        <span className="issue-meta-chip">Funded by common people</span>
                    </div>

                    <div className="mt-7">
                        <Link href="/discover" className="btn btn-primary btn-lg">
                            Join a national group for your most pressing issue
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
