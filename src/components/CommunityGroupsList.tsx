'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Flag, MapPin, Building2, Building, Home, Wheat, Landmark } from 'lucide-react';
import type { Party, Category } from '@/types/database';
import { createPartyUrl } from '@/lib/createPartyUrl';

type GroupType = 'standalone' | 'parent';

type HierarchyChild = {
    party: Party;
    memberCount: number;
    children?: HierarchyChild[];
};

interface GroupItem {
    party: Party;
    memberCount: number;
    lastActiveAt?: string | null;
    type: GroupType;
    hasChildren?: boolean;
    children?: HierarchyChild[];
    parentName?: string;
    isGoverning?: boolean;
}

interface CommunityGroupsListProps {
    groups: GroupItem[];
    categories: Category[];
    hasMore?: boolean;
    initialOffset?: number;
    limit?: number;
}

type ExpandedGroupData = Record<
    string,
    {
        children: HierarchyChild[];
    }
>;

type DiscoverGroupsResponse = {
    groupItems?: GroupItem[];
    hasMore?: boolean;
    nextOffset?: number;
};

const SEARCH_DEBOUNCE_MS = 250;
const EMPTY_STATE_TITLE = 'No groups found';
const EMPTY_STATE_DESCRIPTION = 'Be the first to start a group for this cause.';

function getTrimmedParam(params: URLSearchParams, key: string): string {
    return params.get(key)?.trim() ?? '';
}

function getCategoryButtonClass(isActive: boolean): string {
    return `px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${isActive
        ? 'bg-primary text-white'
        : 'bg-white text-text-secondary border border-border-primary hover:border-primary/40'
        }`;
}

function createChapterUrl(party: Party): string {
    return createPartyUrl({
        parent: party.id,
        category: party.category_id || null,
        location_scope: party.location_scope || null,
        location_label: party.location_label || null,
        state_name: party.state_name || null,
        district_name: party.district_name || null,
        block_name: party.block_name || null,
        panchayat_name: party.panchayat_name || null,
        village_name: party.village_name || null,
    });
}

