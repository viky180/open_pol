'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface College {
    id: string;
    name: string;
    city: string;
    totalStudents: number;
    activeGroups: number;
}

interface Leader {
    id: string;
    name: string;
    collegeId: string;
    collegeName: string;
    agenda: string;
    campusVotes: number;
    campusTurnout: number;
    stateVotes: number;
}

interface IssueGroupLeader {
    id: string;
    issueGroup: string;
    leader: string;
    supporters: number;
}

interface ConsensusGroup {
    id: string;
    name: string;
    formedFrom: string[];
    leaderId: string;
    leaderName: string;
    agenda: string;
}

const colleges: College[] = [
    { id: 'patna-university', name: 'Patna University', city: 'Patna', totalStudents: 12000, activeGroups: 9 },
    { id: 'muzaffarpur-college', name: 'LS College', city: 'Muzaffarpur', totalStudents: 8000, activeGroups: 6 },
    { id: 'bhagalpur-university', name: 'TMBU Campus', city: 'Bhagalpur', totalStudents: 7000, activeGroups: 5 },
    { id: 'gaya-college', name: 'Gaya College', city: 'Gaya', totalStudents: 6000, activeGroups: 4 },
    { id: 'darbhanga-university', name: 'LNMU Campus', city: 'Darbhanga', totalStudents: 9000, activeGroups: 7 },
];

const localIssueGroups = [
    'Hostel Safety Committee',
    'Library Hours Reform Group',
    'Affordable Canteen Network',
    'Campus Transport Action Team',
    'Scholarship Access Forum',
];

const patnaIssueGroupLeaders: IssueGroupLeader[] = [
    { id: 'pu-hostel', issueGroup: 'Hostel Safety Committee', leader: 'Aarya Singh', supporters: 1280 },
    { id: 'pu-library', issueGroup: 'Library Hours Reform Group', leader: 'Shivani Kumari', supporters: 940 },
    { id: 'pu-canteen', issueGroup: 'Affordable Canteen Network', leader: 'Pankaj Kumar', supporters: 860 },
    { id: 'pu-transport', issueGroup: 'Campus Transport Action Team', leader: 'Rohit Raj', supporters: 1025 },
    { id: 'pu-scholarship', issueGroup: 'Scholarship Access Forum', leader: 'Nagma Parveen', supporters: 1110 },
];

const patnaConsensusGroups: ConsensusGroup[] = [
    {
        id: 'safe-campus-front',
        name: 'Safe Campus Front',
        formedFrom: ['Hostel Safety Committee', 'Campus Transport Action Team'],
        leaderId: 'aarya',
        leaderName: 'Aarya Singh',
        agenda: 'Hostel safety + secure late-evening commute',
    },
    {
        id: 'student-support-alliance',
        name: 'Student Support Alliance',
        formedFrom: ['Library Hours Reform Group', 'Scholarship Access Forum'],
        leaderId: 'nagma',
        leaderName: 'Nagma Parveen',
        agenda: 'Library access + scholarship transparency',
    },
    {
        id: 'affordability-coalition',
        name: 'Affordability Coalition',
        formedFrom: ['Affordable Canteen Network'],
        leaderId: 'pankaj',
        leaderName: 'Pankaj Kumar',
        agenda: 'Affordable meals and fee support',
    },
];

const electedLeaders: Leader[] = [
    {
        id: 'aarya',
        name: 'Aarya Singh',
        collegeId: 'patna-university',
        collegeName: 'Patna University',
        agenda: 'Transparent hostel allotment + safer night commute',
        campusVotes: 3120,
        campusTurnout: 5400,
        stateVotes: 9800,
    },
    {
        id: 'farhan',
        name: 'Farhan Alam',
        collegeId: 'muzaffarpur-college',
        collegeName: 'LS College',
        agenda: 'Digital scholarship tracking for all students',
        campusVotes: 2110,
        campusTurnout: 3900,
        stateVotes: 7600,
    },
    {
        id: 'neha',
        name: 'Neha Kumari',
        collegeId: 'bhagalpur-university',
        collegeName: 'TMBU Campus',
        agenda: '24x7 library zones and exam support cells',
        campusVotes: 1835,
        campusTurnout: 3200,
        stateVotes: 7200,
    },
    {
        id: 'ritik',
        name: 'Ritik Raj',
        collegeId: 'gaya-college',
        collegeName: 'Gaya College',
        agenda: 'Internship tie-ups and placement transparency',
        campusVotes: 1670,
        campusTurnout: 2800,
        stateVotes: 6900,
    },
    {
        id: 'sana',
        name: 'Sana Perween',
        collegeId: 'darbhanga-university',
        collegeName: 'LNMU Campus',
        agenda: 'Women-led grievance redressal councils',
        campusVotes: 2525,
        campusTurnout: 4100,
        stateVotes: 8100,
    },
];

