'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { MemberWithVotes, Party } from '@/types/database';
import { getLocationScopeConfig, getPartyLocationLabel } from '@/types/database';
import { GroupIconBadge } from './PartyPrimitives';

interface HeroSectionProps {
    party: Party;
    memberCount: number;
    leader: MemberWithVotes | null;
    iconSvg: string | null;
    iconImageUrl: string | null;
    canEditPartyIcon: boolean;
    optimisticIsMember: boolean;
    memberSince: string | null;
    joinLoading: boolean;
    joinDisabled: boolean;
    hasMembershipElsewhere: boolean;
    singleMembershipHint: string;
    createChildGroupHref: string;
    createChildGroupLabel: string;
    createForkHref: string;
    siblingGroups: Array<{ id: string; issue_text: string; icon_svg?: string | null; icon_image_url?: string | null; memberCount: number }>;
    currentAlliance: { id: string; name: string } | null;
    isGoverning: boolean;
    onJoin: () => void;
    onShare: () => void;
    onOpenTitleImage: () => void;
    onOpenIconPreview: () => void;
    onOpenIconEditor: () => void;
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
    onJoin,
    onShare,
    onOpenTitleImage,
    onOpenIconPreview,
    onOpenIconEditor,
    heroRef,
    stickyVisible,
}: HeroSectionProps) {
    const locationScope = getLocationScopeConfig(party.location_scope || 'district');
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [showSiblingMenu, setShowSiblingMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const siblingMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showActionsMenu) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
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
            if (!siblingMenuRef.current?.contains(event.target as Node)) {
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

    return (
        <>
            <div
                className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${stickyVisible ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'}`}
            >
                <div className="border-b border-border-primary bg-bg-primary/90 shadow-sm backdrop-blur-md">
                    <div className="container mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                            <GroupIconBadge name={party.issue_text} iconSvg={iconSvg} iconImageUrl={iconImageUrl} size={28} />
                            <span className="truncate text-sm font-semibold text-text-primary">{party.issue_text}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button type="button" onClick={onShare} className="btn btn-secondary btn-sm">Share</button>
                            {!optimisticIsMember ? (
                                <button type="button" onClick={onJoin} disabled={joinDisabled || joinLoading} className="btn btn-primary btn-sm">
                                    {joinLoading ? 'Joining...' : 'Join'}
                                </button>
                            ) : (
                                <span className="inline-flex items-center rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Joined</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <section className="pb-6">
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

                    <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                        {!optimisticIsMember ? (
                            <button
                                type="button"
                                onClick={onJoin}
                                disabled={joinDisabled || joinLoading}
                                className="btn btn-primary btn-sm shadow-sm"
                            >
                                {joinLoading ? 'Joining...' : 'Join'}
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
                                <span aria-hidden="true" className="text-lg leading-none">...</span>
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

                <p className="mb-3 text-sm text-text-muted">{locationScope.label} · {getPartyLocationLabel(party)}</p>

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
                            className="text-3xl font-semibold leading-tight text-text-primary sm:text-4xl"
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

                {currentAlliance && (
                    <div className="mt-2">
                        <Link
                            href={`/alliance/${currentAlliance.id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-dark hover:underline"
                        >
                            Member of <strong>{currentAlliance.name}</strong> Alliance
                        </Link>
                    </div>
                )}

                {isGoverning && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-600">
                        Governing coalition
                    </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-primary bg-bg-secondary px-3 py-1 text-sm font-medium text-text-secondary">
                        {memberCount.toLocaleString('en-IN')} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-primary bg-bg-secondary px-3 py-1 text-sm font-medium text-text-secondary">
                        {leader ? (leader.display_name || 'Anonymous') : 'No voice yet'}
                    </span>
                </div>

                <div className="mt-5">
                    {optimisticIsMember ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                                You&apos;re in
                                {memberSince && (
                                    <span className="ml-1 text-xs text-primary/70">
                                        since {new Date(memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                    </span>
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
                                {joinLoading ? 'Joining...' : 'Join This Group'}
                            </button>
                            {hasMembershipElsewhere && (
                                <p className="max-w-xs text-xs text-text-muted">{singleMembershipHint}</p>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <div className="fixed inset-x-0 bottom-0 z-40 animate-fade-in sm:hidden">
                <div className="border-t border-border-primary bg-bg-primary/95 px-4 py-3 shadow-lg backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        {optimisticIsMember ? (
                            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 py-2.5 text-sm font-medium text-primary">
                                You&apos;re in
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={onJoin}
                                disabled={joinDisabled || joinLoading}
                                className="btn btn-primary flex-1 py-2.5 text-base"
                            >
                                {joinLoading ? 'Joining...' : 'Join Group'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onShare}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-primary bg-bg-secondary text-text-primary transition hover:bg-bg-tertiary"
                            aria-label="Share group"
                            title="Share"
                        >
                            Share
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
