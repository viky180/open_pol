'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/* ------------------------------------------------------------------ */
/*  data                                                               */
/* ------------------------------------------------------------------ */

const employmentProblems = [
    { emoji: '👩‍🎓', label: 'Youth unemployment across districts' },
    { emoji: '🛵', label: 'Gig workers with no protections' },
    { emoji: '🏭', label: 'MSME hiring slowdown & closures' },
    { emoji: '🌾', label: 'Rural job schemes leaking to corruption' },
    { emoji: '🏙️', label: 'Migrant workers exploited in cities' },
    { emoji: '📝', label: 'Contract work replacing permanent jobs' },
];

const nationalGroups = [
    {
        id: 'nerg',
        emoji: '🏛️',
        name: 'National Employment Reform Group',
        focus: 'Labour law reform & worker rights',
        members: 182400,
        leader: 'Sunita Rao',
        agenda: 'Fix labour law loopholes exploited by corporates',
    },
    {
        id: 'yjm',
        emoji: '🎓',
        name: 'Youth Jobs Movement',
        focus: 'Youth employment & skilling programs',
        members: 241600,
        leader: 'Arjun Mehta',
        agenda: 'Create 10 lakh new jobs through skilling + MSME support',
    },
    {
        id: 'rea',
        emoji: '🌾',
        name: 'Rural Employment Alliance',
        focus: 'Rural jobs & MNREGA accountability',
        members: 198200,
        leader: 'Priya Devi',
        agenda: 'Strengthen rural employment with transparent wage delivery',
    },
];

/* Groups a user can join in Jharkhand under "Youth Jobs Movement" */
const stateGroupsJH = [
    { id: 'jyjf', name: 'Jharkhand Youth Jobs Forum', members: 5200, leader: 'Arjun Mehta', focus: 'Skilling + industrial jobs' },
    { id: 'jeag', name: 'Jharkhand Employment Action Group', members: 4100, leader: 'Neha Singh', focus: 'Labour rights & minimum wage' },
    { id: 'jyon', name: 'Jharkhand Youth Opportunity Network', members: 3100, leader: 'Ravi Kumar', focus: 'Startup & self-employment' },
];

/* Groups a user can join in Ranchi district under "Jharkhand Youth Jobs Forum" */
const districtGroupsRanchi = [
    { id: 'ryeg', name: 'Ranchi Youth Employment Group', members: 1840, leader: 'Pooja Sharma', focus: 'MSME hiring & apprenticeships' },
    { id: 'reja', name: 'Ranchi Employment Justice Alliance', members: 1320, leader: 'Ajay Verma', focus: 'Contract worker protections' },
    { id: 'rskg', name: 'Ranchi Skill & Jobs Group', members: 980, leader: 'Divya Tiwari', focus: 'Vocational training centres' },
];

/* Groups a user can join in Kanke village under "Ranchi Youth Employment Group" */
const villageGroupsKanke = [
    { id: 'kyec', name: 'Kanke Ward Youth Employment Circle', members: 64, leader: 'Kavita Devi', focus: 'Youth skill training in ward' },
    { id: 'kmsg', name: 'Kanke MSME Support Group', members: 41, leader: 'Ranjit Kumar', focus: 'Micro-loans for small traders' },
];

/* Candidates inside Kanke Ward Youth Employment Circle — members vote for their group leader */
const villageLeaderCandidates = [
    { id: 'vl1', name: 'Kavita Devi', agenda: 'Set up youth skill training centre in Kanke ward', votes: 0 },
    { id: 'vl2', name: 'Ranjit Kumar', agenda: 'Street vendor support & MSME micro-loan scheme', votes: 0 },
    { id: 'vl3', name: 'Sunita Gupta', agenda: 'Anti-job-scam monitoring cell for the ward', votes: 0 },
];

/* Candidates inside Ranchi Youth Employment Group — district group members vote for their leader */
const districtLeaderCandidates = [
    { id: 'dl1', name: 'Pooja Sharma', agenda: 'MSME hiring fast-track + apprenticeship drive', votes: 0 },
    { id: 'dl2', name: 'Ajay Verma', agenda: 'Enforce contract worker minimum wage in all Ranchi factories', votes: 0 },
    { id: 'dl3', name: 'Rahul Sinha', agenda: 'Vocational training centres in each Ranchi block', votes: 0 },
];

/* State alliances — each state's winning group and their leader */
const stateAllianceData = [
    { id: 'jh', name: 'Jharkhand', short: 'JH', winningGroup: 'Jharkhand Youth Jobs Forum', leader: 'Arjun Mehta', districts: 6, members: 12400 },
    { id: 'up', name: 'Uttar Pradesh', short: 'UP', winningGroup: 'UP Youth Employment Movement', leader: 'Meena Yadav', districts: 14, members: 62800 },
    { id: 'bh', name: 'Bihar', short: 'BR', winningGroup: 'Bihar Jobs Action Forum', leader: 'Suresh Prasad', districts: 11, members: 48200 },
    { id: 'mh', name: 'Maharashtra', short: 'MH', winningGroup: 'Maharashtra Youth Jobs Council', leader: 'Rahul Patil', districts: 10, members: 41600 },
    { id: 'tn', name: 'Tamil Nadu', short: 'TN', winningGroup: 'Tamil Nadu Jobs Forum', leader: 'Lakshmi Iyer', districts: 8, members: 29400 },
    { id: 'ka', name: 'Karnataka', short: 'KA', winningGroup: 'Karnataka Youth Employment Group', leader: 'Vivek Rao', districts: 7, members: 24200 },
];