const steps: { id: StepId; title: string; subtitle: string; label: string }[] = [
    { id: 1, title: 'Issue Groups in Patna University', subtitle: 'Students form separate groups for each campus issue', label: '01' },
    { id: 2, title: 'Leader Chosen for Each Issue Group', subtitle: 'Every issue group selects one leader from within the group', label: '02' },
    { id: 3, title: 'Larger Groups by Consensus', subtitle: 'Issue-group leaders combine and choose a consensus leader for each larger coalition', label: '03' },
    { id: 4, title: 'College Election', subtitle: 'Consensus leaders become candidates and all college students vote', label: '04' },
    { id: 5, title: 'All-College Leadership Selection', subtitle: 'The same process runs in every college, then college leaders are chosen similarly', label: '05' },
    { id: 6, title: 'Leader Shortlist', subtitle: 'All elected college leaders become Bihar council candidates', label: '06' },
    { id: 7, title: 'Statewide Voting', subtitle: 'Students across Bihar colleges vote for these candidates', label: '07' },
    { id: 8, title: 'State Leader Result', subtitle: 'Top voted candidate becomes Bihar Gen Z student leader', label: '08' },
    { id: 9, title: 'Trust is Revocable', subtitle: 'After months of non-performance, students withdraw trust and reassign it', label: '09' },
    { id: 10, title: 'Runner-Up Emerges', subtitle: 'The runner-up gains trust and becomes Bihar student leader', label: '10' },
    { id: 11, title: 'MLA Campaign by Students', subtitle: 'Students transparently crowdfund and run campaign support', label: '11' },
    { id: 12, title: 'MLA Election Victory', subtitle: 'The student-backed leader wins the MLA election', label: '12' },
];

function getRatio(value: number, total: number): number {
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, (value / total) * 100));
}

