"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Users, Landmark, Hourglass } from 'lucide-react';
import type { Party } from '@/types/database';
import { getLocationScopeConfig, getPartyLocationLabel } from '@/types/database';
import { LocationScopeIcon } from '@/lib/locationIcons';

interface PartyCardProps {
    party: Party;
    memberCount?: number;
    showStats?: boolean;
    currentUserId?: string | null;
    initialLiked?: boolean;
    initialLikeCount?: number;
    isGoverning?: boolean;

    // Optional quick CTA (used for join funnel on home)
    showJoin?: boolean;
    joinLabel?: string;
    joinDisabled?: boolean;
    onJoin?: () => void;
}

export function PartyCard({
    party,
    memberCount = 0,
    showJoin = false,
    joinLabel = 'Join',
    joinDisabled = false,
    onJoin,
    isGoverning = false,
}: PartyCardProps) {
    const scopeConfig = getLocationScopeConfig(party.location_scope || 'district');
    const locationLabel = getPartyLocationLabel(party);

    return (
        <div className="rounded-xl border border-border-primary bg-white p-4 hover:border-primary/30 transition-colors">
            {party.title_image_url && (
                <div className="mb-3 overflow-hidden rounded-lg border border-border-primary bg-bg-tertiary">
                    <Image
                        src={party.title_image_url}
                        alt={`${party.issue_text} title image`}
                        className="h-36 w-full object-cover"
                        width={1200}
                        height={360}
                        loading="lazy"
                    />
                </div>
            )}

            {/* Location scope label */}
            <p className="text-xs text-text-muted mb-1 flex items-center gap-1 flex-wrap">
                <LocationScopeIcon iconName={scopeConfig.icon} className="w-3.5 h-3.5" /> {scopeConfig.label} · {locationLabel}
                {isGoverning && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                        <Landmark className="w-3 h-3" /> Governing
                    </span>
                )}
            </p>

            {/* Group name — clickable */}
            <Link href={`/group/${party.id}`} className="block no-underline">
                <h3 className="text-[15px] font-semibold text-text-primary leading-snug line-clamp-2 hover:text-primary transition-colors">
                    {party.issue_text}
                </h3>
            </Link>

            {/* Stats */}
            <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {memberCount} members
            </p>

            {/* Join CTA — only when showJoin is true */}
            {showJoin && (
                <div className="mt-3 flex items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-primary btn-sm flex-1 sm:flex-none"
                        disabled={joinDisabled}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onJoin?.();
                        }}
                    >
                        {joinLabel === 'Joining…' ? (
                            <span className="flex items-center justify-center gap-2">
                                <Hourglass className="w-4 h-4 animate-spin" />
                                Joining…
                            </span>
                        ) : (
                            <>{joinLabel}</>
                        )}
                    </button>
                    <Link
                        href={`/group/${party.id}`}
                        className="text-xs text-text-muted hover:text-primary transition-colors hidden sm:inline"
                    >
                        View details →
                    </Link>
                </div>
            )}
        </div>
    );
}
