"use client";

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import type { Party, Category, LocationScope } from '@/types/database';
import { LOCATION_SCOPE_LEVELS, getLocationScopeConfig, getPartyLocationLabel } from '@/types/database';
import { createPartyUrl } from '@/lib/createPartyUrl';
import { LocationScopeIcon } from '@/lib/locationIcons';

interface GroupItem {
    party: Party;
    memberCount: number;
    lastActiveAt?: string | null;
    parentName?: string;
}

interface GroupDiscoveryProps {
    groups: GroupItem[];
    categories: Category[];
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void;
}

type LocationScopeFilter = 'all' | LocationScope;
type ActivityFilter = 'all' | 'active' | 'quiet';
type SizeFilter = 'all' | 'small' | 'medium' | 'large';

function getRelativeTime(dateString: string | null | undefined): string {
    if (!dateString) return 'No activity yet';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    return 'Over a month ago';
}

function matchesLocationScope(locationScope: string | undefined, filter: LocationScopeFilter): boolean {
    if (filter === 'all') return true;
    return (locationScope || 'district') === filter;
}

function matchesActivity(lastActiveAt: string | null | undefined, filter: ActivityFilter): boolean {
    if (filter === 'all') return true;

    if (!lastActiveAt) {
        return filter === 'quiet';
    }

    const date = new Date(lastActiveAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (filter === 'active') return diffDays <= 7;
    if (filter === 'quiet') return diffDays > 7;
    return true;
}

function matchesSize(memberCount: number, filter: SizeFilter): boolean {
    if (filter === 'all') return true;
    if (filter === 'small') return memberCount <= 10;
    if (filter === 'medium') return memberCount > 10 && memberCount <= 50;
    if (filter === 'large') return memberCount > 50;
    return true;
}

export function GroupDiscovery({
    groups,
    categories,
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
}: GroupDiscoveryProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [locationScopeFilter, setLocationScopeFilter] = useState<LocationScopeFilter>('all');
    const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
    const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');

    const categoryMap = useMemo(() => {
        const map: Record<string, string> = {};
        categories.forEach(cat => {
            map[cat.id] = cat.name;
        });
        return map;
    }, [categories]);

    const filteredGroups = useMemo(() => {
        return groups.filter(item => {
            // Search filter - searches issue text
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const issueMatch = item.party.issue_text.toLowerCase().includes(query);
                const categoryName = item.party.category_id ? categoryMap[item.party.category_id] : '';
                const categoryMatch = categoryName.toLowerCase().includes(query);
                if (!issueMatch && !categoryMatch) return false;
            }

            // Impact Area Filter
            if (!matchesLocationScope(item.party.location_scope, locationScopeFilter)) return false;

            // Activity filter
            if (!matchesActivity(item.lastActiveAt, activityFilter)) return false;

            // Size filter
            if (!matchesSize(item.memberCount, sizeFilter)) return false;

            return true;
        });
    }, [groups, searchQuery, locationScopeFilter, activityFilter, sizeFilter, categoryMap]);

    const clearFilters = useCallback(() => {
        setSearchQuery('');
        setLocationScopeFilter('all');
        setActivityFilter('all');
        setSizeFilter('all');
    }, []);

    const hasActiveFilters = searchQuery.trim() || locationScopeFilter !== 'all' || activityFilter !== 'all' || sizeFilter !== 'all';

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-border-primary bg-bg-tertiary/60 p-4">
                <p className="text-sm font-medium text-text-primary">New here?</p>
                <p className="text-xs text-text-muted mt-1">
                    Start by opening 2-3 groups, then join the one that best matches your local issue.
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by issue or category..."
                    className="input pl-11"
                    aria-label="Search groups by issue"
                />
                <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2">
                {/* Impact Area Filter */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-muted uppercase tracking-wide">Impact Area:</span>
                    <div className="flex gap-1 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setLocationScopeFilter('all')}
                            className={`px-3 py-1.5 text-xs rounded-full border transition-all ${locationScopeFilter === 'all'
                                ? 'bg-text-primary text-bg-primary border-text-primary'
                                : 'bg-bg-tertiary text-text-secondary border-border-primary hover:border-border-secondary'
                                }`}
                        >
                            All
                        </button>
                        {LOCATION_SCOPE_LEVELS.map((scope) => (
                            <button
                                key={scope.value}
                                type="button"
                                onClick={() => setLocationScopeFilter(scope.value)}
                                className={`px-3 py-1.5 text-xs rounded-full border transition-all ${locationScopeFilter === scope.value
                                    ? 'bg-text-primary text-bg-primary border-text-primary'
                                    : 'bg-bg-tertiary text-text-secondary border-border-primary hover:border-border-secondary'
                                    }`}
                            >
                                {scope.icon} {scope.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-border-primary self-center hidden sm:block" />

                {/* Activity Filter */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-muted uppercase tracking-wide">Activity:</span>
                    <div className="flex gap-1">
                        {(['all', 'active', 'quiet'] as ActivityFilter[]).map((activity) => (
                            <button
                                key={activity}
                                type="button"
                                onClick={() => setActivityFilter(activity)}
                                className={`px-3 py-1.5 text-xs rounded-full border transition-all ${activityFilter === activity
                                    ? 'bg-text-primary text-bg-primary border-text-primary'
                                    : 'bg-bg-tertiary text-text-secondary border-border-primary hover:border-border-secondary'
                                    }`}
                            >
                                {activity === 'all' ? 'All' : activity.charAt(0).toUpperCase() + activity.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-border-primary self-center hidden sm:block" />

                {/* Size Filter */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-muted uppercase tracking-wide">Size:</span>
                    <div className="flex gap-1">
                        {(['all', 'small', 'medium', 'large'] as SizeFilter[]).map((size) => (
                            <button
                                key={size}
                                type="button"
                                onClick={() => setSizeFilter(size)}
                                className={`px-3 py-1.5 text-xs rounded-full border transition-all ${sizeFilter === size
                                    ? 'bg-text-primary text-bg-primary border-text-primary'
                                    : 'bg-bg-tertiary text-text-secondary border-border-primary hover:border-border-secondary'
                                    }`}
                            >
                                {size === 'all' ? 'All' : size.charAt(0).toUpperCase() + size.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary underline underline-offset-2 ml-auto"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* Results Summary */}
            <div className="text-sm text-text-muted">
                {filteredGroups.length} {filteredGroups.length === 1 ? 'group' : 'groups'} found
            </div>

            {/* Group List */}
            {filteredGroups.length > 0 ? (
                <div className="space-y-3">
                    {filteredGroups.map(({ party, memberCount, lastActiveAt, parentName }) => (
                        <article
                            key={party.id}
                            className="card p-4 hover:border-primary/50 transition-all group"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                {/* Group Info */}
                                <div className="flex-1 min-w-0">
                                    {/* Issue Name */}
                                    <h3 className="text-base font-medium text-text-primary leading-snug line-clamp-2">
                                        {party.issue_text}
                                    </h3>
                                    {party.parent_party_id && parentName && (
                                        <p className="text-xs text-text-muted mt-1">
                                            Chapter of {parentName}
                                        </p>
                                    )}

                                    {/* Metadata Row */}
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-text-muted">
                                        {/* Scope/Location */}
                                        <span className="inline-flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <LocationScopeIcon iconName={getLocationScopeConfig(party.location_scope || 'district').icon} className="w-3.5 h-3.5" /> {getLocationScopeConfig(party.location_scope || 'district').label}
                                            <span className="ml-1 text-primary">
                                                ({getPartyLocationLabel(party)})
                                            </span>
                                        </span>

                                        {/* Member Count */}
                                        <span className="inline-flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            {memberCount} {memberCount === 1 ? 'member' : 'members'}
                                        </span>

                                        {/* Last Active */}
                                        <span className="inline-flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {getRelativeTime(lastActiveAt)}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 self-start sm:self-center">
                                    <Link
                                        href={createPartyUrl({
                                            parent: party.id,
                                            category: party.category_id || null,
                                            location_scope: party.location_scope || null,
                                            location_label: party.location_label || null,
                                            state_name: party.state_name || null,
                                            district_name: party.district_name || null,
                                            block_name: party.block_name || null,
                                            panchayat_name: party.panchayat_name || null,
                                            village_name: party.village_name || null,
                                        })}
                                        className="btn btn-secondary btn-sm whitespace-nowrap"
                                        title="Start a local chapter for this movement"
                                    >
                                        + Local chapter
                                    </Link>
                                    <Link
                                        href={`/group/${party.id}`}
                                        className="btn btn-primary btn-sm whitespace-nowrap"
                                    >
                                        View group
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="empty-state py-16">
                    <div className="mb-2 opacity-60 flex justify-center"><Search className="w-10 h-10" /></div>
                    <p className="text-text-primary font-medium">No groups match your search</p>
                    <p className="text-text-muted text-sm mt-1">
                        Try adjusting your filters or search terms
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="btn btn-secondary btn-sm"
                            >
                                Clear filters
                            </button>
                        )}
                        <Link href="/group/create" className="btn btn-primary btn-sm">
                            Create a new group
                        </Link>
                    </div>
                </div>
            )}

            {/* Load More */}
            {hasMore && filteredGroups.length > 0 && (
                <div className="flex justify-center pt-4">
                    <button
                        type="button"
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="btn btn-secondary"
                    >
                        {isLoadingMore ? 'Loading...' : 'Load more groups'}
                    </button>
                </div>
            )}
        </div>
    );
}

