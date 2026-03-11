'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createPartyUrl } from '@/lib/createPartyUrl';
import { getPartyLocationLabel } from '@/types/database';
import type { Category } from '@/types/database';
import type {
    DiscoverAllianceItem,
    DiscoverGroupItem,
    ExploreScope,
    HierarchyChild,
} from '@/types/discover';
import type { DiscoverIssueItem } from '@/lib/discover/getDiscoverPageData';
import { useLocation } from '@/components/LocationContext';

type DiscoverExploreClientProps = {
    activeView: 'groups' | 'alliances' | 'issues';
    categories: Category[];
    initialGroups: DiscoverGroupItem[];
    alliances: DiscoverAllianceItem[];
    issueItems: DiscoverIssueItem[];
    hasMore: boolean;
    initialOffset: number;
    limit: number;
    initialQuery: string;
    initialSelectedCategory: string;
    initialSelectedScope: ExploreScope;
    activeMembershipPartyId: string | null;
};

const ISSUE_PILLS = [
    'All',
    'Public Transport',
    'Health',
    'Corruption',
    'Employment',
    'Taxation',
    'Urban Governance',
    'Education & Skill',
    'Social Justice',
] as const;

function buildScopeOptions(location: {
    state?: string | null;
    district?: string | null;
    block?: string | null;
    corporation?: string | null;
    ward?: string | null;
    panchayat?: string | null;
    village?: string | null;
    locality?: string | null;
} | null): Array<{ value: ExploreScope; label: string }> {
    return [
        { value: 'village', label: location?.village || location?.locality ? `Village or locality: ${location?.village || location?.locality}` : 'Village or locality' },
        { value: 'ward', label: location?.ward || location?.panchayat ? `Ward or panchayat: ${location?.ward || location?.panchayat}` : 'Ward or panchayat' },
        { value: 'block', label: location?.block || location?.corporation ? `Block or corporation: ${location?.block || location?.corporation}` : 'Block or corporation' },
        { value: 'district', label: location?.district ? `District: ${location.district}` : 'District' },
        { value: 'state', label: location?.state ? `State: ${location.state}` : 'State' },
        { value: 'india', label: 'India' },
    ];
}

function getNearestScope(location: {
    state?: string | null;
    district?: string | null;
    block?: string | null;
    corporation?: string | null;
    ward?: string | null;
    panchayat?: string | null;
    village?: string | null;
    locality?: string | null;
} | null): ExploreScope {
    if (location?.village || location?.locality) return 'village';
    if (location?.ward || location?.panchayat) return 'ward';
    if (location?.block || location?.corporation) return 'block';
    if (location?.district) return 'district';
    if (location?.state) return 'state';
    return 'india';
}

function getRelativeTime(dateString: string | null | undefined): string {
    if (!dateString) return 'Today';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return '1d ago';
    return `${diffDays}d ago`;
}

function getLevelBadge(item: DiscoverGroupItem): string {
    const scope = item.party.location_scope;
    const location = getPartyLocationLabel(item.party);
    if (scope === 'village') return location ? `Village · ${location}` : 'Village level';
    if (scope === 'panchayat') return location ? `Ward · ${location}` : 'Ward level';
    if (scope === 'block') return location ? `Block · ${location}` : 'Block level';
    if (scope === 'district') return location ? `District · ${location}` : 'District level';
    if (scope === 'state') return location ? `State · ${location}` : 'State level';
    return 'National level';
}

function matchesIssue(item: DiscoverGroupItem, issue: string): boolean {
    if (!issue || issue === 'All') return true;
    const issueText = item.party.issue_text.toLowerCase();
    const parent = (item.parentName || '').toLowerCase();
    return issueText.includes(issue.toLowerCase()) || parent.includes(issue.toLowerCase());
}

function getCardMomentumText(item: DiscoverGroupItem): string {
    if (typeof item.trendPercent === 'number' && item.trendPercent > 0) {
        return `+${item.trendPercent}% support this week`;
    }

    return 'New or steady support';
}

function getCardContext(item: DiscoverGroupItem): string {
    if (item.parentName) return `Part of ${item.parentName}`;
    if (item.type === 'parent') return 'Independent group with local chapters';
    return 'Independent group';
}

