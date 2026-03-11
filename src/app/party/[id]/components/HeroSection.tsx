'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useEffect, useState, type RefObject } from 'react';
import type { MemberWithVotes, Party } from '@/types/database';
import { LOCATION_SCOPE_LEVELS, getLocationScopeConfig, getPartyLocationLabel } from '@/types/database';
import { GroupIconBadge } from './PartyPrimitives';

interface HeroSectionProps {
    party: Party;
    memberCount: number;
    leader: MemberWithVotes | null;
    // Icon state (live — may differ from party.icon_svg after edit)
    iconSvg: string | null;
    iconImageUrl: string | null;
    canEditPartyIcon: boolean;
    // Membership
    optimisticIsMember: boolean;
    memberSince: string | null;
    joinLoading: boolean;
    joinDisabled: boolean;
    hasMembershipElsewhere: boolean;
    singleMembershipHint: string;
    // Secondary action hrefs
    createChildGroupHref: string;
    createChildGroupLabel: string;
    createForkHref: string;
    siblingGroups: Array<{ id: string; issue_text: string; icon_svg?: string | null; icon_image_url?: string | null; memberCount: number }>;
    // Alliance / governing
    currentAlliance: { id: string; name: string } | null;
    isGoverning: boolean;
    levelNavigationTargets: Array<{
        id: string;
        issue_text: string;
        location_scope: string;
        is_current: boolean;
    }>;
    // Callbacks
    onJoin: () => void;
    onShare: () => void;
    onOpenTitleImage: () => void;
    onOpenIconPreview: () => void;
    onOpenIconEditor: () => void;
    // Sticky header state (driven by IntersectionObserver in parent)
    heroRef: RefObject<HTMLHeadingElement | null>;
    stickyVisible: boolean;
}

