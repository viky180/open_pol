'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Party } from '@/types/database';

export type PartyDetailTabId = 'about' | 'activity' | 'people' | 'petitions' | 'alliances';

type ActivityItem = {
    id: string;
    type: 'post' | 'leader_message' | 'question' | 'milestone';
    title: string;
    preview: string;
    created_at: string;
};

type PetitionCampaign = {
    id: string;
    title: string;
    description: string;
    target_signatures: number;
    status: string;
    ends_at: string;
    created_at: string;
    signatures: number;
};

type PeopleRow = {
    key: string;
    display: string;
    trust: number;
    joined: string;
};

interface PartyDetailTabsProps {
    activeTab: PartyDetailTabId;
    onChange: (tab: PartyDetailTabId) => void;
}

function PanelHeader({
    label,
    title,
    action,
}: {
    label: string;
    title: string;
    action?: ReactNode;
}) {
    return (
        <div className="mb-4 flex items-end justify-between gap-3">
            <div>
                <p className="issue-section-kicker">{label}</p>
                <h2
                    className="mt-2 text-2xl leading-tight text-text-primary"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    {title}
                </h2>
            </div>
            {action}
        </div>
    );
}

export function PartyDetailTabs({ activeTab, onChange }: PartyDetailTabsProps) {
    return (
        <nav
            id="party-tabs"
            className="issue-segment-bar sticky top-3 z-20 shadow-[0_10px_28px_rgba(21,33,23,0.08)] backdrop-blur-sm"
            role="tablist"
            aria-label="Group detail sections"
        >
            {([
                ['about', 'Overview'],
                ['activity', 'Activity'],
                ['people', 'Members'],
                ['petitions', 'Petitions'],
                ['alliances', 'Coalitions'],
            ] as Array<[PartyDetailTabId, string]>).map(([id, label]) => (
                <button
                    id={`party-tab-${id}`}
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === id}
                    aria-controls={`party-panel-${id}`}
                    tabIndex={activeTab === id ? 0 : -1}
                    onClick={() => onChange(id)}
                    className={`issue-segment-button ${activeTab === id ? 'issue-segment-button--active' : ''}`}
                >
                    {label}
                </button>
            ))}
        </nav>
    );
}

interface AboutTabPanelProps {
    party: Party;
    currentParentParty: Party | null;
    testimonials: string[];
}

