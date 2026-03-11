'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const demoData = {
    mainGroup: {
        id: 'demo-main-group',
        name: 'Fix Water Supply in Indore - Vijay Nagar Area',
        category: 'Water & Sanitation',
        memberCount: 67,
        pincodes: ['452010', '452001'],
        createdAt: 'Jan 15, 2026',
    },
    groups: [
        {
            id: 'demo-main-group',
            name: 'Fix Water Supply in Indore - Vijay Nagar Area',
            category: 'Water & Sanitation',
            memberCount: 67,
            pincodes: ['452010', '452001'],
            isHighlighted: true,
        },
        {
            id: 'demo-roads-group',
            name: 'Better Roads for Indore Bypass',
            category: 'Infrastructure',
            memberCount: 134,
            pincodes: ['452001', '452002', '452003'],
            isHighlighted: false,
        },
        {
            id: 'demo-education-group',
            name: 'Improve Government Schools - Central Indore',
            category: 'Education',
            memberCount: 45,
            pincodes: ['452001'],
            isHighlighted: false,
        },
        {
            id: 'demo-safety-group',
            name: 'Street Lighting Safety Initiative',
            category: 'Safety',
            memberCount: 28,
            pincodes: ['452010'],
            isHighlighted: false,
        },
    ],
    members: [
        { id: 'u1', name: 'Priya Sharma', trustCount: 22, isLeader: true, joinedDaysAgo: 45, avatar: 'PS' },
        { id: 'u2', name: 'Amit Kumar', trustCount: 15, isLeader: false, joinedDaysAgo: 38, avatar: 'AK' },
        { id: 'u3', name: 'Sunita Devi', trustCount: 12, isLeader: false, joinedDaysAgo: 30, avatar: 'SD' },
        { id: 'u4', name: 'Rajesh Verma', trustCount: 8, isLeader: false, joinedDaysAgo: 22, avatar: 'RV' },
        { id: 'u5', name: 'Meera Patel', trustCount: 5, isLeader: false, joinedDaysAgo: 14, avatar: 'MP' },
        { id: 'u6', name: 'You', trustCount: 0, isLeader: false, joinedDaysAgo: 0, avatar: 'ME', isCurrentUser: true },
    ],
    feedItems: [
        {
            id: 'f1',
            type: 'question',
            title: 'When will the tanker schedule be updated?',
            preview: 'Many residents are asking about the revised tanker timings...',
            author: 'Community Member',
            timestamp: '2 hours ago',
        },
        {
            id: 'f2',
            type: 'action',
            title: 'Email Campaign Launched',
            preview: '23 members have sent emails to the Municipal Commissioner',
            author: 'Priya Sharma',
            timestamp: '1 day ago',
        },
        {
            id: 'f3',
            type: 'new_member',
            title: '3 new members joined',
            preview: 'Welcome Rahul, Kavita, and Deepak to the group!',
            author: 'System',
            timestamp: '2 days ago',
        },
        {
            id: 'f4',
            type: 'milestone',
            title: '50 members reached',
            preview: 'The group crossed 50 members and gained stronger local visibility.',
            author: 'System',
            timestamp: '1 week ago',
        },
    ],
    campaigns: [
        {
            id: 'c1',
            type: 'email',
            title: 'Email Municipal Commissioner',
            participantCount: 23,
            goal: 50,
        },
        {
            id: 'c2',
            type: 'petition',
            title: 'Petition for New Water Pipeline',
            participantCount: 156,
            goal: 500,
        },
    ],
    fundingCampaigns: [
        {
            id: 'fund1',
            title: 'Legal Fund for RTI Appeals',
            description: 'Fund legal costs to file RTI appeals with the Water Department.',
            goalAmount: 25000,
            raisedAmount: 18500,
            donorCount: 34,
            daysLeft: 12,
            status: 'active',
        },
        {
            id: 'fund2',
            title: 'Awareness Campaign Materials',
            description: 'Print pamphlets and banners for the upcoming awareness rally.',
            goalAmount: 10000,
            raisedAmount: 10000,
            donorCount: 22,
            daysLeft: 0,
            status: 'completed',
        },
    ],
    recentDonations: [
        { id: 'd1', donor: 'Rahul M.', amount: 1000, message: 'Good cause!', time: '2 hours ago', verified: true },
        { id: 'd2', donor: 'Anonymous', amount: 500, message: null, time: '5 hours ago', verified: true },
        { id: 'd3', donor: 'Kavita S.', amount: 2000, message: 'Keep up the great work', time: '1 day ago', verified: true },
        { id: 'd4', donor: 'Deepak V.', amount: 250, message: null, time: '1 day ago', verified: false },
    ],
};

