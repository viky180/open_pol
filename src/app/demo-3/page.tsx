'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/* ------------------------------------------------------------------ */
/*  data                                                               */
/* ------------------------------------------------------------------ */

const localProblems = [
    { emoji: '👩‍🎓', label: 'Youth unemployment in districts' },
    { emoji: '🔧', label: 'Skill mismatch in cities' },
    { emoji: '📝', label: 'Contract worker exploitation' },
    { emoji: '🏠', label: 'Migration + housing stress' },
    { emoji: '🏭', label: 'MSME hiring slowdown' },
    { emoji: '💰', label: 'Local corruption in job schemes' },
];

const localGroups = [
    { id: 'g1', name: 'Unemployed Youths \u2013 Koramangala', members: 142, verified: true },
    { id: 'g2', name: 'Job Scam Victims \u2013 Gaya', members: 89, verified: true },
    { id: 'g3', name: 'MSME Hiring Crisis \u2013 Surat', members: 206, verified: true },
    { id: 'g4', name: 'Migrant Workers Support \u2013 Delhi', members: 174, verified: true },
];

const districtCoalitions = [
    { id: 'd1', name: 'Bihar Employment Coalition (Gaya District Unit)', groups: 14, members: 1240 },
    { id: 'd2', name: 'Bengaluru Employment Coalition (Urban Unit)', groups: 22, members: 2870 },
    { id: 'd3', name: 'Surat MSME Jobs Coalition', groups: 11, members: 980 },
];

const stateCoalitions = [
    { id: 's1', name: 'Karnataka Employment Coalition', districts: 8, members: 18400, groups: 94 },
    { id: 's2', name: 'Bihar Employment Coalition', districts: 12, members: 24600, groups: 132 },
    { id: 's3', name: 'Gujarat Employment Coalition', districts: 6, members: 11200, groups: 67 },
    { id: 's4', name: 'Maharashtra Employment Coalition', districts: 10, members: 21800, groups: 118 },
];

const policies = [
    { emoji: '📊', title: 'District Employment Heatmap', desc: 'Real-time dashboard of unemployment pain points from group reports', group: 'Data Working Group', target: '100% district coverage' },
    { emoji: '🎯', title: 'Skill-to-Job Matching by Locality', desc: 'Not generic "skills," but local employer demand mapping', group: 'Skills Mapping Cell', target: '50 districts in 60 days' },
    { emoji: '🏭', title: 'MSME Hiring Fast-Track', desc: 'Faster credit + simplified compliance for MSMEs that hire locally', group: 'MSME Taskforce', target: '10,000 new hires / quarter' },
    { emoji: '🚨', title: 'Anti-Scam Cell', desc: 'Verified scam reports aggregated from victim groups', group: 'Scam Victims Network', target: 'Response within 48 hours' },
    { emoji: '🏠', title: 'Migration Support Protocol', desc: 'Housing + documentation support for migrant workers', group: 'Migrant Support Coalition', target: '5 state hubs operational' },
];

interface StateMapEntry { id: string; name: string; short: string; groups: number; members: number }

const stateMapData: StateMapEntry[] = [
    { id: 'ka', name: 'Karnataka', short: 'KA', groups: 94, members: 18400 },
    { id: 'bh', name: 'Bihar', short: 'BR', groups: 132, members: 24600 },
    { id: 'gj', name: 'Gujarat', short: 'GJ', groups: 67, members: 11200 },
    { id: 'mh', name: 'Maharashtra', short: 'MH', groups: 118, members: 21800 },
    { id: 'dl', name: 'Delhi', short: 'DL', groups: 45, members: 8300 },
    { id: 'up', name: 'Uttar Pradesh', short: 'UP', groups: 156, members: 29100 },
    { id: 'tn', name: 'Tamil Nadu', short: 'TN', groups: 78, members: 14500 },
    { id: 'rj', name: 'Rajasthan', short: 'RJ', groups: 62, members: 10800 },
    { id: 'wb', name: 'West Bengal', short: 'WB', groups: 54, members: 9200 },
    { id: 'ap', name: 'Andhra Pradesh', short: 'AP', groups: 49, members: 8700 },
];