/* National group candidates for shadow minister */
const shadowCandidates = [
    {
        id: 'yjm',
        emoji: '🎓',
        name: 'Arjun Mehta',
        nationalGroup: 'Youth Jobs Movement',
        platform: 'Skilling + MSME jobs — 10 lakh new jobs in 18 months',
        totalMembers: 241600,
        votes: 0,
    },
    {
        id: 'rea',
        emoji: '🌾',
        name: 'Priya Devi',
        nationalGroup: 'Rural Employment Alliance',
        platform: 'Rural MNREGA overhaul — transparent wage delivery to 2 crore workers',
        totalMembers: 198200,
        votes: 0,
    },
    {
        id: 'nerg',
        emoji: '🏛️',
        name: 'Sunita Rao',
        nationalGroup: 'National Employment Reform Group',
        platform: 'Labour law reform — enforceable worker protections in 6 months',
        totalMembers: 182400,
        votes: 0,
    },
];

const accountabilityEvents = [
    {
        id: 1,
        title: 'Shadow minister takes contradictory position',
        desc: 'Arjun Mehta publicly supports a policy that restricts gig worker protections — contradicting the mandate of 22 gig worker groups in Maharashtra and Karnataka.',
        status: 'warning' as const,
    },
    {
        id: 2,
        title: 'Members shift to competing groups',
        desc: '840 members leave "Youth Jobs Movement" state groups and join the "National Employment Reform Group" state groups in their states. Village and district group membership counts change.',
        status: 'danger' as const,
    },
    {
        id: 3,
        title: 'Youth Jobs Movement is no longer the largest national group',
        desc: 'With 840 members gone, YJM drops below NERG in total verified membership. NERG is now the largest national group. Its leader, Sunita Rao, becomes the new Shadow Minister.',
        status: 'danger' as const,
    },
    {
        id: 4,
        title: 'Arjun Mehta reverses his stance',
        desc: 'To win members back, Arjun Mehta publicly withdraws the contradictory position. 620 of 840 members return. YJM regains the lead. Leadership accountability worked — without any election.',
        status: 'success' as const,
    },
];