function getCardRepresentationSummary(item: DiscoverGroupItem): string {
    const scopeLabel = (item.party.location_scope || 'district').replace('panchayat', 'ward');
    return `Support in this ${scopeLabel} group can roll up to broader representation over time.`;
}

export function DiscoverExploreClient({
    activeView,
    categories,
    initialGroups,
    alliances,
    issueItems,
    hasMore,
    initialOffset,
    limit,
    initialQuery,
    initialSelectedCategory,
    initialSelectedScope,
    activeMembershipPartyId,
}: DiscoverExploreClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { userLocation } = useLocation();
    const [isPending, startTransition] = useTransition();

    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [selectedCategoryId, setSelectedCategoryId] = useState(initialSelectedCategory);
    const [selectedScope, setSelectedScope] = useState<ExploreScope>(initialSelectedScope);
    const [selectedIssue, setSelectedIssue] = useState<string>('All');
    const [showMoreIssues, setShowMoreIssues] = useState(false);

    const [groups, setGroups] = useState(initialGroups);
    const [hasMorePages, setHasMorePages] = useState(hasMore);
    const [nextOffset, setNextOffset] = useState(initialOffset + limit);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [membershipPartyId, setMembershipPartyId] = useState<string | null>(activeMembershipPartyId);
    const [joiningIds, setJoiningIds] = useState<Set<string>>(new Set());
    const [likingIds, setLikingIds] = useState<Set<string>>(new Set());

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [loadingExpandedIds, setLoadingExpandedIds] = useState<Set<string>>(new Set());
    const [expandedGroupData, setExpandedGroupData] = useState<Record<string, { children: HierarchyChild[] }>>({});
    const [expandedVoicePathIds, setExpandedVoicePathIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        setGroups(initialGroups);
        setHasMorePages(hasMore);
        setNextOffset(initialOffset + limit);
        setMembershipPartyId(activeMembershipPartyId);
        setIsLoadingMore(false);
    }, [initialGroups, hasMore, initialOffset, limit, activeMembershipPartyId]);

    useEffect(() => {
        setSearchQuery(initialQuery);
        setSelectedCategoryId(initialSelectedCategory);
        setSelectedScope(initialSelectedScope);
    }, [initialQuery, initialSelectedCategory, initialSelectedScope]);

    const scopeOptions = useMemo(() => buildScopeOptions(userLocation), [userLocation]);

    const issueNameToCategoryId = useMemo(() => {
        const map = new Map<string, string>();
        categories.forEach((category) => {
            map.set(category.name.toLowerCase(), category.id);
        });
        return map;
    }, [categories]);

    const updateQueryParams = (patch: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(patch).forEach(([key, value]) => {
            if (!value) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        params.delete('offset');
        const query = params.toString();
        startTransition(() => {
            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        });
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            const current = searchParams.get('q') || '';
            const trimmed = searchQuery.trim();
            if (current === trimmed) return;
            updateQueryParams({ q: trimmed || null });
        }, 280);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const handleViewChange = (view: 'groups' | 'alliances' | 'issues') => {
        const defaultViewForScope = selectedScope === 'india' ? 'issues' : 'groups';
        updateQueryParams({ view: view === defaultViewForScope ? null : view });
    };

    const handleScopeChange = (scope: ExploreScope) => {
        setSelectedScope(scope);
        updateQueryParams({ scope: scope === 'india' ? null : scope });
    };

    const handleIssueSelect = (issue: string) => {
        setSelectedIssue(issue);
        setShowMoreIssues(false);

        if (issue === 'All') {
            setSelectedCategoryId('');
            updateQueryParams({ category: null });
            return;
        }

        const categoryId = issueNameToCategoryId.get(issue.toLowerCase());
        if (categoryId) {
            setSelectedCategoryId(categoryId);
            updateQueryParams({ category: categoryId });
            return;
        }

        setSelectedCategoryId('');
        updateQueryParams({ category: null });
    };

    const handleNearMeToggle = () => {
        handleScopeChange(getNearestScope(userLocation));
    };

    const visibleGroups = useMemo(
        () => groups.filter((item) => matchesIssue(item, selectedIssue)),
        [groups, selectedIssue],
    );

    const handleLoadMore = async () => {
        if (isLoadingMore || !hasMorePages) return;
        setIsLoadingMore(true);

        try {
            const params = new URLSearchParams();
            const q = searchParams.get('q')?.trim();
            const category = searchParams.get('category')?.trim();
            const scope = searchParams.get('scope')?.trim();
            if (q) params.set('q', q);
            if (category) params.set('category', category);
            if (scope) params.set('scope', scope);
            params.set('offset', String(nextOffset));
            params.set('limit', String(limit));

            const response = await fetch(`/api/discover/groups?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to load more groups');
            const data = await response.json() as {
                groupItems?: DiscoverGroupItem[];
                hasMore?: boolean;
                nextOffset?: number;
            };

            const incoming = Array.isArray(data.groupItems) ? data.groupItems : [];
            setGroups((prev) => {
                const ids = new Set(prev.map((item) => item.party.id));
                const uniqueIncoming = incoming.filter((item) => !ids.has(item.party.id));
                return [...prev, ...uniqueIncoming];
            });
            setHasMorePages(Boolean(data.hasMore));
            setNextOffset(typeof data.nextOffset === 'number' ? data.nextOffset : nextOffset + limit);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const loadExpandedData = async (id: string) => {
        if (expandedGroupData[id] || loadingExpandedIds.has(id)) return;
        setLoadingExpandedIds((prev) => new Set(prev).add(id));
        try {
            const response = await fetch(`/api/discover/groups/${id}`);
            const data = response.ok ? await response.json() : { children: [] };
            setExpandedGroupData((prev) => ({
                ...prev,
                [id]: { children: Array.isArray(data.children) ? data.children : [] },
            }));
        } finally {
            setLoadingExpandedIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const toggleExpand = (id: string, shouldLoad: boolean) => {
        const currentlyExpanded = expandedIds.has(id);
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });

        if (!currentlyExpanded && shouldLoad) {
            void loadExpandedData(id);
        }
    };

    const toggleVoicePath = (id: string) => {
        setExpandedVoicePathIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleLikeToggle = async (item: DiscoverGroupItem) => {
        if (likingIds.has(item.party.id)) return;

        const currentlyLiked = !!item.likedByMe;
        setLikingIds((prev) => new Set(prev).add(item.party.id));
        setGroups((prev) => prev.map((group) => (
            group.party.id === item.party.id
                ? {
                    ...group,
                    likedByMe: !currentlyLiked,
                    likeCount: Math.max(0, group.likeCount + (currentlyLiked ? -1 : 1)),
                }
                : group
        )));

        try {
            await fetch(`/api/parties/${item.party.id}/like`, {
                method: currentlyLiked ? 'DELETE' : 'POST',
            });
        } finally {
            setLikingIds((prev) => {
                const next = new Set(prev);
                next.delete(item.party.id);
                return next;
            });
        }
    };

    const handleJoin = async (item: DiscoverGroupItem) => {
        if (joiningIds.has(item.party.id)) return;
        setJoiningIds((prev) => new Set(prev).add(item.party.id));

        try {
            const response = await fetch(`/api/parties/${item.party.id}/join`, { method: 'POST' });
            if (!response.ok) return;
            setMembershipPartyId(item.party.id);
            setGroups((prev) => prev.map((group) => ({
                ...group,
                joinedByMe: group.party.id === item.party.id,
            })));
        } finally {
            setJoiningIds((prev) => {
                const next = new Set(prev);
                next.delete(item.party.id);
                return next;
            });
        }
    };

    const renderChildren = (children?: HierarchyChild[], depth = 0, parentName?: string): React.ReactElement[] => {
        if (!children || children.length === 0) return [];

        return children.map((child) => {
            const hasNested = !!(child.children && child.children.length > 0);
            const nestedExpanded = expandedIds.has(child.party.id);
            const indent = depth * 16;

            return (
                <div key={child.party.id}>
                    <div className="flex items-center gap-2" style={{ marginLeft: `${indent}px` }}>
                        {hasNested ? (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    toggleExpand(child.party.id, false);
                                }}
                                className="inline-flex h-5 w-5 items-center justify-center text-text-muted"
                            >
                                <svg className={`h-3.5 w-3.5 transition-transform ${nestedExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ) : (
                            <span className="inline-flex h-5 w-5 items-center justify-center text-xs text-text-muted">↳</span>
                        )}
                        <Link href={`/party/${child.party.id}`} className="flex flex-1 items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-medium text-text-primary">{child.party.issue_text}</p>
                                <p className="text-xs text-text-muted">{parentName ? `Part of ${parentName}` : 'Local chapter'}</p>
                            </div>
                            <svg className="h-4 w-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                    {hasNested && nestedExpanded && renderChildren(child.children, depth + 1, child.party.issue_text)}
                </div>
            );
        });
    };

    const selectedScopeLabel = scopeOptions.find((scope) => scope.value === selectedScope)?.label || 'India';

    return (
        <div className="min-h-screen">
            <section className="editorial-page editorial-page--wide py-6">
                <div className="editorial-hero mb-6">
                    <p className="editorial-hero__eyebrow">Discover live organizing</p>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="editorial-hero__title text-3xl sm:text-5xl">Explore active groups, issues, and alliances</h1>
                            <p className="editorial-hero__body">
                                Scan what is gathering members near you, compare competing issue groups, and start a new chapter when the current options do not fit.
                            </p>
                        </div>
                        <Link href="/party/create" className="btn btn-primary shrink-0">
                            Create a group
                        </Link>
                    </div>
                </div>

                <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="editorial-pill-group">
                        <button
                            type="button"
                            onClick={() => handleViewChange('groups')}
                            className={`editorial-pill ${activeView === 'groups' ? 'editorial-pill--active' : ''}`}
                        >
                            Groups
                        </button>
                        <button
                            type="button"
                            onClick={() => handleViewChange('alliances')}
                            className={`editorial-pill ${activeView === 'alliances' ? 'editorial-pill--active' : ''}`}
                        >
                            Alliances
                        </button>
                        <button
                            type="button"
                            onClick={() => handleViewChange('issues')}
                            className={`editorial-pill ${activeView === 'issues' ? 'editorial-pill--active' : ''}`}
                        >
                            Issues
                        </button>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search groups, issues, or locations"
                            className="input rounded-full py-3 pl-11"
                        />
                        <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {ISSUE_PILLS.map((pill) => {
                        const active = selectedIssue === pill || (pill === 'All' && !selectedCategoryId && selectedIssue === 'All');
                        return (
                            <button
                                key={pill}
                                type="button"
                                onClick={() => handleIssueSelect(pill)}
                                className={`editorial-chip whitespace-nowrap ${active ? 'editorial-chip--active' : ''}`}
                            >
                                {pill}
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => setShowMoreIssues((prev) => !prev)}
                        className="editorial-chip whitespace-nowrap"
                    >
                        More
                    </button>
                </div>

                {showMoreIssues && (
                    <div className="card mt-3 p-3">
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>Issue picker</p>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedIssue(category.name);
                                        setSelectedCategoryId(category.id);
                                        setShowMoreIssues(false);
                                        updateQueryParams({ category: category.id });
                                    }}
                                    className="editorial-chip"
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-border-primary bg-bg-card px-3 py-2 text-sm text-text-secondary">
                        <span className="font-semibold text-text-primary">Scope:</span>
                        <select
                            className="bg-transparent text-sm font-medium text-text-primary outline-none"
                            value={selectedScope}
                            onChange={(event) => handleScopeChange(event.target.value as ExploreScope)}
                        >
                            {scopeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleNearMeToggle}
                        className="editorial-chip editorial-chip--active"
                    >
                        Use my nearest scope
                    </button>
                </div>

                {isPending && (
                    <p className="mt-3 text-xs text-text-muted">Updating list…</p>
                )}

                <div className="mt-5 space-y-4">
                    {activeView === 'groups' ? (
                        visibleGroups.length > 0 ? (
                            visibleGroups.map((item) => {
                                const resolvedChildren = item.children || expandedGroupData[item.party.id]?.children;
                                const isExpanded = expandedIds.has(item.party.id);
                                const hasChildren = item.hasChildren || (resolvedChildren && resolvedChildren.length > 0);
                                const isVoiceExpanded = expandedVoicePathIds.has(item.party.id);
                                const joinDisabled = Boolean(membershipPartyId && membershipPartyId !== item.party.id);
                                const joined = membershipPartyId === item.party.id || item.joinedByMe;

                                return (
                                    <article key={item.party.id} className="card p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="editorial-chip">
                                                {getLevelBadge(item)}
                                            </span>
                                            <span className="text-xs uppercase tracking-[0.16em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>{getRelativeTime(item.lastActiveAt)}</span>
                                        </div>

                                        <h2 className="mt-3 text-xl text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>{item.party.issue_text}</h2>
                                        <p className="mt-1 text-sm text-text-muted">{getCardContext(item)}</p>

                                        <div className="mt-4 grid grid-cols-3 gap-3">
                                            <div className="editorial-subcard py-3">
                                                <div className="text-lg text-primary" style={{ fontFamily: 'var(--font-display)' }}>{item.memberCount.toLocaleString('en-IN')}</div>
                                                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>Members</div>
                                            </div>
                                            <div className="editorial-subcard py-3">
                                                <div className="text-lg text-primary" style={{ fontFamily: 'var(--font-display)' }}>{item.likeCount.toLocaleString('en-IN')}</div>
                                                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>Saved</div>
                                            </div>
                                            <div className="editorial-subcard py-3">
                                                <div className="text-sm font-semibold text-accent">{getCardMomentumText(item)}</div>
                                                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>Momentum</div>
                                            </div>
                                        </div>

                                        <p className="mt-4 text-sm text-text-secondary">{getCardRepresentationSummary(item)}</p>

                                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={joinDisabled || joined || joiningIds.has(item.party.id)}
                                                    onClick={() => handleJoin(item)}
                                                    className="btn btn-primary btn-sm disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {joined ? 'Open group' : joiningIds.has(item.party.id) ? 'Joining...' : 'Join group'}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={likingIds.has(item.party.id)}
                                                    onClick={() => handleLikeToggle(item)}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    {item.likedByMe ? 'Saved' : 'Save group'}
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {hasChildren && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpand(item.party.id, !!item.hasChildren)}
                                                        className="btn btn-ghost btn-sm"
                                                        aria-expanded={isExpanded}
                                                    >
                                                        {isExpanded ? 'Hide chapters' : 'Show chapters'}
                                                    </button>
                                                )}
                                                <Link
                                                    href={createPartyUrl({
                                                        parent: item.party.id,
                                                        category: item.party.category_id || null,
                                                        location_scope: item.party.location_scope || null,
                                                        location_label: item.party.location_label || null,
                                                        state_name: item.party.state_name || null,
                                                        district_name: item.party.district_name || null,
                                                        block_name: item.party.block_name || null,
                                                        panchayat_name: item.party.panchayat_name || null,
                                                        village_name: item.party.village_name || null,
                                                    })}
                                                    className="btn btn-ghost btn-sm"
                                                >
                                                    Start local chapter
                                                </Link>
                                                <Link href={`/party/${item.party.id}`} className="btn btn-ghost btn-sm">
                                                    View details
                                                </Link>
                                            </div>
                                        </div>
                                        {joinDisabled && !joined && (
                                            <p className="mt-2 text-xs text-text-muted">
                                                You already have an active membership at this level. Save this group or compare it first.
                                            </p>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => toggleVoicePath(item.party.id)}
                                            className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-text-secondary"
                                            aria-expanded={isVoiceExpanded}
                                        >
                                            How representation works
                                            <span>{isVoiceExpanded ? '−' : '+'}</span>
                                        </button>
                                        {isVoiceExpanded && (
                                            <p className="editorial-subcard mt-2 text-xs text-text-muted">
                                                {getCardRepresentationSummary(item)}
                                            </p>
                                        )}

                                        {isExpanded && hasChildren && (
                                            <div className="editorial-subcard mt-3 px-3 py-2">
                                                {loadingExpandedIds.has(item.party.id) && (
                                                    <p className="py-2 text-xs text-text-muted">Loading chapters...</p>
                                                )}
                                                {renderChildren(resolvedChildren, 0, item.party.issue_text)}
                                                {resolvedChildren && resolvedChildren.length === 0 && !loadingExpandedIds.has(item.party.id) && (
                                                    <p className="py-2 text-xs text-text-muted">No chapters yet.</p>
                                                )}
                                            </div>
                                        )}
                                    </article>
                                );
                            })
                        ) : (
                            <div className="empty-state p-8">
                                <svg viewBox="0 0 160 120" className="mx-auto mb-4 h-28 w-40 text-text-muted" fill="none">
                                    <path d="M80 110V48" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                    <path d="M80 56c0-18 14-30 30-30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                    <path d="M80 64c0-16-12-27-26-27" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                    <circle cx="110" cy="26" r="10" stroke="currentColor" strokeWidth="3" />
                                    <circle cx="54" cy="36" r="9" stroke="currentColor" strokeWidth="3" />
                                    <path d="M52 110h56" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                </svg>
                                <p className="text-base font-semibold text-text-primary">No groups found for &quot;{selectedIssue === 'All' ? (searchQuery || 'your search') : selectedIssue}&quot; in {selectedScopeLabel.toLowerCase()}.</p>
                                <Link href="/party/create" className="editorial-link mt-3 inline-flex text-sm font-semibold">
                                    Create the first group
                                </Link>
                            </div>
                        )
                    ) : activeView === 'issues' ? (
                        issueItems.length > 0 ? (
                            issueItems.map((issue) => {
                                const maxMembers = Math.max(1, ...issueItems.map((i) => i.leadingGroupMemberCount));
                                const barWidth = Math.max(4, Math.round((issue.leadingGroupMemberCount / maxMembers) * 100));
                                return (
                                    <Link
                                        key={issue.id}
                                        href={`/issue/${issue.id}`}
                                        className="card block p-4 transition-colors hover:border-accent/50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="badge border-accent/25 bg-accent/10 text-accent">Issue</span>
                                            <span className="text-xs font-semibold text-text-secondary">
                                                {issue.nationalGroupCount} group{issue.nationalGroupCount !== 1 ? 's' : ''} competing
                                            </span>
                                        </div>
                                        <h2 className="mt-3 text-xl text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>{issue.issue_text}</h2>
                                        {issue.leadingGroupMemberCount > 0 && (
                                            <div className="mt-3">
                                                <p className="mb-1 text-xs text-text-muted">Leading group: {issue.leadingGroupMemberCount.toLocaleString('en-IN')} members</p>
                                                <div className="editorial-progress">
                                                    <div className="editorial-progress__fill" style={{ width: `${barWidth}%` }} />
                                                </div>
                                            </div>
                                        )}
                                        <p className="mt-3 text-xs text-text-muted">
                                            {issue.nationalGroupCount === 0
                                                ? 'No national groups yet - start the first one'
                                                : 'Open this issue to compare competing groups'}
                                        </p>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="empty-state p-8">
                                <p className="text-base font-semibold text-text-primary">No issues created yet</p>
                                <Link href="/party/create?location_scope=national" className="editorial-link mt-3 inline-flex text-sm font-semibold">
                                    Start the first national group
                                </Link>
                            </div>
                        )
                    ) : (
                        alliances.length > 0 ? (
                            alliances.map((alliance) => (
                                <Link key={alliance.alliance.id} href={`/alliance/${alliance.alliance.id}`} className="card block p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="badge border-primary/20 bg-primary/10 text-primary">Alliance</span>
                                        <span className="text-xs text-text-muted">{getRelativeTime(alliance.alliance.created_at)}</span>
                                    </div>
                                    <h2 className="mt-3 text-xl text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>{alliance.alliance.name}</h2>
                                    <p className="mt-1 text-sm font-semibold text-primary">
                                        Total Strength: {alliance.combinedMemberCount.toLocaleString('en-IN')} members
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {alliance.members.slice(0, 5).map((member) => (
                                            <span key={`${alliance.alliance.id}-${member.partyId}`} className="editorial-chip">
                                                {member.issueText}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="mt-3 text-xs text-text-muted">{alliance.groupCount} groups working together across {alliance.scopes.length || 1} levels.</p>
                                </Link>
                            ))
                        ) : (
                            <div className="empty-state p-8">
                                <p className="text-base font-semibold text-text-primary">No alliances found for this scope yet.</p>
                            </div>
                        )
                    )}
                </div>

                {activeView === 'groups' && hasMorePages && visibleGroups.length > 0 && (
                    <div className="mt-6 flex justify-center">
                        <button
                            type="button"
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="btn btn-secondary"
                        >
                            {isLoadingMore ? 'Loading...' : 'Load More'}
                        </button>
                    </div>
                )}

                <p className="mt-6 text-center text-xs text-text-muted">Scope: {selectedScopeLabel}</p>
            </section>
        </div>
    );
}