export default function DemoPageTwo() {
    const [currentStep, setCurrentStep] = useState<StepId>(1);
    const [selectedCollegeId, setSelectedCollegeId] = useState(colleges[0].id);
    const [myVote, setMyVote] = useState<string | null>(null);
    const [stateMyVote, setStateMyVote] = useState<string | null>(null);
    const [manualTrustToggle, setManualTrustToggle] = useState<boolean | null>(null);
    const [liveVotes, setLiveVotes] = useState<Record<string, number>>(() =>
        Object.fromEntries(patnaConsensusGroups.map((group) => [group.leaderId, 1200]))
    );
    const [stateLiveVotes, setStateLiveVotes] = useState<Record<string, number>>(() =>
        Object.fromEntries(electedLeaders.map((leader) => [leader.id, leader.stateVotes]))
    );

    const selectedCollege = colleges.find((college) => college.id === selectedCollegeId) || colleges[0];
    const progress = useMemo(() => getRatio(currentStep, steps.length), [currentStep]);
    const totalCollegeVotes = useMemo(() => Object.values(liveVotes).reduce((sum, value) => sum + value, 0), [liveVotes]);
    const totalStateVotes = useMemo(() => Object.values(stateLiveVotes).reduce((sum, value) => sum + value, 0), [stateLiveVotes]);

    const rankedLeaders = useMemo(
        () => [...patnaConsensusGroups].sort((a, b) => (liveVotes[b.leaderId] || 0) - (liveVotes[a.leaderId] || 0)),
        [liveVotes]
    );
    const rankedStateLeaders = useMemo(
        () => [...electedLeaders].sort((a, b) => (stateLiveVotes[b.id] || 0) - (stateLiveVotes[a.id] || 0)),
        [stateLiveVotes]
    );

    const winner = rankedLeaders[0];
    const stateWinner = rankedStateLeaders[0];
    const stateRunnerUp = rankedStateLeaders[1];

    // Derive trustReviewApplied: auto-apply when step >= 10, allow manual toggle
    const trustReviewApplied = manualTrustToggle !== null ? manualTrustToggle : currentStep >= 10;

    const trustReviewVotes = useMemo(() => {
        if (!trustReviewApplied) return stateLiveVotes;
        const adjustedVotes: Record<string, number> = { ...stateLiveVotes };
        const currentWinner = rankedStateLeaders[0];
        const currentRunnerUp = rankedStateLeaders[1];
        if (!currentWinner || !currentRunnerUp) return adjustedVotes;

        const currentWinnerVotes = adjustedVotes[currentWinner.id] || 0;
        const currentRunnerUpVotes = adjustedVotes[currentRunnerUp.id] || 0;
        const currentMargin = Math.max(0, currentWinnerVotes - currentRunnerUpVotes);
        const trustShift = Math.max(Math.ceil(currentMargin / 2) + 250, 800);

        adjustedVotes[currentWinner.id] = Math.max(0, currentWinnerVotes - trustShift);
        adjustedVotes[currentRunnerUp.id] = currentRunnerUpVotes + trustShift + 150;
        return adjustedVotes;
    }, [rankedStateLeaders, stateLiveVotes, trustReviewApplied]);

    const trustReviewRankedLeaders = useMemo(
        () => [...electedLeaders].sort((a, b) => (trustReviewVotes[b.id] || 0) - (trustReviewVotes[a.id] || 0)),
        [trustReviewVotes]
    );
    const trustReviewWinner = trustReviewRankedLeaders[0];
    const trustReviewTotalVotes = useMemo(() => Object.values(trustReviewVotes).reduce((sum, value) => sum + value, 0), [trustReviewVotes]);
    const supportTransferred = useMemo(() => {
        if (!stateWinner || !stateRunnerUp) return 0;
        const before = stateLiveVotes[stateRunnerUp.id] || 0;
        const after = trustReviewVotes[stateRunnerUp.id] || 0;
        return Math.max(0, after - before);
    }, [stateLiveVotes, stateRunnerUp, stateWinner, trustReviewVotes]);

    const handleVote = (leaderId: string) => {
        setLiveVotes((prev) => ({
            ...prev,
            [leaderId]: (prev[leaderId] || 0) + 1,
        }));
        setMyVote(leaderId);
    };
    const handleStateVote = (leaderId: string) => {
        setStateLiveVotes((prev) => ({
            ...prev,
            [leaderId]: (prev[leaderId] || 0) + 1,
        }));
        setStateMyVote(leaderId);
    };

    return (
        <section className="brand-surface min-h-screen">
            <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-10">
                <div className="brand-panel p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link href="/demo" className="text-sm text-text-muted hover:text-primary transition-colors">
                            {'<-'} Back to Demo 1
                        </Link>
                        <div className="flex items-center gap-3">
                            <Link href="/demo-3" className="text-sm text-primary hover:underline">
                                View Demo 3: Organic Employment Minister {'->'}
                            </Link>
                            <Link href="/" className="text-sm text-text-muted hover:text-primary transition-colors">
                                Home
                            </Link>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="brand-kicker">Interactive Demo 2</p>
                            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mt-4" style={{ fontFamily: 'var(--font-display)' }}>
                                Patna University to Bihar Student Leadership
                            </h1>
                            <p className="text-sm sm:text-base text-text-secondary mt-2 max-w-2xl">
                                See how Patna University students form issue groups, choose leaders by consensus, scale to Bihar leadership, revoke trust on non-performance, and build a winning MLA campaign.
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

                <div className="mt-4 brand-panel p-5 sm:p-6 animate-fade-in">
                    <div className="mb-6 pb-5 border-b border-border-primary">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Current step</p>
                        <h2 className="text-2xl font-bold text-text-primary mt-2" style={{ fontFamily: 'var(--font-display)' }}>
                            {steps[currentStep - 1].title}
                        </h2>
                        <p className="text-text-secondary mt-2">{steps[currentStep - 1].subtitle}</p>
                    </div>

                    {currentStep === 1 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">At Patna University, students first organize into separate issue groups.</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {localIssueGroups.map((group) => (
                                        <span key={group} className="badge">{group}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {colleges.map((college) => (
                                    <article key={college.id} className="rounded-xl border border-border-primary bg-bg-card p-4">
                                        <div className="flex items-center justify-between text-xs text-text-muted">
                                            <span className="badge">{college.city}</span>
                                            <span>{college.totalStudents.toLocaleString('en-IN')} students</span>
                                        </div>
                                        <h3 className="mt-3 font-semibold text-text-primary">{college.name}</h3>
                                        <p className="text-sm text-text-secondary mt-2">{college.activeGroups} active student issue groups</p>
                                    </article>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-4">
                            {patnaIssueGroupLeaders.map((group) => (
                                <article key={group.id} className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h3 className="font-semibold text-text-primary">{group.leader}</h3>
                                            <p className="text-sm text-text-muted">{group.issueGroup}</p>
                                        </div>
                                        <span className="badge bg-success/10 text-success border-success/20">Issue Group Leader</span>
                                    </div>
                                    <div className="mt-3 text-sm text-text-secondary">
                                        Support from group members:{' '}
                                        <span className="font-semibold text-text-primary">{group.supporters.toLocaleString('en-IN')}</span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <h3 className="text-lg font-semibold text-text-primary">Patna University coalition building</h3>
                                <p className="text-sm text-text-secondary mt-2">
                                    Issue-group leaders combine around bigger common agendas and select one consensus leader for each larger coalition.
                                </p>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h4 className="font-semibold text-text-primary mb-3">Larger issue groups with consensus leaders</h4>
                                <div className="space-y-2">
                                    {patnaConsensusGroups.map((group) => (
                                        <div key={group.id} className="rounded-lg border border-border-primary bg-bg-secondary p-3">
                                            <div>
                                                <div className="text-sm font-medium text-text-primary">{group.name}</div>
                                                <div className="text-xs text-text-muted mt-1">Consensus Leader: {group.leaderName}</div>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {group.formedFrom.map((sourceGroup) => (
                                                        <span key={sourceGroup} className="badge">{sourceGroup}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    Patna University now holds a college-wide election. Consensus leaders of larger issue groups become candidates, and all students can vote.
                                </p>
                            </div>

                            {rankedLeaders.map((group) => {
                                const votes = liveVotes[group.leaderId] || 0;
                                const isMyVote = myVote === group.leaderId;
                                return (
                                    <article key={group.id} className={`rounded-xl border p-4 ${isMyVote ? 'border-primary bg-primary/5' : 'border-border-primary bg-bg-card'}`}>
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-semibold text-text-primary">{group.leaderName}</h3>
                                                <p className="text-sm text-text-muted">{group.name}</p>
                                            </div>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleVote(group.leaderId)}>
                                                Vote
                                            </button>
                                        </div>
                                        <p className="text-sm text-text-secondary mt-3">{group.agenda}</p>
                                        <div className="mt-3 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${getRatio(votes, totalCollegeVotes)}%` }} />
                                        </div>
                                        <div className="mt-2 text-xs text-text-muted">
                                            {votes.toLocaleString('en-IN')} votes ({getRatio(votes, totalCollegeVotes).toFixed(1)}%)
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-success/30 bg-success/10 p-5">
                                <p className="text-xs uppercase tracking-[0.14em] text-success">Election result</p>
                                <h3 className="text-2xl font-bold text-text-primary mt-2">{winner.leaderName}</h3>
                                <p className="text-sm text-text-secondary mt-2">
                                    Chosen as Patna University college leader from {winner.name}
                                </p>
                                <p className="text-sm text-text-secondary mt-1">Total college votes: {totalCollegeVotes.toLocaleString('en-IN')}</p>
                                <p className="text-sm text-text-secondary mt-1">
                                    Winning votes: <span className="font-semibold text-text-primary">{(liveVotes[winner.leaderId] || 0).toLocaleString('en-IN')}</span>
                                </p>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h4 className="font-semibold text-text-primary mb-3">Similar process across all colleges</h4>
                                <p className="text-sm text-text-secondary">
                                    Every college follows the same path: issue groups {'->'} issue leaders {'->'} larger consensus groups {'->'} college election.
                                    Then each college leader joins the next-level election to choose leaders across all colleges.
                                </p>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h4 className="font-semibold text-text-primary mb-3">Current college leaders</h4>
                                <div className="space-y-2">
                                    {electedLeaders.map((leader, index) => (
                                        <div key={leader.id} className="rounded-lg border border-border-primary bg-bg-secondary p-3 flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-text-primary">#{index + 1} {leader.name}</div>
                                                <div className="text-xs text-text-muted">{leader.collegeName}</div>
                                            </div>
                                            <div className="text-sm font-semibold text-primary">{leader.stateVotes.toLocaleString('en-IN')}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 6 && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-xs uppercase tracking-[0.14em] text-text-muted mb-2">Explore by college</p>
                                <div className="flex flex-wrap gap-2">
                                    {colleges.map((college) => (
                                        <button
                                            key={college.id}
                                            type="button"
                                            onClick={() => setSelectedCollegeId(college.id)}
                                            className={`rounded-lg px-3 py-2 text-sm border transition-colors ${selectedCollegeId === college.id
                                                ? 'border-primary bg-primary/10 text-text-primary'
                                                : 'border-border-primary bg-bg-card text-text-muted hover:text-text-primary hover:border-primary/50'
                                                }`}
                                        >
                                            {college.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                                <h3 className="text-lg font-semibold text-text-primary">{selectedCollege.name}</h3>
                                <p className="text-sm text-text-secondary mt-2">
                                    This college has selected one official candidate for Bihar Student Council. Every college sends exactly one elected leader.
                                </p>
                                <div className="mt-4 text-sm text-text-secondary">
                                    Candidate:{' '}
                                    <span className="font-semibold text-text-primary">
                                        {electedLeaders.find((leader) => leader.collegeId === selectedCollege.id)?.name}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h4 className="font-semibold text-text-primary mb-3">State council candidate list</h4>
                                <div className="space-y-2">
                                    {electedLeaders.map((leader) => (
                                        <div key={leader.id} className="rounded-lg border border-border-primary bg-bg-secondary p-3 flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-text-primary">{leader.name}</div>
                                                <div className="text-xs text-text-muted">{leader.collegeName}</div>
                                            </div>
                                            <span className="text-xs text-text-muted">Candidate</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 7 && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    All students from Bihar colleges vote here. Cast a demo vote to see live tally changes.
                                </p>
                            </div>

                            {rankedStateLeaders.map((leader) => {
                                const votes = stateLiveVotes[leader.id] || 0;
                                const isMyVote = stateMyVote === leader.id;
                                return (
                                    <article key={leader.id} className={`rounded-xl border p-4 ${isMyVote ? 'border-primary bg-primary/5' : 'border-border-primary bg-bg-card'}`}>
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-semibold text-text-primary">{leader.name}</h3>
                                                <p className="text-sm text-text-muted">{leader.collegeName}</p>
                                            </div>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleStateVote(leader.id)}>
                                                Vote
                                            </button>
                                        </div>
                                        <p className="text-sm text-text-secondary mt-3">{leader.agenda}</p>
                                        <div className="mt-3 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${getRatio(votes, totalStateVotes)}%` }} />
                                        </div>
                                        <div className="mt-2 text-xs text-text-muted">
                                            {votes.toLocaleString('en-IN')} votes ({getRatio(votes, totalStateVotes).toFixed(1)}%)
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {currentStep === 8 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-success/30 bg-success/10 p-5">
                                <p className="text-xs uppercase tracking-[0.14em] text-success">State election result</p>
                                <h3 className="text-2xl font-bold text-text-primary mt-2">{stateWinner.name}</h3>
                                <p className="text-sm text-text-secondary mt-2">From {stateWinner.collegeName}</p>
                                <p className="text-sm text-text-secondary mt-1">Total statewide votes: {totalStateVotes.toLocaleString('en-IN')}</p>
                                <p className="text-sm text-text-secondary mt-1">
                                    Winning votes: <span className="font-semibold text-text-primary">{(stateLiveVotes[stateWinner.id] || 0).toLocaleString('en-IN')}</span>
                                </p>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h4 className="font-semibold text-text-primary mb-3">Final ranking</h4>
                                <div className="space-y-2">
                                    {rankedStateLeaders.map((leader, index) => (
                                        <div key={leader.id} className="rounded-lg border border-border-primary bg-bg-secondary p-3 flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-text-primary">#{index + 1} {leader.name}</div>
                                                <div className="text-xs text-text-muted">{leader.collegeName}</div>
                                            </div>
                                            <div className="text-sm font-semibold text-primary">{(stateLiveVotes[leader.id] || 0).toLocaleString('en-IN')}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 9 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    After a few months, students review performance. Since trust is revocable, they can withdraw support from a non-performing leader and move it to better-performing alternatives.
                                </p>
                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={() => setManualTrustToggle(!trustReviewApplied)}
                                        className="btn btn-secondary btn-sm"
                                    >
                                        {trustReviewApplied ? 'Reset Trust Review' : 'Apply 6-Month Trust Review'}
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h4 className="font-semibold text-text-primary mb-3">Backing shift (before vs after)</h4>
                                <div className="space-y-2">
                                    {rankedStateLeaders.map((leader) => (
                                        <div key={leader.id} className="rounded-lg border border-border-primary bg-bg-secondary p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium text-text-primary">{leader.name}</div>
                                                <div className="text-xs text-text-muted">{leader.collegeName}</div>
                                            </div>
                                            <div className="mt-2 text-xs text-text-secondary">
                                                Before: {(stateLiveVotes[leader.id] || 0).toLocaleString('en-IN')} | After:{' '}
                                                <span className="font-semibold text-text-primary">{(trustReviewVotes[leader.id] || 0).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 10 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-success/30 bg-success/10 p-5">
                                <p className="text-xs uppercase tracking-[0.14em] text-success">Leadership change after trust review</p>
                                <h3 className="text-2xl font-bold text-text-primary mt-2">{trustReviewWinner.name}</h3>
                                <p className="text-sm text-text-secondary mt-2">
                                    The earlier runner-up now emerges as Bihar student leader after gaining transferable backing.
                                </p>
                                <p className="text-sm text-text-secondary mt-1">
                                    Additional trust received: <span className="font-semibold text-text-primary">{supportTransferred.toLocaleString('en-IN')}</span>
                                </p>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h4 className="font-semibold text-text-primary mb-3">Revised Bihar ranking</h4>
                                <div className="space-y-2">
                                    {trustReviewRankedLeaders.map((leader, index) => (
                                        <div key={leader.id} className="rounded-lg border border-border-primary bg-bg-secondary p-3 flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-text-primary">#{index + 1} {leader.name}</div>
                                                <div className="text-xs text-text-muted">{leader.collegeName}</div>
                                            </div>
                                            <div className="text-sm font-semibold text-primary">{(trustReviewVotes[leader.id] || 0).toLocaleString('en-IN')}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 11 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-sm text-text-secondary">
                                    Due to strong performance as Bihar student leader, {trustReviewWinner.name} becomes popular among the broader Bihar public and decides to contest the MLA election.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <article className="rounded-xl border border-border-primary bg-bg-card p-4">
                                    <h4 className="font-semibold text-text-primary">Transparent student crowdfunding</h4>
                                    <div className="mt-3 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${getRatio(2680000, 2500000)}%` }} />
                                    </div>
                                    <p className="text-sm text-text-secondary mt-3">
                                        Raised: <span className="font-semibold text-text-primary">Rs. 26,80,000</span> / Goal: Rs. 25,00,000
                                    </p>
                                    <p className="text-xs text-text-muted mt-1">18,420 student contributors, fully visible on-platform.</p>
                                </article>

                                <article className="rounded-xl border border-border-primary bg-bg-card p-4">
                                    <h4 className="font-semibold text-text-primary">Student-powered campaign operations</h4>
                                    <p className="text-sm text-text-secondary mt-3">Students also run ground campaign support:</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="badge">2,300 volunteers</span>
                                        <span className="badge">Campus-to-village outreach</span>
                                        <span className="badge">Door-to-door support teams</span>
                                        <span className="badge">Transparent expense logs</span>
                                    </div>
                                </article>
                            </div>
                        </div>
                    )}

                    {currentStep === 12 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-success/30 bg-success/10 p-5">
                                <p className="text-xs uppercase tracking-[0.14em] text-success">MLA election result</p>
                                <h3 className="text-2xl font-bold text-text-primary mt-2">{trustReviewWinner.name} wins</h3>
                                <p className="text-sm text-text-secondary mt-2">Constituency: Patna Central Assembly</p>
                                <p className="text-sm text-text-secondary mt-1">
                                    Vote share: <span className="font-semibold text-text-primary">52.4%</span> | Winning margin:{' '}
                                    <span className="font-semibold text-text-primary">11,860 votes</span>
                                </p>
                            </div>

                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h4 className="font-semibold text-text-primary mb-3">What this demonstrates</h4>
                                <p className="text-sm text-text-secondary">
                                    Leadership stays accountable because trust can be revoked. Strong performers can rise from runner-up to top leader and then transition to mainstream elections with transparent student support.
                                </p>
                                <p className="text-sm text-text-secondary mt-2">
                                    Total Bihar backing considered in review: {trustReviewTotalVotes.toLocaleString('en-IN')}.
                                </p>
                            </div>
                        </div>
                    )}

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
