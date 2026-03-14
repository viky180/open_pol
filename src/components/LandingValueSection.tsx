"use client";

import Link from 'next/link';

const valueCards = [
    {
        eyebrow: 'Start here',
        title: 'Start with one real problem',
        description:
            'Pick something people in your area face every week — bad water, broken roads, school fees, jobs. One specific problem in one specific place is far easier to fix than vague national anger.',
    },
    {
        eyebrow: 'Geography',
        title: 'Organize where decisions are actually made',
        description:
            'Most problems are decided at the ward, district, or state level — not Delhi. Find people by pincode, organize locally first, then scale up only if the problem demands it.',
    },
    {
        eyebrow: 'Leadership',
        title: 'Elected leaders who can be removed',
        description:
            'Members vote for who leads them. They can take that vote back at any time. A leader who stops performing gets replaced. No permanent bosses, no hidden admin circle.',
    },
    {
        eyebrow: 'Political career',
        title: 'Earn support from people, not parties',
        description:
            'If you want to enter politics, build a track record of local wins first. Get funded by the people you serve. Show real numbers of real supporters — then you don\'t need a party gatekeeper to give you a ticket.',
    },
    {
        eyebrow: 'Action',
        title: 'Move from talking to doing',
        description:
            'Once people agree on a problem, coordinate: petitions, fundraising, public events. Build measurable pressure on the authority that can actually solve it.',
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
                        People have power when they're organized. Right now, they're not.
                    </h2>
                    <p className="mt-3 text-base text-text-secondary">
                        Most problems in India — bad roads, corrupt officials, no jobs — are not impossible to fix. They stay unsolved because the people affected are scattered. A single complaint gets ignored. A thousand organized people with a chosen leader get heard. That's the only thing Open Politics does.
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
            </div>
        </section>
    );
}