export function AboutTabPanel({
    party,
    currentParentParty,
    testimonials,
}: AboutTabPanelProps) {
    const fallbackTestimonials = [
        '"People here listen and act quickly."',
        '"I finally feel represented on this issue."',
    ];

    return (
        <section
            id="party-panel-about"
            role="tabpanel"
            aria-labelledby="party-tab-about"
            className="issue-card animate-fade-in"
        >
            <PanelHeader label="About this group" title="What this group is building" />
            <p className="text-sm leading-7 text-text-secondary">
                {party.issue_text}. This group gathers local members around one clear public demand,
                pushes that support upward through the representation path above, and keeps leadership accountable in
                public.
            </p>

            <div className="issue-section-rule" />

            <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-border-primary bg-bg-secondary/70 p-4">
                    <p className="issue-section-kicker">Parent group</p>
                    {currentParentParty ? (
                        <Link
                            href={`/party/${currentParentParty.id}`}
                            className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline"
                        >
                            {currentParentParty.issue_text}
                        </Link>
                    ) : (
                        <p className="mt-2 text-sm text-text-muted">No parent group linked yet.</p>
                    )}
                </div>

                <div className="rounded-2xl border border-border-primary bg-bg-secondary/70 p-4">
                    <p className="issue-section-kicker">Member comments</p>
                    <div className="mt-3 space-y-3">
                        {(testimonials.length > 0 ? testimonials : fallbackTestimonials).map((quote, index) => (
                            <p
                                key={`${quote}-${index}`}
                                className="rounded-xl border border-border-primary bg-bg-card px-3 py-3 text-sm italic text-text-secondary"
                            >
                                {quote}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

interface ActivityTabPanelProps {
    activityItems: ActivityItem[];
}

export function ActivityTabPanel({ activityItems }: ActivityTabPanelProps) {
    return (
        <section
            id="party-panel-activity"
            role="tabpanel"
            aria-labelledby="party-tab-activity"
            className="issue-card animate-fade-in"
        >
            <PanelHeader label="Timeline" title="Latest public movement" />
            <div className="space-y-3">
                {activityItems.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border-secondary bg-bg-secondary px-4 py-8 text-center text-sm text-text-muted">
                        No activity yet.
                    </p>
                ) : (
                    activityItems.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-border-primary bg-bg-secondary/70 p-4">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                                <span className="shrink-0 text-[11px] text-text-muted">
                                    {new Date(item.created_at).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                    })}
                                </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">{item.preview}</p>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}

interface PeopleTabPanelProps {
    memberCountLive: number;
    showPeopleNames: boolean;
    onToggleShowPeopleNames: (show: boolean) => void;
    peopleRows: PeopleRow[];
}

export function PeopleTabPanel({
    memberCountLive,
    showPeopleNames,
    onToggleShowPeopleNames,
    peopleRows,
}: PeopleTabPanelProps) {
    return (
        <section
            id="party-panel-people"
            role="tabpanel"
            aria-labelledby="party-tab-people"
            className="issue-card animate-fade-in"
        >
            <PanelHeader
                label="People"
                title={`${memberCountLive.toLocaleString('en-IN')} members here`}
                action={
                    <label className="inline-flex items-center gap-2 rounded-full border border-border-primary bg-bg-secondary px-3 py-2 text-xs font-semibold text-text-secondary">
                        <input
                            type="checkbox"
                            checked={showPeopleNames}
                            onChange={(e) => onToggleShowPeopleNames(e.target.checked)}
                        />
                        Show member names
                    </label>
                }
            />

            <div className="space-y-3">
                {peopleRows.map((person, index) => (
                    <div key={person.key} className="rounded-2xl border border-border-primary bg-bg-secondary/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-[var(--iux-ochre2)]">
                                    {index + 1}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-text-primary">{person.display}</p>
                                    <p className="text-xs text-text-muted">Joined {person.joined}</p>
                                </div>
                            </div>
                            <span className="rounded-full border border-border-primary bg-bg-card px-3 py-1 text-xs font-semibold text-text-secondary">
                                Support {person.trust}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

interface PetitionsTabPanelProps {
    petitionCampaigns: PetitionCampaign[];
    canStartNewPetition: boolean;
    onStartNewPetition: () => void;
}

export function PetitionsTabPanel({
    petitionCampaigns,
    canStartNewPetition,
    onStartNewPetition,
}: PetitionsTabPanelProps) {
    return (
        <section
            id="party-panel-petitions"
            role="tabpanel"
            aria-labelledby="party-tab-petitions"
            className="issue-card animate-fade-in"
        >
            <PanelHeader
                label="Petitions"
                title="Campaign public support"
                action={canStartNewPetition ? (
                    <button
                        type="button"
                        onClick={onStartNewPetition}
                        className="btn btn-primary btn-sm"
                    >
                        Start New Petition
                    </button>
                ) : undefined}
            />

            <div className="space-y-3">
                {petitionCampaigns.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border-secondary bg-bg-secondary px-4 py-8 text-center text-sm text-text-muted">
                        {canStartNewPetition
                            ? 'No active petitions right now. Start the first campaign for this group.'
                            : 'No active petitions right now.'}
                    </p>
                ) : (
                    petitionCampaigns.map((campaign) => {
                        const progress = Math.min(
                            100,
                            Math.round((campaign.signatures / Math.max(1, campaign.target_signatures)) * 100)
                        );

                        return (
                            <div key={campaign.id} className="rounded-2xl border border-border-primary bg-bg-secondary/70 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-text-primary">{campaign.title}</p>
                                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                        {campaign.status}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-text-secondary">{campaign.description}</p>
                                <div className="mt-3 overflow-hidden rounded-full bg-bg-tertiary">
                                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                                </div>
                                <p className="mt-2 text-xs text-text-muted">
                                    {campaign.signatures.toLocaleString('en-IN')} / {campaign.target_signatures.toLocaleString('en-IN')} signatures
                                </p>
                                <p className="mt-1 text-xs text-text-muted">
                                    Ends{' '}
                                    {new Date(campaign.ends_at).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}

interface AlliancesTabPanelProps {
    currentAlliance: { id: string; name: string; combinedMemberCount: number; leaderName: string | null } | null;
}

export function AlliancesTabPanel({ currentAlliance }: AlliancesTabPanelProps) {
    return (
        <section
            id="party-panel-alliances"
            role="tabpanel"
            aria-labelledby="party-tab-alliances"
            className="issue-card animate-fade-in"
        >
            <PanelHeader
                label="Coalitions"
                title="Coalition and combined reach"
                action={
                    <Link href="/alliance/create" className="btn btn-secondary btn-sm">
                        Propose coalition
                    </Link>
                }
            />

            {currentAlliance ? (
                <div className="rounded-2xl border border-border-primary bg-bg-secondary/70 p-4">
                    <p className="text-base font-semibold text-text-primary">{currentAlliance.name}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-border-primary bg-bg-card px-3 py-3">
                            <p className="issue-section-kicker">Combined Members</p>
                            <p className="mt-2 text-2xl text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                                {currentAlliance.combinedMemberCount.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border-primary bg-bg-card px-3 py-3">
                            <p className="issue-section-kicker">Coordinator</p>
                            <p className="mt-2 text-sm font-semibold text-text-primary">
                                {currentAlliance.leaderName || 'Not named yet'}
                            </p>
                        </div>
                    </div>
                    <Link
                        href={`/alliance/${currentAlliance.id}`}
                        className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
                    >
                        Open alliance details
                    </Link>
                </div>
            ) : (
                <p className="rounded-2xl border border-dashed border-border-secondary bg-bg-secondary px-4 py-8 text-center text-sm text-text-muted">
                    No current alliance for this group.
                </p>
            )}
        </section>
    );
}

interface RecentActivityPanelProps {
    activityItems: ActivityItem[];
}

export function RecentActivityPanel({ activityItems }: RecentActivityPanelProps) {
    return (
        <section className="issue-card issue-card--soft animate-fade-in">
            <PanelHeader label="Quick Read" title="A few recent signals" />
            <div className="space-y-3">
                {activityItems.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border-secondary bg-bg-card px-4 py-8 text-center text-sm text-text-muted">
                        No recent items yet.
                    </p>
                ) : (
                    activityItems.map((item) => (
                        <div key={`teaser-${item.id}`} className="rounded-2xl border border-border-primary bg-bg-card px-4 py-3">
                            <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                            <p className="mt-1 text-sm leading-6 text-text-secondary">{item.preview}</p>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
