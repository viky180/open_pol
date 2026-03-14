"use client";

import Link from 'next/link';

const valueCards = [
    {
        eyebrow: 'Start here',
        title: 'Start from a real Indian civic problem',
        description:
            'Create around water supply, potholes, garbage, bus routes, school fees, college issues, jobs, or ward-level corruption instead of generic political debate.',
    },
    {
        eyebrow: 'Geography',
        title: 'Organize where power actually sits',
        description:
            'Find people by pincode and locality, then grow pressure through district, state, and India-wide layers only when the issue needs it.',
    },
    {
        eyebrow: 'Leadership',
        title: 'Democratically chosen and continuously accountable',
        description:
            'Members elect the person they trust and can withdraw that trust at any time. No permanent control, no hidden admin circle — the leader stays accountable or gets replaced.',
    },
    {
        eyebrow: 'Political career',
        title: 'Build a political career backed by real people',
        description:
            'If you want to enter politics, start here. Earn visible support from common people in your area, get funded by them directly, and build a track record of real local wins before scaling up.',
    },
    {
        eyebrow: 'Action',
        title: 'Turn agreement into coordinated action',
        description:
            'Use petitions, fundraising, events, and alliances to move from online agreement to coordinated public action with measurable support.',
    },
];

const useCases = ['Water and sanitation', 'Roads and transport', 'Jobs and local economy', 'Student and campus issues', 'Safety and policing', 'Ward and municipal accountability', 'Political career launchpad'];

export function LandingValueSection() {
    return (
        <section className="py-12 sm:py-16">
            <div className="editorial-page editorial-page--wide">
                <div className="mb-8 max-w-3xl">
                    <p className="brand-kicker">Why this matters in India</p>
                    <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
                        Organize the frustrated. Elect accountable leaders. Launch political careers.
                    </h2>
                    <p className="mt-3 text-base text-text-secondary">
                        Most political frustration in India stays scattered and powerless. Open Politics turns it into a structured group with a democratically chosen leader who stays continuously accountable to members.
                        And for those who want to make a career in politics — this is where you earn real backing from common people, not party gatekeepers.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {valueCards.map((card) => (
                        <article key={card.title} className="brand-panel p-5">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{card.eyebrow}</p>
                            <h3 className="mt-3 text-lg font-semibold text-text-primary">{card.title}</h3>
                            <p className="mt-3 text-sm leading-6 text-text-secondary">{card.description}</p>
                        </article>
                    ))}
                </div>

                <div className="mt-8 rounded-[1.75rem] border border-border-primary bg-bg-secondary/80 p-5 sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Common starting points</p>
                            <h3 className="mt-2 text-2xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                                Start with one issue people already feel every week
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">
                                The strongest groups usually begin with one specific issue, one geography, and one authority people want to pressure.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Link href="/discover" className="btn btn-secondary">
                                See active issues
                            </Link>
                            <Link href="/party/create" className="btn btn-primary">
                                Start your own group
                            </Link>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {useCases.map((item) => (
                            <span key={item} className="badge">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