function ChevronIcon({ isExpanded, className = 'w-4 h-4 transition-transform' }: { isExpanded: boolean; className?: string }) {
    return (
        <svg
            className={`${className} ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    );
}

function createDiscoverQueryParams(searchParams: URLSearchParams, nextOffset: number, limit: number): URLSearchParams {
    const params = new URLSearchParams();
    const q = getTrimmedParam(searchParams, 'q');
    const category = getTrimmedParam(searchParams, 'category');

    if (q) params.set('q', q);
    if (category) params.set('category', category);

    params.set('offset', String(nextOffset));
    params.set('limit', String(limit));

    return params;
}

function getRelativeTime(dateString: string | null | undefined): string {
    if (!dateString) return 'New';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
}

function ScopeLabel({ scope }: { scope: string | undefined | null }) {
    switch (scope) {
        case 'national': return <span className="flex items-center gap-1"><Flag className="w-3.5 h-3.5" /> Country</span>;
        case 'state': return <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> State</span>;
        case 'district': return <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> District/City</span>;
        case 'block': return <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Block/Corporation</span>;
        case 'panchayat': return <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" /> Panchayat/Ward</span>;
        case 'village': return <span className="flex items-center gap-1"><Wheat className="w-3.5 h-3.5" /> Village/Locality</span>;
        default: return <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Local</span>;
    }
}

function mergeUniqueGroups(existing: GroupItem[], incoming: GroupItem[]): GroupItem[] {
    const existingIds = new Set(existing.map((item) => item.party.id));
    const uniqueIncoming = incoming.filter((item) => !existingIds.has(item.party.id));
    return [...existing, ...uniqueIncoming];
}

function getPartyDetailsHref(id: string): string {
    return `/group/${id}`;
}

function buildUrl(pathname: string, params: URLSearchParams): string {
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
}

function createSetWithValue(prev: Set<string>, value: string, shouldInclude: boolean): Set<string> {
    const next = new Set(prev);
    if (shouldInclude) {
        next.add(value);
    } else {
        next.delete(value);
    }
    return next;
}

export function CommunityGroupsList({
    groups,
    categories,
    hasMore = false,
    initialOffset = 0,
    limit = 24,
}: CommunityGroupsListProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryFromUrl = getTrimmedParam(searchParams, 'q');
    const categoryFromUrl = getTrimmedParam(searchParams, 'category');

    const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFromUrl || null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [loadingExpandedIds, setLoadingExpandedIds] = useState<Set<string>>(new Set());
    const [expandedGroupData, setExpandedGroupData] = useState<ExpandedGroupData>({});
    const [searchQuery, setSearchQuery] = useState(queryFromUrl);
    const [isPending, startTransition] = useTransition();
    const [loadedGroups, setLoadedGroups] = useState<GroupItem[]>(groups);
    const [hasMorePages, setHasMorePages] = useState(hasMore);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [nextOffset, setNextOffset] = useState(initialOffset + limit);

    useEffect(() => {
        setSearchQuery(queryFromUrl);
    }, [queryFromUrl]);

    useEffect(() => {
        setSelectedCategory(categoryFromUrl || null);
    }, [categoryFromUrl]);

    useEffect(() => {
        setLoadedGroups(groups);
        setHasMorePages(hasMore);
        setNextOffset(initialOffset + limit);
        setIsLoadingMore(false);
    }, [groups, hasMore, initialOffset, limit]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const trimmed = searchQuery.trim();
            const params = new URLSearchParams(searchParams.toString());
            const currentQ = getTrimmedParam(searchParams, 'q');

            if (trimmed === currentQ) return;

            if (trimmed) {
                params.set('q', trimmed);
            } else {
                params.delete('q');
            }
            params.delete('offset');

            const nextUrl = buildUrl(pathname, params);
            startTransition(() => {
                router.replace(nextUrl, { scroll: false });
            });
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timeout);
    }, [searchQuery, searchParams, router, pathname, startTransition]);

    const handleLoadMore = async () => {
        if (isLoadingMore || !hasMorePages) return;

        setIsLoadingMore(true);
        try {
            const params = createDiscoverQueryParams(searchParams, nextOffset, limit);

            const response = await fetch(`/api/discover/groups?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to load more groups');
            }

            const data = await response.json() as DiscoverGroupsResponse;

            const incoming = Array.isArray(data.groupItems) ? data.groupItems : [];

            setLoadedGroups((prev) => mergeUniqueGroups(prev, incoming));
            setHasMorePages(Boolean(data.hasMore));
            setNextOffset((prev) => (typeof data.nextOffset === 'number' ? data.nextOffset : prev + limit));
        } catch {
            // keep current list and allow retry
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleCategorySelect = (categoryId: string | null) => {
        setSelectedCategory(categoryId);
        const params = new URLSearchParams(searchParams.toString());

        if (categoryId) {
            params.set('category', categoryId);
        } else {
            params.delete('category');
        }

        params.delete('offset');

        const nextUrl = buildUrl(pathname, params);

        startTransition(() => {
            router.replace(nextUrl, { scroll: false });
        });
    };

    const loadExpandedData = async (id: string) => {
        if (expandedGroupData[id] || loadingExpandedIds.has(id)) return;

        setLoadingExpandedIds((prev) => createSetWithValue(prev, id, true));

        try {
            const response = await fetch(`/api/discover/groups/${id}`);
            if (!response.ok) throw new Error('Failed to load group details');

            const data = await response.json();
            setExpandedGroupData(prev => ({
                ...prev,
                [id]: {
                    children: Array.isArray(data.children) ? data.children : [],
                },
            }));
        } catch {
            setExpandedGroupData(prev => ({
                ...prev,
                [id]: {
                    children: [],
                },
            }));
        } finally {
            setLoadingExpandedIds((prev) => createSetWithValue(prev, id, false));
        }
    };

    const toggleExpand = (id: string, shouldLoadDetails: boolean) => {
        const isCurrentlyExpanded = expandedIds.has(id);

        setExpandedIds((prev) => createSetWithValue(prev, id, !prev.has(id)));

        if (!isCurrentlyExpanded && shouldLoadDetails) {
            void loadExpandedData(id);
        }
    };

    const renderHierarchyChildren = (
        children: HierarchyChild[] | undefined,
        depth = 0,
        parentIssueText?: string,
    ): React.ReactElement[] => {
        if (!children || children.length === 0) return [];

        return children.map((child) => {
            const hasNestedChildren = !!(child.children && child.children.length > 0);
            const isExpanded = expandedIds.has(child.party.id);
            const indent = depth * 16;

            return (
                <div key={child.party.id}>
                    <div className="flex items-center gap-2" style={{ marginLeft: `${indent}px` }}>
                        {hasNestedChildren ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleExpand(child.party.id, false);
                                }}
                                className="w-5 h-5 shrink-0 text-text-muted hover:text-text-primary transition-colors flex items-center justify-center"
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                                <ChevronIcon isExpanded={isExpanded} className="w-3.5 h-3.5 transition-transform" />
                            </button>
                        ) : (
                            <span className="w-5 h-5 shrink-0 flex items-center justify-center text-text-muted text-xs">↳</span>
                        )}

                        <Link
                            href={getPartyDetailsHref(child.party.id)}
                            className="flex-1 flex items-center justify-between py-2 hover:text-primary transition-colors"
                        >
                            <div>
                                <p className="text-sm font-medium text-text-primary line-clamp-1">
                                    {child.party.issue_text}
                                </p>
                                <p className="text-xs text-text-muted">
                                    {parentIssueText ? `Chapter of ${parentIssueText}` : 'Local chapter'}
                                </p>
                            </div>
                            <svg className="w-4 h-4 text-text-muted shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>

                    {hasNestedChildren && isExpanded && renderHierarchyChildren(child.children, depth + 1, child.party.issue_text)}
                </div>
            );
        });
    };

    return (
        <div className="space-y-4">
            {/* Search + Filters */}
            <div className="space-y-3">
                <div className="relative group">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search groups..."
                        className="w-full px-4 py-3 pl-10 rounded-xl bg-white border border-border-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                        aria-label="Search groups"
                    />
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        type="button"
                        onClick={() => handleCategorySelect(null)}
                        className={getCategoryButtonClass(selectedCategory === null)}
                    >All</button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategorySelect(cat.id)}
                            className={getCategoryButtonClass(selectedCategory === cat.id)}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {isPending && (
                    <p className="text-xs text-text-muted">Updating...</p>
                )}
            </div>

            {/* Group List */}
            <div className="space-y-2">
                {loadedGroups.length > 0 ? (
                    loadedGroups.map((item) => {
                        const isExpanded = expandedIds.has(item.party.id);
                        const detailData = expandedGroupData[item.party.id];
                        const resolvedChildren = item.children || detailData?.children;
                        const hasChildren = item.hasChildren || (resolvedChildren && resolvedChildren.length > 0);
                        const isLoadingExpandedData = loadingExpandedIds.has(item.party.id);
                        const createChapterHref = createChapterUrl(item.party);

                        return (
                            <div
                                key={item.party.id}
                                className="rounded-xl border border-border-primary bg-white overflow-hidden hover:border-primary/30 transition-colors"
                            >
                                <div className="flex items-start gap-3 p-4">
                                    {/* Main clickable area */}
                                    <Link
                                        href={getPartyDetailsHref(item.party.id)}
                                        className="flex-1 min-w-0"
                                    >
                                        {/* Scope label */}
                                        <span className="text-xs text-text-muted flex items-center gap-1 flex-wrap">
                                            <ScopeLabel scope={item.party.location_scope} />
                                            {item.isGoverning && (
                                                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                                                    <Landmark className="w-3 h-3" /> Governing
                                                </span>
                                            )}
                                        </span>

                                        {/* Group name */}
                                        <h3 className="text-[15px] font-semibold text-text-primary leading-snug line-clamp-2 mt-0.5">
                                            {item.party.issue_text}
                                        </h3>
                                        {item.parentName && (
                                            <p className="text-xs text-text-muted mt-1">
                                                Chapter of {item.parentName}
                                            </p>
                                        )}

                                        {/* Stats line */}
                                        <p className="text-xs text-text-muted mt-1.5">
                                            {getRelativeTime(item.lastActiveAt)}
                                        </p>
                                    </Link>

                                    {/* Right actions */}
                                    <div className="flex items-center gap-1 shrink-0 pt-2">
                                        {hasChildren && (
                                            <button
                                                type="button"
                                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                                                aria-label={isExpanded ? 'Collapse local chapters' : 'Expand local chapters'}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    toggleExpand(item.party.id, !!item.hasChildren);
                                                }}
                                            >
                                                <ChevronIcon isExpanded={isExpanded} />
                                            </button>
                                        )}
                                        <Link
                                            href={createChapterHref}
                                            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/5 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                            title="Start a local chapter"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </Link>
                                    </div>
                                </div>

                                {/* Expanded Children */}
                                {isExpanded && hasChildren && (
                                    <div className="border-t border-border-primary/50 bg-bg-secondary/30 px-4 py-2 space-y-0.5">
                                        {isLoadingExpandedData && (
                                            <p className="text-xs text-text-muted py-1">Loading local chapters...</p>
                                        )}
                                        {renderHierarchyChildren(resolvedChildren, 0, item.party.issue_text)}
                                        {resolvedChildren && resolvedChildren.length === 0 && !isLoadingExpandedData && (
                                            <p className="text-xs text-text-muted py-1">No local chapters yet</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-12 px-4">
                        <h3 className="text-lg font-semibold text-text-primary mb-2">
                            {EMPTY_STATE_TITLE}
                        </h3>
                        <p className="text-text-muted mb-4 text-sm">
                            {EMPTY_STATE_DESCRIPTION}
                        </p>
                        <Link
                            href="/group/create"
                            className="btn btn-primary"
                        >Start a group</Link>
                    </div>
                )}
            </div>

            {hasMorePages && (
                <div className="flex justify-center pt-2">
                    <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="btn btn-secondary text-sm disabled:opacity-60"
                    >
                        {isLoadingMore ? 'Loading...' : 'Load more'}
                    </button>
                </div>
            )}
        </div>
    );
}
