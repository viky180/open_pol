'use client';

import Link from 'next/link';
import { PartyLikeButton } from '@/components/PartyLikeButton';
import { getCreateChildGroupLabel } from '@/lib/partyCreation';
import type { MemberWithVotes, Party } from '@/types/database';
import { getLocationScopeConfig, getPartyLocationLabel } from '@/types/database';
import type { PrimaryAction } from './PartyDetailShared';
import { MobilePartySummary } from './MobilePartySummary';

function joinClasses(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

export type PartySectionTab<T extends string = string> = {
    id: T;
    label: string;
    sectionId: string;
};

interface PartyHeroHeaderProps {
    party: Party;
    currentUserId: string | null;
    likedByMe: boolean;
    likeCount: number;
    totalBackers: number;
    leaderName: string | null;
}

export function PartyHeroHeader({
    party,
    currentUserId,
    likedByMe,
    likeCount,
    totalBackers,
    leaderName,
}: PartyHeroHeaderProps) {
    const locationScope = getLocationScopeConfig(party.location_scope || 'district');

    return (
        <>
            <div className="mb-8 pl-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-bg-secondary text-text-secondary border border-border-secondary">
                        {locationScope.icon} {locationScope.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-bg-secondary text-text-secondary border border-border-secondary">
                        Location: {getPartyLocationLabel(party)}
                    </span>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight mb-0 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                        {party.issue_text}
                    </h1>
                    <div className="shrink-0 pt-1">
                        <PartyLikeButton
                            partyId={party.id}
                            currentUserId={currentUserId}
                            initialLiked={likedByMe}
                            initialLikeCount={likeCount}
                        />
                    </div>
                </div>
            </div>

            <MobilePartySummary
                totalBackers={totalBackers}
                leaderName={leaderName}
            />
        </>
    );
}

interface PartySectionTabsProps<T extends string = string> {
    tabs: PartySectionTab<T>[];
    activeTab: T;
    onTabClick: (tab: T) => void;
    className?: string;
}

export function PartySectionTabs<T extends string>({
    tabs,
    activeTab,
    onTabClick,
    className,
}: PartySectionTabsProps<T>) {
    return (
        <nav
            id="party-section-tabs"
            className={joinClasses('party-section-tabs', className)}
            role="tablist"
            aria-label="Party section navigation"
        >
            {tabs.map(tab => (
                <button
                    id={`party-tab-${tab.id}`}
                    key={tab.id}
                    type="button"
                    role="tab"
                    title={`Go to ${tab.label} section`}
                    aria-controls={tab.sectionId}
                    aria-selected={activeTab === tab.id}
                    onClick={() => onTabClick(tab.id)}
                    className={`party-section-tabs__item ${activeTab === tab.id ? 'party-section-tabs__item--active' : ''}`}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    );
}

interface SectionSummaryCardProps {
    title: string;
    subtitle: string;
}

export function SectionSummaryCard({ title, subtitle }: SectionSummaryCardProps) {
    return (
        <div className="brand-panel p-4 mb-6">
            <div className="text-sm font-semibold text-text-primary">{title}</div>
            <div className="text-xs text-text-muted mt-1">{subtitle}</div>
        </div>
    );
}

interface LeaderSnapshotCardProps {
    leader: MemberWithVotes | null;
    leaderTrustLine: string;
}

export function LeaderSnapshotCard({ leader, leaderTrustLine }: LeaderSnapshotCardProps) {
    return (
        <div className="brand-panel p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    Current Voice
                </span>
                {leader && (
                    <span className="text-xs text-success font-medium">
                        Trusted by {leader.trust_votes} {leader.trust_votes === 1 ? 'member' : 'members'}
                    </span>
                )}
            </div>
            {leader ? (
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-lg">
                        {(leader.display_name || 'A')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-text-primary truncate">
                            {leader.display_name || 'Anonymous'}
                        </div>
                        <div className="text-sm text-text-muted mt-0.5">
                            {leaderTrustLine}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-bg-tertiary border-2 border-dashed border-border-secondary flex items-center justify-center text-2xl">
                        ?
                    </div>
                    <div>
                        <div className="font-medium text-text-secondary">
                            No voice yet
                        </div>
                        <div className="text-sm text-text-muted">
                            Join and vote to establish one
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function LeadershipHowItWorks() {
    return (
        <details className="text-sm text-text-muted mb-6">
            <summary className="cursor-pointer hover:text-text-secondary transition-colors">
                How does this work?
            </summary>
            <ul className="mt-3 p-4 rounded-xl bg-bg-tertiary/50 space-y-2 list-disc list-inside">
                <li>Join with one active membership at a time.</li>
                <li>Back someone as your voice.</li>
                <li>Trust expires automatically and cannot become permanent power.</li>
                <li>Leave anytime with immediate effect.</li>
            </ul>
        </details>
    );
}

interface PartyMembershipActionsProps {
    primaryAction: PrimaryAction;
    createChildGroupHref: string;
    parentScope?: string | null;
    createForkHref?: string | null;
    hasMembershipElsewhere: boolean;
    singleMembershipHint: string;
    mode: 'mobile' | 'sidebar';
}

export function PartyMembershipActions({
    primaryAction,
    createChildGroupHref,
    parentScope,
    createForkHref,
    hasMembershipElsewhere,
    singleMembershipHint,
    mode,
}: PartyMembershipActionsProps) {
    const isSidebar = mode === 'sidebar';
    const createChildGroupLabel = getCreateChildGroupLabel(parentScope);

    return (
        <div className={isSidebar ? undefined : 'lg:hidden mb-6'}>
            <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className={joinClasses('btn btn-primary cta-prominent', isSidebar && 'mb-4')}
            >
                {primaryAction.label}
            </button>
            <Link
                href={createChildGroupHref}
                className={joinClasses('btn btn-secondary w-full', isSidebar ? 'mb-3' : 'mt-2')}
            >
                {createChildGroupLabel}
            </Link>
            {createForkHref && (
                <Link
                    href={createForkHref}
                    className={joinClasses('btn btn-secondary w-full', isSidebar ? 'mb-3' : 'mt-2')}
                >
                    Challenge this group
                </Link>
            )}
            {hasMembershipElsewhere && (
                <p className={joinClasses('text-xs text-text-muted text-center', isSidebar ? 'mb-4' : 'mt-2')}>
                    {singleMembershipHint}
                </p>
            )}
        </div>
    );
}

interface JoinConfirmationBannerProps {
    onDismiss: () => void;
    onChooseRepresentative: () => void;
    onAskQuestion: () => void;
}

export function JoinConfirmationBanner({
    onDismiss,
    onChooseRepresentative,
    onAskQuestion,
}: JoinConfirmationBannerProps) {
    return (
        <div className="mb-6 rounded-2xl border border-border-primary bg-bg-secondary p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">You joined</div>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss join confirmation"
                    className="text-text-muted hover:text-text-primary transition-colors text-sm"
                >
                    x
                </button>
            </div>
            <h3 className="text-base font-semibold text-text-primary mt-2">
                You&apos;re in. Choose who speaks for you next.
            </h3>
            <p className="text-sm text-text-secondary mt-2">
                You can leave anytime. Your choice expires automatically.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={onChooseRepresentative}
                    className="btn btn-primary btn-sm"
                >
                    Choose a voice
                </button>
                <button
                    type="button"
                    onClick={onAskQuestion}
                    className="btn btn-secondary btn-sm"
                >
                    Ask a question
                </button>
            </div>
        </div>
    );
}

interface QaPreviewCardProps {
    totalQuestions: number;
    responseRate: number;
    unansweredQuestions: number;
    onOpenAccountability: () => void;
}

export function QaPreviewCard({
    totalQuestions,
    responseRate,
    unansweredQuestions,
    onOpenAccountability,
}: QaPreviewCardProps) {
    return (
        <div className="rounded-xl border border-border-primary bg-bg-tertiary/50 p-4 mb-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-medium text-text-primary">
                        {totalQuestions} public {totalQuestions === 1 ? 'question' : 'questions'}
                    </div>
                    <div className="text-sm text-text-muted mt-0.5">
                        {responseRate}% response rate
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onOpenAccountability}
                    className="text-sm text-primary font-medium hover:underline"
                >
                    View all {'->'}
                </button>
            </div>
            {unansweredQuestions > 0 && (
                <div className="mt-2 text-xs text-warning">
                    {unansweredQuestions} awaiting response
                </div>
            )}
        </div>
    );
}