export function HeroSection({
    party,
    memberCount,
    leader,
    iconSvg,
    iconImageUrl,
    canEditPartyIcon,
    optimisticIsMember,
    memberSince,
    joinLoading,
    joinDisabled,
    hasMembershipElsewhere,
    singleMembershipHint,
    createChildGroupHref,
    createChildGroupLabel,
    createForkHref,
    siblingGroups,
    currentAlliance,
    isGoverning,
    levelNavigationTargets,
    onJoin,
    onShare,
    onOpenTitleImage,
    onOpenIconPreview,
    onOpenIconEditor,
    heroRef,
    stickyVisible,
}: HeroSectionProps) {
    const router = useRouter();
    const locationScope = getLocationScopeConfig(party.location_scope || 'district');
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [showSiblingMenu, setShowSiblingMenu] = useState(false);
    const [selectedNavigatorScope, setSelectedNavigatorScope] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const siblingMenuRef = useRef<HTMLDivElement>(null);
    const levelNavigatorRef = useRef<HTMLDivElement>(null);

    const navigableLevels = LOCATION_SCOPE_LEVELS.filter((level) => level.value !== 'national');
    const levelTargetsMap = new Map<string, HeroSectionProps['levelNavigationTargets']>(
        navigableLevels.map((level) => [level.value, []])
    );

    for (const target of levelNavigationTargets) {
        const levelTargets = levelTargetsMap.get(target.location_scope) || [];
        levelTargets.push(target);
        levelTargetsMap.set(target.location_scope, levelTargets);
    }

    for (const [scope, targets] of levelTargetsMap.entries()) {
        levelTargetsMap.set(
            scope,
            [...targets].sort((a, b) => {
                if (a.is_current && !b.is_current) return -1;
                if (!a.is_current && b.is_current) return 1;
                return a.issue_text.localeCompare(b.issue_text);
            })
        );
    }

    const chooserTargets = selectedNavigatorScope
        ? levelTargetsMap.get(selectedNavigatorScope) || []
        : [];

    const handleScopeClick = (scope: string) => {
        const targets = levelTargetsMap.get(scope) || [];
        if (targets.length === 0) return;

        if (targets.length === 1) {
            const [target] = targets;
            if (target.id !== party.id) {
                router.push(`/party/${target.id}`);
            }
            setSelectedNavigatorScope(null);
            return;
        }

        setSelectedNavigatorScope((prev) => (prev === scope ? null : scope));
    };

    useEffect(() => {
        if (!showActionsMenu) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(event.target as Node)) {
                setShowActionsMenu(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowActionsMenu(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showActionsMenu]);

    useEffect(() => {
        if (!showSiblingMenu) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (!siblingMenuRef.current) return;
            if (!siblingMenuRef.current.contains(event.target as Node)) {
                setShowSiblingMenu(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowSiblingMenu(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showSiblingMenu]);

    useEffect(() => {
        if (!selectedNavigatorScope) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (!levelNavigatorRef.current) return;
            if (!levelNavigatorRef.current.contains(event.target as Node)) {
                setSelectedNavigatorScope(null);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setSelectedNavigatorScope(null);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [selectedNavigatorScope]);

    return (
        <>
            {/* ── Sticky mini-header (appears on scroll) ─── */}
            <div
                className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${stickyVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-full pointer-events-none'}`}
            >
                <div className="border-b border-border-primary bg-bg-primary/90 backdrop-blur-md shadow-sm">
                    <div className="container mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                            <GroupIconBadge name={party.issue_text} iconSvg={iconSvg} iconImageUrl={iconImageUrl} size={28} />
                            <span className="truncate text-sm font-semibold text-text-primary">{party.issue_text}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button type="button" onClick={onShare} className="btn btn-secondary btn-sm">Share</button>
                            {!optimisticIsMember ? (
                                <button type="button" onClick={onJoin} disabled={joinDisabled || joinLoading} className="btn btn-primary btn-sm">
                                    {joinLoading ? 'Joining…' : 'Join'}
                                </button>
                            ) : (
                                <span className="inline-flex items-center rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">✓ Joined</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Hero ──────────────────────────────────────── */}
            <section className="pb-6">
                {/* Banner image or gradient placeholder */}
                <div className="relative mb-4">
                    <div className="overflow-hidden rounded-xl border border-border-primary bg-bg-tertiary">
                        {party.title_image_url ? (
                            <button type="button" onClick={onOpenTitleImage} className="block w-full cursor-zoom-in" aria-label="Open full title image">
                                <Image
                                    src={party.title_image_url}
                                    alt={`${party.issue_text} title image`}
                                    className="h-[256px] w-full object-cover"
                                    width={1536}
                                    height={1024}
                                    loading="lazy"
                                />
                            </button>
                        ) : (
                            <div className="h-20 bg-gradient-to-br from-primary/10 via-bg-secondary to-bg-tertiary" aria-hidden="true" />
                        )}
                    </div>

                    {/* Banner-right actions (reddit-style) */}
                    <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                        {!optimisticIsMember ? (
                            <button
                                type="button"
                                onClick={onJoin}
                                disabled={joinDisabled || joinLoading}
                                className="btn btn-primary btn-sm shadow-sm"
                            >
                                {joinLoading ? 'Joining…' : 'Join'}
                            </button>
                        ) : (
                            <span className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                                Joined
                            </span>
                        )}

                        <button
                            type="button"
                            onClick={onShare}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border-primary bg-bg-primary/90 text-text-primary shadow-sm transition hover:bg-bg-secondary"
                            aria-label="Share group"
                            title="Share"
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <path d="M8.6 13.5l6.8 4" />
                                <path d="M15.4 6.5l-6.8 4" />
                            </svg>
                        </button>

                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setShowActionsMenu((prev) => !prev)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border-primary bg-bg-primary/90 text-text-primary shadow-sm transition hover:bg-bg-secondary"
                                aria-label="More actions"
                                aria-haspopup="menu"
                                aria-expanded={showActionsMenu}
                                title="More"
                            >
                                <span aria-hidden="true" className="text-lg leading-none">⋮</span>
                            </button>

                            {showActionsMenu && (
                                <div
                                    role="menu"
                                    className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-lg border border-border-primary bg-bg-primary py-1 shadow-xl"
                                >
                                    <Link
                                        href={createChildGroupHref}
                                        role="menuitem"
                                        onClick={() => setShowActionsMenu(false)}
                                        className="block px-3 py-2 text-sm text-text-primary hover:bg-bg-secondary"
                                    >
                                        {createChildGroupLabel}
                                    </Link>
                                    {createForkHref && (
                                        <Link
                                            href={createForkHref}
                                            role="menuitem"
                                            onClick={() => setShowActionsMenu(false)}
                                            className="block px-3 py-2 text-sm text-text-primary hover:bg-bg-secondary"
                                        >
                                            Fork this group
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Location breadcrumb */}
                <p className="text-sm text-text-muted mb-3">{locationScope.label} · {getPartyLocationLabel(party)}</p>

                {/* Clickable level navigator */}
                <div className="mb-4" ref={levelNavigatorRef}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-text-muted">Jump to level</p>
                    <nav aria-label="Level Navigator">
                        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                            {navigableLevels.map((level) => {
                                const targets = levelTargetsMap.get(level.value) || [];
                                const hasTargets = targets.length > 0;
                                const hasMultipleTargets = targets.length > 1;
                                const isActiveLevel = (party.location_scope || 'district') === level.value;
                                const isCurrentOnlyTarget = targets.length === 1 && targets[0].is_current;
                                const isExpanded = selectedNavigatorScope === level.value;

                                return (
                                    <button
                                        key={level.value}
                                        type="button"
                                        onClick={() => handleScopeClick(level.value)}
                                        disabled={!hasTargets || isCurrentOnlyTarget}
                                        aria-current={isActiveLevel ? 'page' : undefined}
                                        aria-expanded={hasMultipleTargets ? isExpanded : undefined}
                                        aria-controls={hasMultipleTargets ? `level-options-${level.value}` : undefined}
                                        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${isActiveLevel
                                            ? 'border-primary bg-primary/10 text-primary-light font-semibold'
                                            : hasTargets
                                                ? 'border-border-primary bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
                                                : 'border-border-primary/60 bg-bg-tertiary/40 text-text-muted cursor-not-allowed'
                                            } ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}
                                    >
                                        {level.icon} {level.label}
                                        {hasMultipleTargets ? ` (${targets.length})` : ''}
                                        {isCurrentOnlyTarget ? ' • Current' : ''}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {selectedNavigatorScope && chooserTargets.length > 1 && (
                        <div
                            id={`level-options-${selectedNavigatorScope}`}
                            role="region"
                            aria-label={`Choose ${getLocationScopeConfig(selectedNavigatorScope).label} group`}
                            className="mt-3 rounded-xl border border-border-primary bg-bg-secondary/60 p-2"
                        >
                            <div className="mb-2 flex items-center justify-between px-1">
                                <p className="text-xs font-semibold text-text-secondary">
                                    Choose {getLocationScopeConfig(selectedNavigatorScope).label} group
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setSelectedNavigatorScope(null)}
                                    className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-bg-primary hover:text-text-primary"
                                >
                                    Close
                                </button>
                            </div>
                            <div className="space-y-1">
                                {chooserTargets.map((target) => (
                                    <button
                                        key={target.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedNavigatorScope(null);
                                            if (!target.is_current) {
                                                router.push(`/party/${target.id}`);
                                            }
                                        }}
                                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${target.is_current
                                            ? 'border border-primary/40 bg-primary/10 text-primary-light'
                                            : 'text-text-primary hover:bg-bg-primary'
                                            }`}
                                    >
                                        <span className="line-clamp-2">{target.issue_text}</span>
                                        {target.is_current && (
                                            <span className="mt-1 inline-block text-xs text-primary">Current group</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Title row */}
                <div className="flex items-start gap-3">
                    <GroupIconBadge
                        name={party.issue_text}
                        iconSvg={iconSvg}
                        iconImageUrl={iconImageUrl}
                        size={40}
                        clickable={canEditPartyIcon}
                        clickLabel="View full group icon"
                        onClick={onOpenIconPreview}
                        ring={true}
                    />
                    <div className="min-w-0 flex-1">
                        <h1
                            ref={heroRef}
                            className="text-3xl sm:text-4xl font-semibold leading-tight text-text-primary"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            {party.issue_text}
                        </h1>
                        {siblingGroups.length > 0 && (
                            <div className="relative mt-2 inline-block" ref={siblingMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowSiblingMenu((prev) => !prev)}
                                    className="inline-flex items-center gap-1 rounded-full border border-border-primary bg-bg-secondary px-3 py-1 text-xs font-medium text-text-secondary hover:bg-bg-tertiary"
                                    aria-haspopup="menu"
                                    aria-expanded={showSiblingMenu}
                                >
                                    {siblingGroups.length} other {siblingGroups.length === 1 ? 'chapter' : 'chapters'}
                                    <svg
                                        className={`h-3 w-3 transition-transform ${showSiblingMenu ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {showSiblingMenu && (
                                    <div
                                        role="menu"
                                        className="absolute left-0 z-30 mt-2 w-72 overflow-hidden rounded-lg border border-border-primary bg-bg-primary py-1 shadow-xl"
                                    >
                                        <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                                            Other chapters in this area
                                        </p>
                                        {siblingGroups
                                            .slice()
                                            .sort((a, b) => b.memberCount - a.memberCount)
                                            .map((sibling) => (
                                                <Link
                                                    key={sibling.id}
                                                    href={`/party/${sibling.id}`}
                                                    role="menuitem"
                                                    onClick={() => setShowSiblingMenu(false)}
                                                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-secondary"
                                                >
                                                    <span className="line-clamp-1">{sibling.issue_text}</span>
                                                    <span className="shrink-0 text-xs text-text-muted">
                                                        {sibling.memberCount} {sibling.memberCount === 1 ? 'member' : 'members'}
                                                    </span>
                                                </Link>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {canEditPartyIcon && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenIconEditor}>
                            Edit icon
                        </button>
                    )}
                </div>

                {/* Alliance link */}
                {currentAlliance && (
                    <div className="mt-2">
                        <Link
                            href={`/alliance/${currentAlliance.id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline hover:text-primary-dark transition-colors"
                        >
                            🤝 Member of <strong>{currentAlliance.name}</strong> Alliance
                        </Link>
                    </div>
                )}

                {/* Governing badge */}
                {isGoverning && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-600 uppercase tracking-wider">
                        🏛️ Governing Coalition
                    </div>
                )}

                {/* Stats — inline pill row, visible on all screens */}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-bg-secondary border border-border-primary text-text-secondary">
                        👥 {memberCount.toLocaleString('en-IN')} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-bg-secondary border border-border-primary text-text-secondary">
                        👤 {leader ? (leader.display_name || 'Anonymous') : 'No voice yet'}
                    </span>
                </div>

                {/* Hero inline Join / membership status — visible on all screens */}
                <div className="mt-5">
                    {optimisticIsMember ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary">
                                ✓ You&apos;re in
                                {memberSince && (
                                    <span className="text-xs text-primary/70 ml-1">since {new Date(memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                                )}
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={onJoin}
                                disabled={joinDisabled || joinLoading}
                                className="btn btn-primary"
                            >
                                {joinLoading ? 'Joining…' : 'Join This Group'}
                            </button>
                            {hasMembershipElsewhere && (
                                <p className="text-xs text-text-muted max-w-xs">{singleMembershipHint}</p>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Mobile sticky bottom action bar (always shown on small screens) ── */}
            <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden animate-fade-in">
                <div className="border-t border-border-primary bg-bg-primary/95 backdrop-blur-md px-4 py-3 shadow-lg">
                    <div className="flex items-center gap-3">
                        {optimisticIsMember ? (
                            <div className="flex-1 flex items-center gap-1.5 justify-center rounded-lg bg-primary/10 border border-primary/20 py-2.5 text-sm font-medium text-primary">
                                ✓ You&apos;re in
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={onJoin}
                                disabled={joinDisabled || joinLoading}
                                className="btn btn-primary flex-1 py-2.5 text-base"
                            >
                                {joinLoading ? 'Joining…' : 'Join Group'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onShare}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-primary bg-bg-secondary text-text-primary transition hover:bg-bg-tertiary"
                            aria-label="Share group"
                            title="Share"
                        >
                            ↗
                        </button>
                    </div>
                    {hasMembershipElsewhere && !optimisticIsMember && (
                        <p className="mt-1.5 text-center text-xs text-text-muted">{singleMembershipHint}</p>
                    )}
                </div>
            </div>

        </>
    );
}