const timelineSnapshots = [
    { month: 1, localGroups: 120, districtCoalitions: 0, stateCoalitions: 0, nationalWinner: false },
    { month: 2, localGroups: 340, districtCoalitions: 6, stateCoalitions: 0, nationalWinner: false },
    { month: 3, localGroups: 580, districtCoalitions: 18, stateCoalitions: 0, nationalWinner: false },
    { month: 4, localGroups: 810, districtCoalitions: 32, stateCoalitions: 4, nationalWinner: false },
    { month: 5, localGroups: 1050, districtCoalitions: 46, stateCoalitions: 7, nationalWinner: false },
    { month: 6, localGroups: 1320, districtCoalitions: 58, stateCoalitions: 11, nationalWinner: false },
    { month: 7, localGroups: 1580, districtCoalitions: 64, stateCoalitions: 14, nationalWinner: false },
    { month: 8, localGroups: 1800, districtCoalitions: 68, stateCoalitions: 16, nationalWinner: false },
    { month: 9, localGroups: 2040, districtCoalitions: 72, stateCoalitions: 18, nationalWinner: true },
];

const forkSteps = [
    { id: 1, title: 'Coalition proposes policy change', desc: 'The national coalition leadership proposes diluting MSME hiring incentives to redirect funds.', status: 'warning' as const },
    { id: 2, title: '3 MSME groups object & fork', desc: '"Surat MSME Jobs Coalition", "Pune MSME Network", and "Coimbatore Manufacturing Forum" withdraw from the coalition.', status: 'danger' as const },
    { id: 3, title: 'Coalition loses majority', desc: 'With 3 key groups gone, NEC drops below 50% verified membership. It is no longer the governing coalition.', status: 'danger' as const },
    { id: 4, title: 'Policy corrected, groups return', desc: 'To regain majority, NEC reverses the dilution. Two of three groups rejoin. One stays independent.', status: 'success' as const },
];

const steps: { id: StepId; title: string; subtitle: string; label: string }[] = [
    { id: 1, title: 'The Problem', subtitle: 'Employment was many local issues, not one national slogan', label: '01' },
    { id: 2, title: 'Hyper-Local Groups', subtitle: 'Thousands of micro-movements \u2014 each real, each measurable', label: '02' },
    { id: 3, title: 'District Coalitions', subtitle: 'Groups that grow together \u2014 and can walk away', label: '03' },
    { id: 4, title: 'State Coalitions', subtitle: 'Seamless scaling from local to national', label: '04' },
    { id: 5, title: 'National Coalition', subtitle: 'Coalition-building never stops', label: '05' },
    { id: 6, title: 'The Minister Emerges', subtitle: 'The best person leads, not the biggest ego', label: '06' },
    { id: 7, title: 'First 100 Days', subtitle: 'Grassroots minister means practical policy', label: '07' },
    { id: 8, title: 'The Safety Valve', subtitle: 'Join freely. Leave freely.', label: '08' },
    { id: 9, title: 'Interactive Demos', subtitle: 'Coalition map, timeline, and fork simulation', label: '09' },
    { id: 10, title: 'The Outcome', subtitle: 'India grew an Employment Minister \u2014 organically', label: '10' },
];

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function getRatio(value: number, total: number): number {
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, (value / total) * 100));
}

/* ------------------------------------------------------------------ */
/*  component                                                          */
/* ------------------------------------------------------------------ */

