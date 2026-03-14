"use client";

import { useMemo, useState } from 'react';
import { MapPin, Hourglass } from 'lucide-react';
import type { Category, Party } from '@/types/database';
import { PartyCard } from '@/components/PartyCard';
import { loadProgressiveDisclosureState } from '@/lib/progressiveDisclosure';

export type PartyListItem = {
    party: Party;
    memberCount: number;

    // Optional enrichment when used from HomeDiscoveryClient
    likeCount?: number;
    likedByMe?: boolean;
};

interface PartyListClientProps {
    partyItems: PartyListItem[];
    categories: Category[];

    // Optional filters / CTAs (used by HomeDiscoveryClient)
    currentUserId?: string | null;
    pincodeFilter?: string | null;
    pincode?: string;
    onPincodeChange?: (value: string) => void;
    nearbyCount?: number | null;
    error?: string | null;
    showJoinCta?: boolean;
    joinLabelByPartyId?: Record<string, string>;
    joinDisabledByPartyId?: Record<string, boolean>;
    onJoinParty?: (partyId: string) => void | Promise<void>;

    // Pagination props
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void | Promise<void>;
    totalCount?: number;
}

const MAX_VISIBLE_CATEGORIES_FIRST_TIME = 5;

export function PartyListClient({
    partyItems,
    categories,
    currentUserId = null,
    pincodeFilter = null,
    pincode = '',
    onPincodeChange,
    nearbyCount = null,
    error = null,
    showJoinCta = false,
    joinLabelByPartyId = {},
    joinDisabledByPartyId = {},
    onJoinParty,
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
    totalCount,
}: PartyListClientProps) {
    const disclosureStage = loadProgressiveDisclosureState().stage;

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showAllCategories, setShowAllCategories] = useState(() => disclosureStage !== 'first_time');
    const [isFirstTime] = useState(() => disclosureStage === 'first_time');
    const [filtersExpanded, setFiltersExpanded] = useState(() => disclosureStage !== 'first_time');

    const showPincodeFilters = Boolean(onPincodeChange);

    const filteredParties = useMemo(() => {
        let items = partyItems;
        if (pincodeFilter && pincodeFilter.length === 6) {
            items = items.filter(item => item.party.pincodes.includes(pincodeFilter));
        }
        if (selectedCategory !== 'all') {
            items = items.filter(item => item.party.category_id === selectedCategory);
        }
        return items;
    }, [partyItems, selectedCategory, pincodeFilter]);

    // Limit visible categories for first-time users
    const visibleCategories = useMemo(() => {
        if (showAllCategories || !isFirstTime) {
            return categories;
        }
        return categories.slice(0, MAX_VISIBLE_CATEGORIES_FIRST_TIME);
    }, [categories, showAllCategories, isFirstTime]);

    const hasMoreCategories = categories.length > MAX_VISIBLE_CATEGORIES_FIRST_TIME && !showAllCategories && isFirstTime;

    // Note: When category is filtered client-side, we hide Load More since server pagination
    // doesn't know about client-side category filter. For full server-side filtering,
    // we'd need to pass category to the API call.
    const showLoadMore = hasMore && onLoadMore && selectedCategory === 'all' && !pincodeFilter;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-sm uppercase tracking-[0.2em] text-text-muted">Filters</h3>
                    <p className="text-xs text-text-muted">
                        Showing {filteredParties.length}{totalCount && selectedCategory === 'all' ? ` of ${totalCount}` : ''} issue-parties
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setFiltersExpanded((prev) => !prev)}
                    className="btn btn-secondary btn-sm"
                >
                    {filtersExpanded ? 'Hide filters' : 'Show filters'}
                </button>
            </div>

            {filtersExpanded && (
                <div className="space-y-4">
                    {showPincodeFilters && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Filter by Location
                                </h4>
                                <p className="text-xs text-text-secondary">
                                    Enter your 6-digit postal code to see parties in your area.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                <input
                                    className="input sm:w-[180px]"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="e.g. 302001"
                                    value={pincode}
                                    onChange={(event) => onPincodeChange?.(event.target.value)}
                                    aria-label="Postal code"
                                />
                                {pincode && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => onPincodeChange?.('')}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {showPincodeFilters && pincode.length > 0 && pincode.length !== 6 && (
                        <p className="text-xs text-warning">
                            Postal code must be 6 digits.
                        </p>
                    )}

                    {showPincodeFilters && pincode.length === 6 && nearbyCount !== null && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="badge bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {pincode}
                            </span>
                            <span className="text-sm text-text-muted">
                                {nearbyCount === 0
                                    ? 'No parties in this area yet — be the first!'
                                    : `${nearbyCount} part${nearbyCount === 1 ? 'y' : 'ies'} near you`}
                            </span>
                        </div>
                    )}

                    {showPincodeFilters && error && (
                        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('all')}
                            className={`badge px-3 py-1.5 text-xs font-semibold transition-colors ${selectedCategory === 'all'
                                ? 'bg-primary text-white border-primary'
                                : 'bg-bg-tertiary text-text-secondary border-border-primary hover:bg-bg-secondary'
                                }`}
                        >
                            All
                        </button>
                        {visibleCategories.map(category => (
                            <button
                                key={category.id}
                                type="button"
                                onClick={() => setSelectedCategory(category.id)}
                                className={`badge px-3 py-1.5 text-xs font-semibold transition-colors ${selectedCategory === category.id
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-bg-tertiary text-text-secondary border-border-primary hover:bg-bg-secondary'
                                    }`}
                            >
                                {category.name}
                            </button>
                        ))}
                        {hasMoreCategories && (
                            <button
                                type="button"
                                onClick={() => setShowAllCategories(true)}
                                className="badge px-3 py-1.5 text-xs font-semibold transition-colors bg-bg-tertiary text-primary border-primary/30 hover:bg-primary/10"
                            >
                                +{categories.length - MAX_VISIBLE_CATEGORIES_FIRST_TIME} more
                            </button>
                        )}
                    </div>
                </div>
            )}

            {filteredParties.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredParties.map(({ party, memberCount, likeCount, likedByMe }) => (
                            <PartyCard
                                key={party.id}
                                party={party}
                                memberCount={memberCount}
                                currentUserId={currentUserId}
                                initialLiked={likedByMe || false}
                                initialLikeCount={likeCount || 0}
                                showJoin={showJoinCta}
                                joinLabel={joinLabelByPartyId[party.id] || 'Join'}
                                joinDisabled={joinDisabledByPartyId[party.id] || false}
                                onJoin={onJoinParty ? () => { void onJoinParty(party.id); } : undefined}
                            />
                        ))}
                    </div>

                    {/* Load More Button */}
                    {showLoadMore && (
                        <div className="flex justify-center pt-4">
                            <button
                                type="button"
                                onClick={() => void onLoadMore()}
                                disabled={isLoadingMore}
                                className="btn btn-secondary px-8 py-3 text-sm font-medium"
                            >
                                {isLoadingMore ? (
                                    <span className="flex items-center gap-2">
                                        <Hourglass className="w-4 h-4 animate-spin" />
                                        Loading...
                                    </span>
                                ) : (
                                    <span>Load More Parties</span>
                                )}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="empty-state">
                    <div className="empty-state-icon">🔎</div>
                    <p className="text-text-muted">No issue-parties match these filters yet.</p>
                </div>
            )}
        </div>
    );
}