const steps: { id: StepId; title: string; subtitle: string; label: string }[] = [
    { id: 1, title: 'The Issue', subtitle: 'Employment means different things to different people', label: '01' },
    { id: 2, title: 'National Groups Compete', subtitle: 'Multiple groups per issue — pick your movement', label: '02' },
    { id: 3, title: 'Join Your Local Groups', subtitle: 'Choose one group at each level in your area', label: '03' },
    { id: 4, title: 'Vote for Your Leader', subtitle: 'Members vote for the leader of their own group', label: '04' },
    { id: 5, title: 'Winning Group at Each Level', subtitle: 'Most members = winning group = that level\'s leader', label: '05' },
    { id: 6, title: 'State Level Winner', subtitle: 'The state group with most members leads the state', label: '06' },
    { id: 7, title: 'National Level Winner', subtitle: 'The national group with most members wins overall', label: '07' },
    { id: 8, title: 'Shadow Minister Chosen', subtitle: 'The winning national group\'s leader is shadow minister', label: '08' },
    { id: 9, title: 'Accountability in Action', subtitle: 'Members can shift groups anytime — power follows membership', label: '09' },
    { id: 10, title: 'The Outcome', subtitle: 'A shadow minister earned from the village up', label: '10' },
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

export default function DemoPageFour() {
    const [currentStep, setCurrentStep] = useState<StepId>(1);

    /* Step 2 */
    const [selectedNationalGroup, setSelectedNationalGroup] = useState<string | null>(null);

    /* Step 3 — user picks their group at each level */
    const [selectedStateGroup, setSelectedStateGroup] = useState<string | null>(null);
    const [selectedDistrictGroup, setSelectedDistrictGroup] = useState<string | null>(null);
    const [selectedVillageGroup, setSelectedVillageGroup] = useState<string | null>(null);

    /* Step 4 — votes for village group leader & district group leader */
    const [villageVotes, setVillageVotes] = useState<Record<string, number>>({ vl1: 0, vl2: 0, vl3: 0 });
    const [districtVotes, setDistrictVotes] = useState<Record<string, number>>({ dl1: 0, dl2: 0, dl3: 0 });

    /* Step 9 */
    const [accountabilityStep, setAccountabilityStep] = useState(0);

    const progress = useMemo(() => getRatio(currentStep, steps.length), [currentStep]);

    const villageRanked = useMemo(
        () => villageLeaderCandidates.map((c) => ({ ...c, votes: villageVotes[c.id] ?? 0 })).sort((a, b) => b.votes - a.votes),
        [villageVotes]
    );
    const totalVillageVotes = useMemo(() => Object.values(villageVotes).reduce((s, v) => s + v, 0), [villageVotes]);

    const districtRanked = useMemo(
        () => districtLeaderCandidates.map((c) => ({ ...c, votes: districtVotes[c.id] ?? 0 })).sort((a, b) => b.votes - a.votes),
        [districtVotes]
    );
    const totalDistrictVotes = useMemo(() => Object.values(districtVotes).reduce((s, v) => s + v, 0), [districtVotes]);

    const totalStateMembers = stateAllianceData.reduce((s, st) => s + st.members, 0);

    return (
        <section className="brand-surface min-h-screen">
            <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-10">
                {/* Header */}
                <div className="brand-panel p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link href="/demo-3" className="text-sm text-text-muted hover:text-primary transition-colors">
                            {'<-'} Back to Demo 3
                        </Link>
                        <Link href="/" className="text-sm text-text-muted hover:text-primary transition-colors">
                            Home
                        </Link>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="brand-kicker">Interactive Demo 4</p>
                            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mt-4" style={{ fontFamily: 'var(--font-display)' }}>
                                How India&apos;s Shadow Employment Minister Is Chosen
                            </h1>
                            <p className="text-sm sm:text-base text-text-secondary mt-2 max-w-2xl">
                                Not appointed by a party. Not elected once in five years. The national group with the most verified members wins &mdash; and its internally elected leader becomes shadow minister.
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

                    {/* Step 1 — The Issue */}
                    {currentStep === 1 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <h3 className="font-semibold text-text-primary">Employment isn&apos;t one issue. It&apos;s thousands of local realities.</h3>
                                <p className="text-sm text-text-secondary mt-2">
                                    Traditional parties address employment with a single national slogan. This platform lets people organise around the specific employment problem in their own village, district, and state &mdash; and builds national leadership from that ground truth.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {employmentProblems.map((p) => (
                                    <div key={p.label} className="rounded-xl border border-border-primary bg-bg-card p-4 flex items-start gap-3">
                                        <span className="text-2xl">{p.emoji}</span>
                                        <p className="text-sm font-medium text-text-primary">{p.label}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                                <p className="text-sm font-semibold text-text-primary mb-3">How leadership emerges on this platform:</p>
                                <div className="space-y-2 text-sm text-text-secondary">
                                    <div className="flex items-start gap-2 p-2 rounded-lg bg-bg-card border border-border-primary">
                                        <span className="font-bold text-primary shrink-0">1.</span>
                                        <span>Multiple <span className="font-medium text-text-primary">national groups</span> compete for the employment issue. You join one.</span>
                                    </div>
                                    <div className="flex items-start gap-2 p-2 rounded-lg bg-bg-card border border-border-primary">
                                        <span className="font-bold text-primary shrink-0">2.</span>
                                        <span>You also join one group at your <span className="font-medium text-text-primary">state, district, and village</span> level &mdash; chosen from competing options.</span>
                                    </div>
                                    <div className="flex items-start gap-2 p-2 rounded-lg bg-bg-card border border-border-primary">
                                        <span className="font-bold text-primary shrink-0">3.</span>
                                        <span>Inside each group, members <span className="font-medium text-text-primary">vote for a leader</span>. The group with the most members at each level wins that level.</span>
                                    </div>
                                    <div className="flex items-start gap-2 p-2 rounded-lg bg-bg-card border border-border-primary">
                                        <span className="font-bold text-primary shrink-0">4.</span>
                                        <span>The <span className="font-medium text-text-primary">winning national group&apos;s leader</span> becomes the Shadow Employment Minister.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2 — National Groups Compete */}
                    {currentStep === 2 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    For the <span className="font-medium text-text-primary">Employment</span> issue, multiple national groups exist and compete by offering different leadership and approaches. A user can join <span className="font-semibold text-text-primary">only one</span> national group per issue.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {nationalGroups.map((g) => {
                                    const selected = selectedNationalGroup === g.id;
                                    return (
                                        <article
                                            key={g.id}
                                            className={`rounded-xl border p-5 transition-all ${selected
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                : 'border-border-primary bg-bg-card hover:border-primary/50 hover:scale-[1.01]'
                                                }`}
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-3xl">{g.emoji}</span>
                                                    <div>
                                                        <h3 className="font-semibold text-text-primary">{g.name}</h3>
                                                        <p className="text-sm text-text-muted mt-0.5">{g.focus}</p>
                                                        <p className="text-sm text-text-secondary mt-1.5 italic">&quot;{g.agenda}&quot;</p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="text-lg font-bold text-primary">{(g.members / 1000).toFixed(1)}k</div>
                                                    <div className="text-[10px] uppercase text-text-muted">Members</div>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedNationalGroup(g.id)}
                                                    className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-secondary'}`}
                                                >
                                                    {selected ? '✓ Joined' : 'Join this movement'}
                                                </button>
                                                {selected && (
                                                    <span className="badge bg-success/10 text-success border-success/20 animate-fade-in">
                                                        Your national group
                                                    </span>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>

                            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                                <p className="text-sm font-semibold text-accent">One national group per issue.</p>
                                <p className="text-sm text-text-secondary mt-1">
                                    After joining, you then separately choose one group in your state, district, and village. Those are all separate choices &mdash; explained in the next step.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3 — Join Your Local Groups */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    After joining &quot;Youth Jobs Movement&quot; nationally, you choose <span className="font-medium text-text-primary">one group at each level</span> within your geographic area. These are separate choices &mdash; there are competing groups at every level.
                                </p>
                                <p className="text-sm text-text-muted mt-2">
                                    Example: User in <span className="font-medium text-text-primary">Kanke ward, Ranchi, Jharkhand</span>
                                </p>
                            </div>

                            {/* State */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">🗺️</span>
                                    <h3 className="font-semibold text-text-primary">Choose your State Group</h3>
                                    <span className="text-xs text-text-muted">(Jharkhand, under Youth Jobs Movement)</span>
                                </div>
                                <div className="space-y-2">
                                    {stateGroupsJH.map((g, idx) => {
                                        const sel = selectedStateGroup === g.id;
                                        return (
                                            <div
                                                key={g.id}
                                                className={`rounded-xl border p-4 transition-all ${sel ? 'border-primary bg-primary/5' : 'border-border-primary bg-bg-card hover:border-primary/40'}`}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            {idx === 0 && <span className="badge bg-primary/10 text-primary border-primary/30 text-[10px]">Largest</span>}
                                                            <span className="font-medium text-text-primary">{g.name}</span>
                                                        </div>
                                                        <p className="text-xs text-text-muted mt-0.5">{g.focus}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <div className="text-base font-bold text-text-primary">{g.members.toLocaleString('en-IN')}</div>
                                                            <div className="text-[10px] uppercase text-text-muted">Members</div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedStateGroup(g.id)}
                                                            className={`btn btn-sm ${sel ? 'btn-primary' : 'btn-secondary'}`}
                                                        >
                                                            {sel ? '✓ Joined' : 'Join'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-2 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${getRatio(g.members, 5200)}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* District */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">🏙️</span>
                                    <h3 className="font-semibold text-text-primary">Choose your District Group</h3>
                                    <span className="text-xs text-text-muted">(Ranchi, under Jharkhand Youth Jobs Forum)</span>
                                </div>
                                <div className="space-y-2">
                                    {districtGroupsRanchi.map((g, idx) => {
                                        const sel = selectedDistrictGroup === g.id;
                                        return (
                                            <div
                                                key={g.id}
                                                className={`rounded-xl border p-4 transition-all ${sel ? 'border-primary bg-primary/5' : 'border-border-primary bg-bg-card hover:border-primary/40'}`}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            {idx === 0 && <span className="badge bg-primary/10 text-primary border-primary/30 text-[10px]">Largest</span>}
                                                            <span className="font-medium text-text-primary">{g.name}</span>
                                                        </div>
                                                        <p className="text-xs text-text-muted mt-0.5">{g.focus}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <div className="text-base font-bold text-text-primary">{g.members.toLocaleString('en-IN')}</div>
                                                            <div className="text-[10px] uppercase text-text-muted">Members</div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedDistrictGroup(g.id)}
                                                            className={`btn btn-sm ${sel ? 'btn-primary' : 'btn-secondary'}`}
                                                        >
                                                            {sel ? '✓ Joined' : 'Join'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-2 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${getRatio(g.members, 1840)}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Village */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">🏘️</span>
                                    <h3 className="font-semibold text-text-primary">Choose your Village Group</h3>
                                    <span className="text-xs text-text-muted">(Kanke ward, under Ranchi Youth Employment Group)</span>
                                </div>
                                <div className="space-y-2">
                                    {villageGroupsKanke.map((g, idx) => {
                                        const sel = selectedVillageGroup === g.id;
                                        return (
                                            <div
                                                key={g.id}
                                                className={`rounded-xl border p-4 transition-all ${sel ? 'border-primary bg-primary/5' : 'border-border-primary bg-bg-card hover:border-primary/40'}`}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            {idx === 0 && <span className="badge bg-primary/10 text-primary border-primary/30 text-[10px]">Largest</span>}
                                                            <span className="font-medium text-text-primary">{g.name}</span>
                                                        </div>
                                                        <p className="text-xs text-text-muted mt-0.5">{g.focus}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <div className="text-base font-bold text-text-primary">{g.members}</div>
                                                            <div className="text-[10px] uppercase text-text-muted">Members</div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedVillageGroup(g.id)}
                                                            className={`btn btn-sm ${sel ? 'btn-primary' : 'btn-secondary'}`}
                                                        >
                                                            {sel ? '✓ Joined' : 'Join'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-2 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${getRatio(g.members, 64)}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                                <p className="text-sm font-semibold text-accent">You now belong to 4 groups:</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                                    <span className="badge">🌍 National group</span>
                                    <span className="badge">🗺️ State group (your choice)</span>
                                    <span className="badge">🏙️ District group (your choice)</span>
                                    <span className="badge">🏘️ Village group (your choice)</span>
                                </div>
                                <p className="text-xs text-text-muted mt-2">Inside each group, you vote for its leader. The group with most members at each level is the winning group for that level.</p>
                            </div>
                        </div>
                    )}

                    {/* Step 4 — Vote for Your Leader */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    Inside each group, members vote for a leader. Whoever gets the most votes leads that group. This happens <span className="font-medium text-text-primary">independently at every level</span> &mdash; village group members vote for their village group leader, district group members vote for their district group leader, and so on.
                                </p>
                            </div>

                            {/* Village group leader election */}
                            <div>
                                <h3 className="text-base font-semibold text-text-primary mb-1">
                                    🏘️ Inside &quot;Kanke Ward Youth Employment Circle&quot; (64 members)
                                </h3>
                                <p className="text-sm text-text-muted mb-3">Village group members vote for their group leader:</p>
                                <div className="space-y-3">
                                    {villageRanked.map((c, idx) => {
                                        const isLeader = idx === 0 && c.votes > 0;
                                        return (
                                            <article key={c.id} className={`rounded-xl border p-4 transition-all ${isLeader ? 'border-success/40 bg-success/5' : 'border-border-primary bg-bg-card'}`}>
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {isLeader && <span className="badge bg-success/10 text-success border-success/20">&#10003; Leading</span>}
                                                            <span className="font-semibold text-text-primary">{c.name}</span>
                                                        </div>
                                                        <p className="text-sm text-text-secondary mt-1">{c.agenda}</p>
                                                        <div className="mt-3 flex items-center gap-3">
                                                            <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-300 ${isLeader ? 'bg-success' : 'bg-primary'}`}
                                                                    style={{ width: `${getRatio(c.votes, Math.max(totalVillageVotes, 1))}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm font-semibold text-text-primary w-8 text-right">{c.votes}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setVillageVotes((prev) => ({ ...prev, [c.id]: (prev[c.id] ?? 0) + 1 }))}
                                                        className="btn btn-secondary btn-sm shrink-0"
                                                    >
                                                        Vote
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                                {totalVillageVotes > 0 && (
                                    <div className="mt-3 rounded-xl border border-success/30 bg-success/5 p-3 text-center animate-fade-in">
                                        <p className="text-sm text-text-secondary">Village group leader: <span className="font-semibold text-text-primary">{villageRanked[0].name}</span> with {villageRanked[0].votes} votes</p>
                                    </div>
                                )}
                            </div>

                            {/* District group leader election */}
                            <div>
                                <h3 className="text-base font-semibold text-text-primary mb-1">
                                    🏙️ Inside &quot;Ranchi Youth Employment Group&quot; (1,840 members)
                                </h3>
                                <p className="text-sm text-text-muted mb-3">District group members vote for their group leader — independently of village results:</p>
                                <div className="space-y-3">
                                    {districtRanked.map((c, idx) => {
                                        const isLeader = idx === 0 && c.votes > 0;
                                        return (
                                            <article key={c.id} className={`rounded-xl border p-4 transition-all ${isLeader ? 'border-success/40 bg-success/5' : 'border-border-primary bg-bg-card'}`}>
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {isLeader && <span className="badge bg-success/10 text-success border-success/20">&#10003; Leading</span>}
                                                            <span className="font-semibold text-text-primary">{c.name}</span>
                                                        </div>
                                                        <p className="text-sm text-text-secondary mt-1">{c.agenda}</p>
                                                        <div className="mt-3 flex items-center gap-3">
                                                            <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-300 ${isLeader ? 'bg-success' : 'bg-primary'}`}
                                                                    style={{ width: `${getRatio(c.votes, Math.max(totalDistrictVotes, 1))}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm font-semibold text-text-primary w-8 text-right">{c.votes}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDistrictVotes((prev) => ({ ...prev, [c.id]: (prev[c.id] ?? 0) + 1 }))}
                                                        className="btn btn-secondary btn-sm shrink-0"
                                                    >
                                                        Vote
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                                {totalDistrictVotes > 0 && (
                                    <div className="mt-3 rounded-xl border border-success/30 bg-success/5 p-3 text-center animate-fade-in">
                                        <p className="text-sm text-text-secondary">District group leader: <span className="font-semibold text-text-primary">{districtRanked[0].name}</span> with {districtRanked[0].votes} votes</p>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                                <p className="text-sm font-semibold text-accent">Each level elects independently.</p>
                                <p className="text-sm text-text-secondary mt-1">
                                    Village group members vote for their village leader. District group members vote for their district leader. The two elections are separate. Leadership at one level does not automatically determine leadership at another.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 5 — Winning Group at Each Level */}
                    {currentStep === 5 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    At each level, there are multiple competing groups. The group with the <span className="font-medium text-text-primary">most members</span> is the <span className="font-semibold text-text-primary">winning group</span> for that level. Its internally elected leader becomes the level&apos;s representative leader.
                                </p>
                            </div>

                            {/* Village level */}
                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h3 className="text-sm font-semibold text-text-primary mb-3">🏘️ Village Level — Kanke Ward</h3>
                                <div className="space-y-2">
                                    {villageGroupsKanke.map((g, idx) => (
                                        <div key={g.id} className={`rounded-lg p-3 border flex items-center justify-between gap-3 ${idx === 0 ? 'border-success/40 bg-success/5' : 'border-border-primary bg-bg-secondary'}`}>
                                            <div className="flex items-center gap-2">
                                                {idx === 0 && <span className="badge bg-success/10 text-success border-success/20 text-[10px]">&#10003; Winner</span>}
                                                <span className="text-sm font-medium text-text-primary">{g.name}</span>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="font-bold text-text-primary">{g.members}</span>
                                                <span className="text-xs text-text-muted ml-1">members</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 rounded-lg bg-bg-secondary border border-border-primary p-3">
                                    <p className="text-xs text-text-muted">Village-level leader</p>
                                    <p className="font-semibold text-text-primary">{villageGroupsKanke[0].leader} &mdash; {villageGroupsKanke[0].name}</p>
                                </div>
                            </div>

                            {/* District level */}
                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h3 className="text-sm font-semibold text-text-primary mb-3">🏙️ District Level — Ranchi</h3>
                                <div className="space-y-2">
                                    {districtGroupsRanchi.map((g, idx) => (
                                        <div key={g.id} className={`rounded-lg p-3 border flex items-center justify-between gap-3 ${idx === 0 ? 'border-success/40 bg-success/5' : 'border-border-primary bg-bg-secondary'}`}>
                                            <div className="flex items-center gap-2">
                                                {idx === 0 && <span className="badge bg-success/10 text-success border-success/20 text-[10px]">&#10003; Winner</span>}
                                                <span className="text-sm font-medium text-text-primary">{g.name}</span>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="font-bold text-text-primary">{g.members.toLocaleString('en-IN')}</span>
                                                <span className="text-xs text-text-muted ml-1">members</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 rounded-lg bg-bg-secondary border border-border-primary p-3">
                                    <p className="text-xs text-text-muted">District-level leader (elected by district group members)</p>
                                    <p className="font-semibold text-text-primary">{districtGroupsRanchi[0].leader} &mdash; {districtGroupsRanchi[0].name}</p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                                <p className="text-sm font-semibold text-accent">Winning = most members, not a single vote or election day.</p>
                                <p className="text-sm text-text-secondary mt-1">
                                    As members join or leave groups, the winning group updates in real time. There is no fixed election cycle &mdash; the rankings are always live.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 6 — State Level Winner */}
                    {currentStep === 6 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    Across Jharkhand, multiple state groups exist under &quot;Youth Jobs Movement&quot;. The state group with the most members is the <span className="font-medium text-text-primary">winning state group</span>. Its internally elected leader is the <span className="font-semibold text-text-primary">state-level leader</span>.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {stateGroupsJH.map((g, idx) => (
                                    <article key={g.id} className={`rounded-xl border p-4 ${idx === 0 ? 'border-success/40 bg-success/5' : 'border-border-primary bg-bg-card'}`}>
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    {idx === 0 && <span className="badge bg-success/10 text-success border-success/20">&#10003; Winning Group</span>}
                                                    <h3 className="font-semibold text-text-primary">{g.name}</h3>
                                                </div>
                                                <p className="text-sm text-text-muted mt-0.5">Leader (elected by members): <span className="text-text-primary font-medium">{g.leader}</span></p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-xl font-bold text-text-primary">{g.members.toLocaleString('en-IN')}</div>
                                                <div className="text-[10px] uppercase text-text-muted">Members</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                                            <div className={`h-full rounded-full ${idx === 0 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${getRatio(g.members, 5200)}%` }} />
                                        </div>
                                    </article>
                                ))}
                            </div>

                            <div className="rounded-xl border-2 border-success bg-success/5 p-5 text-center">
                                <p className="text-xs uppercase tracking-[0.14em] text-success">Jharkhand State-Level Leader</p>
                                <p className="text-2xl font-bold text-text-primary mt-2">Arjun Mehta</p>
                                <p className="text-sm text-text-muted mt-1">Leader of &quot;Jharkhand Youth Jobs Forum&quot; &mdash; the largest state group with 5,200 members</p>
                                <p className="text-xs text-text-muted mt-2">Elected by members of his state group. Not by village leaders or district leaders.</p>
                            </div>

                            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                                <p className="text-sm font-semibold text-accent">This repeats at every state across India.</p>
                                <p className="text-sm text-text-secondary mt-1">
                                    Each state has competing groups under the same national group. The largest group&apos;s leader represents that state within &quot;Youth Jobs Movement&quot;.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 7 — National Level Winner */}
                    {currentStep === 7 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    At the national level, three groups compete for the Employment issue. The group with the <span className="font-medium text-text-primary">most verified members across all states</span> is the winning national group. Its leader becomes the <span className="font-semibold text-text-primary">Shadow Employment Minister</span>.
                                </p>
                            </div>

                            {/* State breakdown table under YJM */}
                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h3 className="text-sm font-semibold text-text-primary mb-3">&#127381; Youth Jobs Movement — Members by State</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border-primary">
                                                <th className="text-left p-2 text-text-muted font-medium text-[11px] uppercase tracking-[0.12em]">State</th>
                                                <th className="text-left p-2 text-text-muted font-medium text-[11px] uppercase tracking-[0.12em]">Winning State Group</th>
                                                <th className="text-left p-2 text-text-muted font-medium text-[11px] uppercase tracking-[0.12em]">State Leader</th>
                                                <th className="text-right p-2 text-text-muted font-medium text-[11px] uppercase tracking-[0.12em]">Members</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stateAllianceData.map((s) => (
                                                <tr key={s.id} className="border-b border-border-primary hover:bg-bg-secondary">
                                                    <td className="p-2">
                                                        <span className="badge text-[11px]">{s.short}</span>
                                                    </td>
                                                    <td className="p-2 text-text-secondary text-xs">{s.winningGroup}</td>
                                                    <td className="p-2 font-medium text-text-primary text-xs">{s.leader}</td>
                                                    <td className="p-2 text-right font-bold text-primary">{s.members.toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-primary/5">
                                                <td colSpan={3} className="p-2 font-semibold text-text-primary text-sm">Total (Youth Jobs Movement)</td>
                                                <td className="p-2 text-right font-bold text-primary text-lg">{totalStateMembers.toLocaleString('en-IN')}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 3 national groups side by side */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {shadowCandidates.map((c, idx) => (
                                    <article key={c.id} className={`rounded-xl border p-4 text-center ${idx === 0 ? 'border-primary/40 bg-primary/5' : 'border-border-primary bg-bg-card'}`}>
                                        <div className="text-2xl mb-2">{c.emoji}</div>
                                        <div className="text-[10px] uppercase tracking-[0.12em] text-text-muted">{idx === 0 ? 'Largest → Wins' : 'Competing'}</div>
                                        <div className="font-semibold text-text-primary mt-1 text-sm">{c.nationalGroup}</div>
                                        <div className="text-2xl font-bold text-primary mt-2">{(c.totalMembers / 1000).toFixed(1)}k</div>
                                        <div className="text-[10px] uppercase text-text-muted">Members</div>
                                        <div className="mt-3 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                                            <div className={`h-full rounded-full ${idx === 0 ? 'bg-primary' : 'bg-border-secondary'}`} style={{ width: `${getRatio(c.totalMembers, 241600)}%` }} />
                                        </div>
                                    </article>
                                ))}
                            </div>

                            <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 text-center">
                                <p className="text-xs uppercase tracking-[0.14em] text-primary">Winning National Group</p>
                                <p className="text-2xl font-bold text-text-primary mt-2">Youth Jobs Movement</p>
                                <p className="text-sm text-text-muted mt-1">2,41,600 verified members across 18 states &mdash; the largest national employment group</p>
                            </div>
                        </div>
                    )}

                    {/* Step 8 — Shadow Minister Chosen */}
                    {currentStep === 8 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    The winning national group is &quot;Youth Jobs Movement&quot;. Its internally elected national leader &mdash; chosen by members of the national group across all states &mdash; becomes the <span className="font-semibold text-text-primary">Shadow Employment Minister</span>.
                                </p>
                            </div>

                            <div className="rounded-xl border-2 border-success bg-success/5 p-6 text-center">
                                <p className="text-xs uppercase tracking-[0.14em] text-success">Shadow Employment Minister</p>
                                <div className="text-4xl mt-3">🎓</div>
                                <h3 className="text-3xl font-bold text-text-primary mt-3">Arjun Mehta</h3>
                                <p className="text-sm text-text-muted mt-2">Leader of Youth Jobs Movement &middot; Jharkhand</p>
                                <div className="mt-4 grid grid-cols-3 gap-3 max-w-sm mx-auto">
                                    <div className="rounded-lg bg-bg-card border border-border-primary p-3">
                                        <div className="text-xl font-bold text-text-primary">18</div>
                                        <div className="text-[10px] uppercase text-text-muted">States</div>
                                    </div>
                                    <div className="rounded-lg bg-bg-card border border-border-primary p-3">
                                        <div className="text-xl font-bold text-text-primary">72</div>
                                        <div className="text-[10px] uppercase text-text-muted">Districts</div>
                                    </div>
                                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                                        <div className="text-xl font-bold text-primary">2.4L+</div>
                                        <div className="text-[10px] uppercase text-primary">Members</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h4 className="font-semibold text-text-primary mb-3">His mandate — directly from members:</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary border border-border-primary">
                                        <span className="text-lg">🎯</span>
                                        <div><span className="font-medium text-text-primary">10 lakh new jobs</span> through skilling + MSME support in 18 months</div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary border border-border-primary">
                                        <span className="text-lg">🏭</span>
                                        <div><span className="font-medium text-text-primary">MSME hiring fast-track</span> — simplified compliance for MSMEs that hire locally</div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary border border-border-primary">
                                        <span className="text-lg">📊</span>
                                        <div><span className="font-medium text-text-primary">District employment heatmap</span> — real-time dashboard from group reports</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                                <p className="text-sm font-semibold text-accent">Not appointed. Not elected once. Continuously accountable.</p>
                                <p className="text-sm text-text-secondary mt-1">
                                    If members shift to competing groups, Youth Jobs Movement loses its majority. A different national group&apos;s leader becomes shadow minister &mdash; automatically.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 9 — Accountability in Action */}
                    {currentStep === 9 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    Shadow minister accountability works through membership flows. When members leave a national group and join a competing one, the winning group changes &mdash; and with it, the shadow minister. No recall vote needed.
                                </p>
                            </div>

                            {accountabilityStep === 0 ? (
                                <div className="text-center py-6">
                                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 inline-block mb-5">
                                        <p className="text-sm text-text-muted">Current shadow minister</p>
                                        <p className="text-xl font-bold text-text-primary">Arjun Mehta (Youth Jobs Movement)</p>
                                        <p className="text-sm text-primary">2,41,600 members</p>
                                    </div>
                                    <div className="block">
                                        <button
                                            type="button"
                                            onClick={() => setAccountabilityStep(1)}
                                            className="btn btn-primary"
                                        >
                                            Start Scenario
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {accountabilityEvents.filter((ev) => ev.id <= accountabilityStep).map((ev) => {
                                        const colors = {
                                            warning: 'border-warning/40 bg-warning/10',
                                            danger: 'border-danger/40 bg-danger/10',
                                            success: 'border-success/40 bg-success/10',
                                        };
                                        return (
                                            <div key={ev.id} className={`rounded-xl border p-4 animate-fade-in ${colors[ev.status]}`}>
                                                <span className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">Event {ev.id}</span>
                                                <h4 className="font-semibold text-text-primary mt-2">{ev.title}</h4>
                                                <p className="text-sm text-text-secondary mt-1">{ev.desc}</p>
                                            </div>
                                        );
                                    })}
                                    <div className="flex gap-3 mt-2">
                                        {accountabilityStep < accountabilityEvents.length && (
                                            <button type="button" onClick={() => setAccountabilityStep((prev) => prev + 1)} className="btn btn-primary btn-sm">
                                                Next Event &rarr;
                                            </button>
                                        )}
                                        <button type="button" onClick={() => setAccountabilityStep(0)} className="btn btn-secondary btn-sm">
                                            Reset
                                        </button>
                                    </div>
                                    {accountabilityStep === accountabilityEvents.length && (
                                        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 mt-2 text-center animate-fade-in">
                                            <p className="text-sm font-semibold text-accent">
                                                Power follows members. Members can leave any time. That&apos;s the accountability mechanism.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 10 — The Outcome */}
                    {currentStep === 10 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border-2 border-primary bg-primary/5 p-6 text-center">
                                <h3 className="text-2xl font-bold text-text-primary">
                                    India didn&apos;t wait for a party to appoint a shadow minister.
                                </h3>
                                <p className="text-2xl font-bold text-primary mt-2">India elected one &mdash; from the village up.</p>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-5">
                                <p className="text-xs uppercase tracking-[0.14em] text-text-muted mb-4">How it works — the full picture</p>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary border border-border-primary">
                                        <span className="font-bold text-primary w-5 shrink-0">1.</span>
                                        <span><span className="font-medium text-text-primary">Multiple national groups</span> compete for the employment issue. Citizens choose one to join.</span>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary border border-border-primary">
                                        <span className="font-bold text-primary w-5 shrink-0">2.</span>
                                        <span>Each user also joins <span className="font-medium text-text-primary">one group at their state, district, and village</span> level &mdash; chosen from competing options.</span>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary border border-border-primary">
                                        <span className="font-bold text-primary w-5 shrink-0">3.</span>
                                        <span>Members <span className="font-medium text-text-primary">vote for a leader inside their group</span> at every level. Each level elects its leader independently.</span>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary border border-border-primary">
                                        <span className="font-bold text-primary w-5 shrink-0">4.</span>
                                        <span>The <span className="font-medium text-text-primary">group with the most members</span> at each level is the winning group. Its leader is that level&apos;s representative.</span>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/30">
                                        <span className="font-bold text-primary w-5 shrink-0">5.</span>
                                        <span>The <span className="font-semibold text-primary">national group with the most members</span> wins overall. Its leader is the <span className="font-semibold text-primary">Shadow Employment Minister</span>.</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center">
                                    <div className="text-2xl mb-2">🚫</div>
                                    <p className="text-sm font-semibold text-text-primary">No party gatekeeping</p>
                                    <p className="text-xs text-text-muted mt-1">Any group that earns the most members can rise</p>
                                </div>
                                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                                    <div className="text-2xl mb-2">🔄</div>
                                    <p className="text-sm font-semibold text-text-primary">No election day needed</p>
                                    <p className="text-xs text-text-muted mt-1">Membership counts update live — winner changes automatically</p>
                                </div>
                                <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-center">
                                    <div className="text-2xl mb-2">✅</div>
                                    <p className="text-sm font-semibold text-text-primary">Mandate from real members</p>
                                    <p className="text-xs text-text-muted mt-1">Verified, local, and continuously updated</p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-5 text-center">
                                <h4 className="text-xl font-bold text-text-primary">Start your employment group today.</h4>
                                <p className="text-text-secondary mt-2">
                                    Every shadow minister begins with one local group. Join the movement or start one in your village.
                                </p>
                                <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
                                    <Link href="/party/create" className="btn btn-primary btn-lg shadow-lg shadow-primary/20">
                                        Start a Local Employment Group
                                    </Link>
                                    <Link href="/demo-3" className="btn btn-secondary btn-lg">
                                        &#8592; See Demo 3
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