export default function DemoPageThree() {
    const [currentStep, setCurrentStep] = useState<StepId>(1);
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [timelineMonth, setTimelineMonth] = useState(1);
    const [forkStep, setForkStep] = useState(0);

    const progress = useMemo(() => getRatio(currentStep, steps.length), [currentStep]);
    const snapshot = timelineSnapshots[timelineMonth - 1];
    const selectedStateData = stateMapData.find((s) => s.id === selectedState);

    return (
        <section className="brand-surface min-h-screen">
            <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-10">
                {/* Header */}
                <div className="brand-panel p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link href="/demo-2" className="text-sm text-text-muted hover:text-primary transition-colors">
                            {'<-'} Back to Demo 2
                        </Link>
                        <Link href="/" className="text-sm text-text-muted hover:text-primary transition-colors">
                            Home
                        </Link>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="brand-kicker">Interactive Demo 3</p>
                            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mt-4" style={{ fontFamily: 'var(--font-display)' }}>
                                How India Got Its First Organic Employment Minister
                            </h1>
                            <p className="text-sm sm:text-base text-text-secondary mt-2 max-w-2xl">
                                Not appointed by high command. Not bought by money. Chosen by the largest verified coalition of real members &mdash; built from local employment issue groups across India.
                            </p>
                        </div>
                        <div className="rounded-xl border border-border-primary bg-bg-secondary px-4 py-3 min-w-44">
                            <div className="text-xs uppercase tracking-[0.14em] text-text-muted">Step Progress</div>
                            <div className="text-xl font-semibold text-text-primary mt-1">{currentStep} / {steps.length}</div>
                        </div>
                    </div>

                    <div className="mt-5 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Step tabs */}
                <div className="mt-4 brand-panel p-2 sm:p-3 overflow-x-auto">
                    <div className="flex gap-2 w-max min-w-full">
                        {steps.map((item) => {
                            const active = item.id === currentStep;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setCurrentStep(item.id)}
                                    className={`rounded-lg px-3 py-2 text-left transition-colors border min-w-40 ${active
                                        ? 'bg-primary/10 border-primary text-text-primary'
                                        : 'bg-bg-secondary border-border-primary text-text-muted hover:text-text-primary hover:border-primary/50'
                                        }`}
                                >
                                    <div className="text-[11px] uppercase tracking-[0.16em]">{item.label}</div>
                                    <div className="font-semibold text-sm mt-1">{item.title}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Step content */}
                <div className="mt-4 brand-panel p-5 sm:p-6 animate-fade-in" key={currentStep}>
                    <div className="mb-6 pb-5 border-b border-border-primary">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Current step</p>
                        <h2 className="text-2xl font-bold text-text-primary mt-2" style={{ fontFamily: 'var(--font-display)' }}>
                            {steps[currentStep - 1].title}
                        </h2>
                        <p className="text-text-secondary mt-2">{steps[currentStep - 1].subtitle}</p>
                    </div>

                    {/* Step 1 — The Problem */}
                    {currentStep === 1 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <h3 className="font-semibold text-text-primary">India&apos;s employment issue wasn&apos;t one issue.</h3>
                                <p className="text-sm text-text-secondary mt-2">
                                    Traditional parties tried one-size-fits-all slogans. People wanted local control + national power. So they started where pain was real: local groups.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {localProblems.map((p) => (
                                    <div key={p.label} className="rounded-xl border border-border-primary bg-bg-card p-4 flex items-start gap-3">
                                        <span className="text-2xl">{p.emoji}</span>
                                        <p className="text-sm font-medium text-text-primary">{p.label}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                                <p className="text-sm text-text-secondary">
                                    People wanted <span className="font-semibold text-text-primary">local control</span> + <span className="font-semibold text-text-primary">national power</span>.
                                </p>
                                <p className="text-sm text-primary font-medium mt-2">So they started where pain was real: local groups.</p>
                            </div>
                        </div>
                    )}

                    {/* Step 2 — Hyper-local Groups */}
                    {currentStep === 2 && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {localGroups.map((g) => (
                                    <article key={g.id} className="rounded-xl border border-border-primary bg-bg-card p-4">
                                        <div className="flex items-center justify-between text-xs text-text-muted">
                                            <span className="badge bg-success/10 text-success border-success/20">&#10003; Verified</span>
                                            <span>{g.members} members</span>
                                        </div>
                                        <h3 className="mt-3 font-semibold text-text-primary">{g.name}</h3>
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
                                            <span className="badge">One purpose</span>
                                            <span className="badge">Local leadership</span>
                                            <span className="badge">Free to merge / leave</span>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <h4 className="font-semibold text-text-primary">Each group has:</h4>
                                <ul className="mt-2 space-y-1.5 text-sm text-text-secondary">
                                    <li>&#10003; Verified members</li>
                                    <li>&#10003; One purpose</li>
                                    <li>&#10003; Local leadership via trust/votes</li>
                                    <li>&#10003; Freedom to merge, stay independent, or leave anytime</li>
                                </ul>
                            </div>

                            <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 text-center">
                                <p className="text-sm text-text-secondary">Result: <span className="font-semibold text-text-primary">thousands of micro-movements</span> &mdash; each real, each measurable.</p>
                                <Link href="/party/create" className="btn btn-primary mt-4">
                                    Create a group in your locality
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Step 3 — District Coalitions */}
                    {currentStep === 3 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    Local groups discovered each other through <span className="font-medium text-text-primary">&quot;Related groups&quot; suggestions</span>, merge invitations, and shared demands (minimum common agenda).
                                </p>
                            </div>

                            <div className="space-y-3">
                                {districtCoalitions.map((c) => (
                                    <article key={c.id} className="rounded-xl border border-border-primary bg-bg-card p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-semibold text-text-primary">{c.name}</h3>
                                                <p className="text-sm text-text-muted mt-1">{c.groups} local groups merged</p>
                                            </div>
                                            <span className="text-lg font-bold text-primary">{c.members.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="mt-3 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${getRatio(c.members, 3000)}%` }} />
                                        </div>
                                    </article>
                                ))}
                            </div>

                            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                                <p className="text-sm font-semibold text-accent">Key rule: No permanent lock-in.</p>
                                <p className="text-sm text-text-secondary mt-1">
                                    If a coalition drifts, any group can fork and leave. This prevents capture.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 4 — State Coalitions */}
                    {currentStep === 4 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    District coalitions joined into state-wide coalitions &mdash; keeping their original local groups intact, their own identity + local priorities, and their right to exit.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {stateCoalitions.map((sc) => (
                                    <article key={sc.id} className="rounded-xl border border-border-primary bg-bg-card p-4">
                                        <h3 className="font-semibold text-text-primary">{sc.name}</h3>
                                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                            <div className="rounded-lg bg-bg-secondary p-2">
                                                <div className="text-lg font-bold text-text-primary">{sc.districts}</div>
                                                <div className="text-[10px] uppercase text-text-muted">Districts</div>
                                            </div>
                                            <div className="rounded-lg bg-bg-secondary p-2">
                                                <div className="text-lg font-bold text-text-primary">{sc.groups}</div>
                                                <div className="text-[10px] uppercase text-text-muted">Groups</div>
                                            </div>
                                            <div className="rounded-lg bg-primary/10 p-2">
                                                <div className="text-lg font-bold text-primary">{(sc.members / 1000).toFixed(1)}k</div>
                                                <div className="text-[10px] uppercase text-primary">Members</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            <span className="badge">&#10003; Identity preserved</span>
                                            <span className="badge">&#10003; Right to exit</span>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-4 text-center">
                                <p className="text-sm text-text-secondary">Each state coalition gained:</p>
                                <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm font-medium text-text-primary">
                                    <span>Larger membership weight</span>
                                    <span>Negotiating power</span>
                                    <span>Visibility + legitimacy</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5 — National Coalition */}
                    {currentStep === 5 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    When enough states aligned on a shared national employment blueprint, they created a living coalition of coalitions.
                                </p>
                            </div>

                            <div className="rounded-xl border-2 border-primary bg-primary/5 p-6 text-center">
                                <p className="text-xs uppercase tracking-[0.14em] text-primary">The winner</p>
                                <h3 className="text-2xl font-bold text-text-primary mt-2">The National Employment Coalition (NEC)</h3>
                                <p className="text-sm text-text-secondary mt-3 max-w-lg mx-auto">
                                    A living coalition of coalitions &mdash; built from verified members across India.
                                </p>
                                <div className="mt-5 grid grid-cols-3 gap-3 max-w-md mx-auto">
                                    <div className="rounded-lg bg-bg-card p-3 border border-border-primary">
                                        <div className="text-2xl font-bold text-text-primary">18</div>
                                        <div className="text-[10px] uppercase text-text-muted">States</div>
                                    </div>
                                    <div className="rounded-lg bg-bg-card p-3 border border-border-primary">
                                        <div className="text-2xl font-bold text-text-primary">72</div>
                                        <div className="text-[10px] uppercase text-text-muted">Districts</div>
                                    </div>
                                    <div className="rounded-lg bg-bg-card p-3 border border-border-primary">
                                        <div className="text-2xl font-bold text-primary">1.6L+</div>
                                        <div className="text-[10px] uppercase text-primary font-medium">Verified</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                                <p className="text-sm text-text-secondary">
                                    On Open Politics, the governing coalition at each level is the one that represents the <span className="font-semibold text-accent">largest active membership</span> at that scope.
                                </p>
                                <p className="text-sm text-text-secondary mt-2">
                                    No speeches required. The numbers + verified membership made the outcome obvious.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 6 — Minister Emerges */}
                    {currentStep === 6 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    Inside the winning coalition (NEC), leadership selection followed the platform rule: members (or coalition delegates) chose the Employment Minister based on <span className="font-medium text-text-primary">active trust + performance</span>.
                                </p>
                            </div>

                            <div className="rounded-xl border border-success/30 bg-success/10 p-5 text-center">
                                <p className="text-xs uppercase tracking-[0.14em] text-success">Selected by trust</p>
                                <h3 className="text-2xl font-bold text-text-primary mt-2">India&apos;s First Organic Employment Minister</h3>
                                <p className="text-sm text-text-secondary mt-3 max-w-lg mx-auto">
                                    This person wasn&apos;t &quot;selected by party boss.&quot; They were the most trusted operational leader across the coalition.
                                </p>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h4 className="font-semibold text-text-primary mb-3">Why &quot;Organic&quot;?</h4>
                                <div className="space-y-2 text-sm text-text-secondary">
                                    <div className="flex items-start gap-3 rounded-lg bg-bg-secondary p-3 border border-border-primary">
                                        <span className="text-lg">🌱</span>
                                        <div><span className="font-medium text-text-primary">Born from ground truth</span> &mdash; emerged from local groups</div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-lg bg-bg-secondary p-3 border border-border-primary">
                                        <span className="text-lg">&#10003;</span>
                                        <div><span className="font-medium text-text-primary">Selected by verified people</span> &mdash; not TV influence</div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-lg bg-bg-secondary p-3 border border-border-primary">
                                        <span className="text-lg">🔄</span>
                                        <div><span className="font-medium text-text-primary">Replaceable anytime</span> &mdash; trust expires / coalition can shift</div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-lg bg-bg-secondary p-3 border border-border-primary">
                                        <span className="text-lg">📊</span>
                                        <div><span className="font-medium text-text-primary">Accountable continuously</span> &mdash; not every 5 years</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 7 — First 100 Days */}
                    {currentStep === 7 && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    Because the minister came from grassroots, policy became practical. Every initiative has a responsible working group, measurable targets, and member feedback loops.
                                </p>
                            </div>

                            {policies.map((pol) => (
                                <article key={pol.title} className="rounded-xl border border-border-primary bg-bg-card p-4">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{pol.emoji}</span>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-text-primary">{pol.title}</h3>
                                            <p className="text-sm text-text-secondary mt-1">{pol.desc}</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span className="badge bg-accent/10 text-accent border-accent/20">{pol.group}</span>
                                                <span className="badge">Target: {pol.target}</span>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {/* Step 8 — Safety Valve */}
                    {currentStep === 8 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    If NEC stops serving people, any part of the coalition can leave. Leadership can&apos;t ignore smaller groups.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-center">
                                    <div className="text-2xl mb-2">🚪</div>
                                    <p className="text-sm font-medium text-text-primary">A state coalition can exit</p>
                                </div>
                                <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-center">
                                    <div className="text-2xl mb-2">🔀</div>
                                    <p className="text-sm font-medium text-text-primary">A district can fork</p>
                                </div>
                                <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-center">
                                    <div className="text-2xl mb-2">👋</div>
                                    <p className="text-sm font-medium text-text-primary">A local group can walk away</p>
                                </div>
                            </div>

                            <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 text-center">
                                <p className="text-lg font-bold text-text-primary">Power is always rented, never owned.</p>
                                <p className="text-sm text-text-secondary mt-2">
                                    That&apos;s the core protection. This is why it doesn&apos;t become another party.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 9 — Interactive Demos */}
                    {currentStep === 9 && (
                        <div className="space-y-8">
                            {/* A) Coalition Map */}
                            <div>
                                <h3 className="text-lg font-semibold text-text-primary mb-4">A) Coalition Map</h3>
                                <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                    <p className="text-sm text-text-muted mb-4">Click a state to see coalition membership details</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                        {stateMapData.map((st) => (
                                            <button
                                                key={st.id}
                                                type="button"
                                                onClick={() => setSelectedState(st.id)}
                                                className={`rounded-lg p-3 text-center transition-all border ${selectedState === st.id
                                                    ? 'bg-primary/10 border-primary ring-2 ring-primary/20 scale-105'
                                                    : 'bg-bg-card border-border-primary hover:border-primary/50 hover:scale-[1.02]'
                                                    }`}
                                            >
                                                <div className="text-lg font-bold text-text-primary">{st.short}</div>
                                                <div className="text-[10px] text-text-muted mt-1 truncate">{st.name}</div>
                                            </button>
                                        ))}
                                    </div>
                                    {selectedStateData && (
                                        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 animate-fade-in">
                                            <h4 className="font-semibold text-text-primary">{selectedStateData.name}</h4>
                                            <div className="mt-3 grid grid-cols-2 gap-3">
                                                <div className="rounded-lg bg-bg-card p-3 border border-border-primary text-center">
                                                    <div className="text-xl font-bold text-text-primary">{selectedStateData.groups}</div>
                                                    <div className="text-[10px] uppercase text-text-muted">Local Groups</div>
                                                </div>
                                                <div className="rounded-lg bg-bg-card p-3 border border-border-primary text-center">
                                                    <div className="text-xl font-bold text-primary">{selectedStateData.members.toLocaleString('en-IN')}</div>
                                                    <div className="text-[10px] uppercase text-primary font-medium">Members</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* B) Timeline Slider */}
                            <div>
                                <h3 className="text-lg font-semibold text-text-primary mb-4">B) Timeline Slider</h3>
                                <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                    <div className="flex items-center justify-between text-sm text-text-muted mb-2">
                                        <span>Month 1</span>
                                        <span className="font-semibold text-text-primary">Month {timelineMonth}</span>
                                        <span>Month 9</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={9}
                                        value={timelineMonth}
                                        onChange={(e) => setTimelineMonth(Number(e.target.value))}
                                        className="w-full accent-[var(--color-primary)] cursor-pointer"
                                    />
                                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="rounded-lg bg-bg-card p-3 border border-border-primary text-center">
                                            <div className="text-2xl font-bold text-text-primary">{snapshot.localGroups.toLocaleString()}</div>
                                            <div className="text-[10px] uppercase text-text-muted">Local Groups</div>
                                        </div>
                                        <div className="rounded-lg bg-bg-card p-3 border border-border-primary text-center">
                                            <div className="text-2xl font-bold text-text-primary">{snapshot.districtCoalitions}</div>
                                            <div className="text-[10px] uppercase text-text-muted">District Coalitions</div>
                                        </div>
                                        <div className="rounded-lg bg-bg-card p-3 border border-border-primary text-center">
                                            <div className="text-2xl font-bold text-text-primary">{snapshot.stateCoalitions}</div>
                                            <div className="text-[10px] uppercase text-text-muted">State Coalitions</div>
                                        </div>
                                        <div className={`rounded-lg p-3 border text-center ${snapshot.nationalWinner ? 'bg-success/10 border-success/30' : 'bg-bg-card border-border-primary'}`}>
                                            <div className={`text-2xl font-bold ${snapshot.nationalWinner ? 'text-success' : 'text-text-muted'}`}>
                                                {snapshot.nationalWinner ? '✓' : '\u2014'}
                                            </div>
                                            <div className={`text-[10px] uppercase ${snapshot.nationalWinner ? 'text-success' : 'text-text-muted'}`}>National Winner</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* C) Fork Event Simulation */}
                            <div>
                                <h3 className="text-lg font-semibold text-text-primary mb-4">C) Fork Event Simulation</h3>
                                <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                    <p className="text-sm text-text-muted mb-4">Click through a dramatic &quot;exit power&quot; moment:</p>
                                    {forkStep === 0 ? (
                                        <button type="button" onClick={() => setForkStep(1)} className="btn btn-primary">
                                            Start Simulation
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            {forkSteps.filter((fs) => fs.id <= forkStep).map((fs) => {
                                                const colors = {
                                                    warning: 'border-warning/40 bg-warning/10',
                                                    danger: 'border-danger/40 bg-danger/10',
                                                    success: 'border-success/40 bg-success/10',
                                                };
                                                return (
                                                    <div key={fs.id} className={`rounded-xl border p-4 animate-fade-in ${colors[fs.status]}`}>
                                                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">Event {fs.id}</span>
                                                        <h4 className="font-semibold text-text-primary mt-2">{fs.title}</h4>
                                                        <p className="text-sm text-text-secondary mt-1">{fs.desc}</p>
                                                    </div>
                                                );
                                            })}
                                            <div className="flex gap-3 mt-2">
                                                {forkStep < 4 && (
                                                    <button type="button" onClick={() => setForkStep((prev) => prev + 1)} className="btn btn-primary btn-sm">
                                                        Next Event &rarr;
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => setForkStep(0)} className="btn btn-secondary btn-sm">
                                                    Reset
                                                </button>
                                            </div>
                                            {forkStep === 4 && (
                                                <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 mt-2 text-center animate-fade-in">
                                                    <p className="text-sm font-semibold text-accent">
                                                        Exit power is real. The ability to leave keeps leadership honest.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 10 — Closing */}
                    {currentStep === 10 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border-2 border-primary bg-primary/5 p-6 text-center">
                                <h3 className="text-2xl font-bold text-text-primary">
                                    India didn&apos;t &quot;elect&quot; an Employment Minister.
                                </h3>
                                <p className="text-2xl font-bold text-primary mt-2">India grew one.</p>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-5">
                                <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-text-primary">
                                    <span className="badge">Village</span>
                                    <span className="text-text-muted">&rarr;</span>
                                    <span className="badge">Ward</span>
                                    <span className="text-text-muted">&rarr;</span>
                                    <span className="badge">District</span>
                                    <span className="text-text-muted">&rarr;</span>
                                    <span className="badge">State</span>
                                    <span className="text-text-muted">&rarr;</span>
                                    <span className="badge bg-primary/10 text-primary border-primary/30">National</span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-5">
                                <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-text-primary">
                                    <span className="badge">Real people</span>
                                    <span className="text-text-muted">&rarr;</span>
                                    <span className="badge">Real groups</span>
                                    <span className="text-text-muted">&rarr;</span>
                                    <span className="badge">Real coalitions</span>
                                    <span className="text-text-muted">&rarr;</span>
                                    <span className="badge bg-success/10 text-success border-success/20">Real leadership</span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-5 text-center">
                                <h4 className="text-xl font-bold text-text-primary">Ready to get started?</h4>
                                <p className="text-text-secondary mt-2">Join citizens organising around local employment issues.</p>
                                <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
                                    <Link href="/party/create" className="btn btn-primary btn-lg shadow-lg shadow-primary/20">
                                        Start a Local Employment Group
                                    </Link>
                                    <Link href="/discover" className="btn btn-secondary btn-lg">
                                        See How Coalitions Work
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step navigation */}
                    <div className="mt-8 pt-5 border-t border-border-primary flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1) as StepId)}
                            disabled={currentStep === 1}
                            className="btn btn-secondary disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <div className="flex gap-1.5">
                            {steps.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setCurrentStep(item.id)}
                                    className={`w-2.5 h-2.5 rounded-full ${item.id === currentStep ? 'bg-primary' : 'bg-border-secondary hover:bg-text-muted'}`}
                                    aria-label={`Go to step ${item.id}`}
                                />
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setCurrentStep((prev) => Math.min(steps.length, prev + 1) as StepId)}
                            disabled={currentStep === steps.length}
                            className="btn btn-primary disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