const steps: { id: StepId; title: string; subtitle: string; icon: string }[] = [
    { id: 1, title: 'Discover Groups', subtitle: 'Find local groups for issues you care about', icon: '01' },
    { id: 2, title: 'Join & Explore', subtitle: 'See members, scope, and the active issue thread', icon: '02' },
    { id: 3, title: 'Choose Your Voice', subtitle: 'Pick one trusted member to represent your voice', icon: '03' },
    { id: 4, title: 'Stay Updated', subtitle: 'Track group updates in your unified activity feed', icon: '04' },
    { id: 5, title: 'Take Action', subtitle: 'Join campaign actions with visible participation', icon: '05' },
    { id: 6, title: 'Merge for Impact', subtitle: 'Coordinate and combine strength across aligned groups', icon: '06' },
    { id: 7, title: 'Fund the Cause', subtitle: 'Run transparent, public-interest crowdfunding', icon: '07' },
];

function getRatio(current: number, target: number): number {
    return Math.min(100, Math.max(0, (current / target) * 100));
}

export default function DemoPage() {
    const [currentStep, setCurrentStep] = useState<StepId>(1);
    const [selectedTrust, setSelectedTrust] = useState<string | null>(null);
    const step = steps[currentStep - 1];
    const progress = useMemo(() => getRatio(currentStep, steps.length), [currentStep]);

    return (
        <section className="brand-surface min-h-screen">
            <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-10">
                <div className="brand-panel p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link href="/" className="text-sm text-text-muted hover:text-primary transition-colors">
                            {'<-'} Back to Home
                        </Link>
                        <Link href="/demo-2" className="text-sm text-primary hover:underline">
                            View Demo 2: Bihar Student Council Election {'->'}
                        </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="brand-kicker">Interactive Demo</p>
                            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mt-4" style={{ fontFamily: 'var(--font-display)' }}>
                                How OpenPolitics Works
                            </h1>
                            <p className="text-sm sm:text-base text-text-secondary mt-2 max-w-2xl">
                                Walk through a real workflow for the water crisis issue in Vijay Nagar, Indore.
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
                                    <div className="text-[11px] uppercase tracking-[0.16em]">{item.icon}</div>
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
                            {step.title}
                        </h2>
                        <p className="text-text-secondary mt-2">{step.subtitle}</p>
                    </div>

                    {currentStep === 1 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                <div className="rounded-lg border border-border-primary bg-bg-card px-4 py-3 text-sm text-text-muted">
                                    Search groups by issue or location...
                                </div>
                                <div className="mt-3 flex gap-2 flex-wrap">
                                    {['All Causes', 'Water', 'Roads', 'Education'].map((pill) => (
                                        <span key={pill} className={`badge ${pill === 'All Causes' ? 'bg-primary text-white border-primary' : ''}`}>{pill}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {demoData.groups.map((group) => (
                                    <article key={group.id} className={`rounded-xl border p-4 ${group.isHighlighted ? 'bg-primary/5 border-primary/40' : 'bg-bg-card border-border-primary'}`}>
                                        {group.isHighlighted && <p className="text-xs text-primary font-medium mb-2">Suggested for your location</p>}
                                        <div className="flex items-center justify-between text-xs text-text-muted">
                                            <span className="badge">{group.category}</span>
                                            <span>{group.memberCount} members</span>
                                        </div>
                                        <h3 className="mt-3 font-semibold text-text-primary">{group.name}</h3>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {group.pincodes.map((pin) => (
                                                <span key={pin} className="pincode-tag">{pin}</span>
                                            ))}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-5">
                                <div className="flex items-center justify-between text-sm text-text-muted">
                                    <span className="badge">{demoData.mainGroup.category}</span>
                                    <span>Created {demoData.mainGroup.createdAt}</span>
                                </div>
                                <h3 className="text-xl font-bold text-text-primary mt-4">{demoData.mainGroup.name}</h3>
                                <div className="flex flex-wrap gap-3 text-sm text-text-secondary mt-3">
                                    <span>{demoData.mainGroup.memberCount} members</span>
                                    <span>{demoData.mainGroup.pincodes.join(', ')}</span>
                                </div>
                                <button type="button" className="btn btn-primary mt-4">Join This Group</button>
                            </div>
                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h4 className="font-semibold text-text-primary mb-3">Members & Leadership</h4>
                                <div className="space-y-2">
                                    {demoData.members.slice(0, 4).map((member) => (
                                        <div key={member.id} className="rounded-lg border border-border-primary bg-bg-secondary p-3 flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-text-primary">
                                                    {member.name} {member.isLeader ? '(Leader)' : ''}
                                                </div>
                                                <div className="text-xs text-text-muted">Joined {member.joinedDaysAgo} days ago</div>
                                            </div>
                                            <div className="text-sm font-semibold text-primary">{member.trustCount}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-3">
                            {demoData.members.filter((m) => !m.isCurrentUser).map((member) => (
                                <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => setSelectedTrust(member.id)}
                                    className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedTrust === member.id
                                        ? 'bg-primary/5 border-primary'
                                        : 'bg-bg-secondary border-border-primary hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-text-primary">{member.name}</div>
                                            <div className="text-sm text-text-muted">{member.trustCount} supporters</div>
                                        </div>
                                        <div className="text-xs text-text-muted">{member.isLeader ? 'Current leader' : 'Member'}</div>
                                    </div>
                                </button>
                            ))}
                            {selectedTrust && (
                                <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
                                    Trust selection recorded for this demo view.
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-3">
                            {demoData.feedItems.map((item) => (
                                <article key={item.id} className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                    <h4 className="font-medium text-text-primary">{item.title}</h4>
                                    <p className="text-sm text-text-secondary mt-1">{item.preview}</p>
                                    <p className="text-xs text-text-muted mt-2">{item.author} - {item.timestamp}</p>
                                </article>
                            ))}
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="space-y-4">
                            {demoData.campaigns.map((campaign) => (
                                <article key={campaign.id} className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h4 className="font-semibold text-text-primary">{campaign.title}</h4>
                                        <span className="badge bg-success/10 text-success border-success/20">Active</span>
                                    </div>
                                    <div className="mt-3 flex justify-between text-sm text-text-secondary">
                                        <span>{campaign.participantCount} participants</span>
                                        <span>Goal {campaign.goal}</span>
                                    </div>
                                    <div className="mt-2 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${getRatio(campaign.participantCount, campaign.goal)}%` }} />
                                    </div>
                                    <button type="button" className="btn btn-secondary btn-sm mt-4">
                                        {campaign.type === 'email' ? 'Send Email' : 'Sign Petition'}
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}

                    {currentStep === 6 && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                                <h4 className="text-lg font-semibold text-text-primary">Merge for stronger collective impact</h4>
                                <p className="text-sm text-text-secondary mt-2">
                                    Alliance means groups coordinate while staying separate. Merge means member counts combine into one stronger bloc.
                                </p>
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                                    <div className="rounded-lg border border-border-primary bg-bg-card p-3">
                                        <div className="text-2xl font-bold text-text-primary">67</div>
                                        <div className="text-xs text-text-muted">Your group</div>
                                    </div>
                                    <div className="rounded-lg border border-border-primary bg-bg-card p-3">
                                        <div className="text-2xl font-bold text-text-primary">134</div>
                                        <div className="text-xs text-text-muted">Partner group</div>
                                    </div>
                                    <div className="rounded-lg border border-accent/40 bg-accent/10 p-3">
                                        <div className="text-2xl font-bold text-accent">201</div>
                                        <div className="text-xs text-accent">Combined bloc</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                    <button type="button" className="btn btn-secondary">View suggested merges</button>
                                    <button type="button" className="btn btn-primary">Confirm merge</button>
                                </div>
                            </div>
                            <div className="rounded-xl border border-border-primary bg-bg-secondary p-5 text-center">
                                <h4 className="text-xl font-bold text-text-primary">Ready to get started?</h4>
                                <p className="text-text-secondary mt-2">Join citizens organizing around local issues.</p>
                                <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
                                    <Link href="/auth" className="btn btn-primary">Get Started</Link>
                                    <Link href="/discover" className="btn btn-secondary">Browse Groups</Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 7 && (
                        <div className="space-y-5">
                            <div className="space-y-4">
                                {demoData.fundingCampaigns.map((campaign) => (
                                    <article key={campaign.id} className="rounded-xl border border-border-primary bg-bg-secondary p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <h4 className="font-semibold text-text-primary">{campaign.title}</h4>
                                            <span className={`badge ${campaign.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-accent/10 text-accent border-accent/20'}`}>
                                                {campaign.status === 'active' ? 'Active' : 'Completed'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-text-secondary mt-2">{campaign.description}</p>
                                        <div className="mt-3 flex justify-between text-sm text-text-secondary">
                                            <span>
                                                <span className="font-semibold text-success">Rs {campaign.raisedAmount.toLocaleString('en-IN')}</span> raised
                                            </span>
                                            <span>Goal Rs {campaign.goalAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="mt-2 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                                            <div className="h-full bg-success" style={{ width: `${getRatio(campaign.raisedAmount, campaign.goalAmount)}%` }} />
                                        </div>
                                        <div className="mt-2 text-xs text-text-muted">
                                            {campaign.donorCount} supporters {campaign.status === 'active' ? `- ${campaign.daysLeft} days left` : '- campaign completed'}
                                        </div>
                                        {campaign.status === 'active' && (
                                            <button type="button" className="btn btn-primary mt-3">Donate via UPI</button>
                                        )}
                                    </article>
                                ))}
                            </div>
                            <div className="rounded-xl border border-border-primary bg-bg-card p-4">
                                <h4 className="font-semibold text-text-primary mb-3">Transparent Donation Ledger</h4>
                                <div className="space-y-2">
                                    {demoData.recentDonations.map((donation) => (
                                        <div key={donation.id} className="rounded-lg border border-border-primary bg-bg-secondary p-3 flex items-center justify-between">
                                            <div>
                                                <div className="text-sm text-text-primary">{donation.donor}</div>
                                                {donation.message && <div className="text-xs text-text-muted">{donation.message}</div>}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-semibold text-success">Rs {donation.amount.toLocaleString('en-IN')}</div>
                                                <div className="text-xs text-text-muted">{donation.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-5 border-t border-border-primary flex items-center justify-between gap-3">
                        <button type="button" onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1) as StepId)} disabled={currentStep === 1} className="btn btn-secondary disabled:opacity-40">
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
                        <button type="button" onClick={() => setCurrentStep((prev) => Math.min(7, prev + 1) as StepId)} disabled={currentStep === 7} className="btn btn-primary disabled:opacity-40">
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
