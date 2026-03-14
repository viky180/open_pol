"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { YourRepresentationCard } from '@/components/YourRepresentationCard';
import { FeedItem, type FeedItemData } from '@/components/FeedItem';

interface RepresentationData {
    partyId: string;
    partyName: string;
    leaderName: string | null;
    trustExpiresInDays: number | null;
}

type HomeFeedItem = {
    id: string;
    type: 'question' | 'action_email' | 'milestone' | 'merge' | 'post' | 'new_member' | 'invitation_accepted' | 'trust_milestone' | 'new_party';
    partyId: string;
    partyName: string;
    scope: 'member' | 'location' | 'category' | 'global';
    title: string;
    preview: string;
    timestamp: string;
    linkUrl: string;
    meta?: Record<string, unknown>;
};

interface HomeFeedClientProps {
    representation: RepresentationData | null;
    feedItems: HomeFeedItem[];
    initialIsAuthenticated: boolean;
}

type FilterGroup = 'all' | 'activity' | 'discussions' | 'actions' | 'wins';

const FILTER_GROUPS: Array<{ id: FilterGroup; label: string; types: FeedItemData['type'][] }> = [
    { id: 'all', label: 'All', types: [] },
    { id: 'activity', label: 'Activity', types: ['new_member', 'invitation_accepted', 'new_party'] },
    { id: 'discussions', label: 'Discussions', types: ['question', 'post'] },
    { id: 'actions', label: 'Actions', types: ['action_email'] },
    { id: 'wins', label: 'Wins', types: ['milestone', 'trust_milestone', 'merge'] },
];

const SUPPORTED_ITEMS_STORAGE_KEY = 'home-feed-supported-items';

export function HomeFeedClient({ representation, feedItems, initialIsAuthenticated }: HomeFeedClientProps) {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [activeFilter, setActiveFilter] = useState<FilterGroup>('all');
    const [supportedItems, setSupportedItems] = useState<Set<string>>(new Set());
    const [localFeedItems, setLocalFeedItems] = useState<HomeFeedItem[]>(feedItems);
    const [postDraft, setPostDraft] = useState('');
    const [posting, setPosting] = useState(false);
    const [postError, setPostError] = useState<string | null>(null);
    const [postSuccess, setPostSuccess] = useState<string | null>(null);

    useEffect(() => {
        setLocalFeedItems(feedItems);
    }, [feedItems]);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(SUPPORTED_ITEMS_STORAGE_KEY);
            if (!raw) return;
            const parsed: unknown = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            const ids = parsed.filter((id): id is string => typeof id === 'string');
            setSupportedItems(new Set(ids));
        } catch {
            // Ignore invalid local storage payloads.
        }
    }, []);

    useEffect(() => {
        try {
            window.localStorage.setItem(SUPPORTED_ITEMS_STORAGE_KEY, JSON.stringify(Array.from(supportedItems)));
        } catch {
            // Ignore storage failures.
        }
    }, [supportedItems]);

    const handleSupportChange = useCallback((id: string, supported: boolean) => {
        setSupportedItems((prev) => {
            const next = new Set(prev);
            if (supported) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
        // TODO: Persist support to backend via API
    }, []);

    const normalizedItems: FeedItemData[] = useMemo(() => (
        localFeedItems.map((i) => ({
            id: i.id,
            type: i.type,
            sourceId: i.partyId,
            sourceName: i.partyName,
            sourceType: 'group' as const,
            scope: i.scope,
            title: i.title,
            preview: i.preview,
            timestamp: i.timestamp,
            isSupported: supportedItems.has(i.id),
            linkUrl: i.linkUrl,
        }))
    ), [localFeedItems, supportedItems]);

    const filteredItems = useMemo(() => {
        if (activeFilter === 'all') return normalizedItems;
        const group = FILTER_GROUPS.find((g) => g.id === activeFilter);
        if (!group || group.types.length === 0) return normalizedItems;
        return normalizedItems.filter((i) => group.types.includes(i.type));
    }, [activeFilter, normalizedItems]);

    const countsByGroup = useMemo(() => {
        const counts: Record<FilterGroup, number> = {
            all: normalizedItems.length,
            activity: 0,
            discussions: 0,
            actions: 0,
            wins: 0,
        };
        normalizedItems.forEach((item) => {
            FILTER_GROUPS.forEach((group) => {
                if (group.id !== 'all' && group.types.includes(item.type)) {
                    counts[group.id] += 1;
                }
            });
        });
        return counts;
    }, [normalizedItems]);

    const hasAuthenticatedSession = loading ? initialIsAuthenticated : Boolean(user?.id);
    const canPost = Boolean(hasAuthenticatedSession && representation?.partyId);
    const isGuest = !hasAuthenticatedSession;
    const isFirstTimeState = !isGuest && !representation;
    const currentUserId = user?.id ?? (hasAuthenticatedSession ? 'authenticated-user' : null);

    const handleCreatePost = async () => {
        if (!canPost || posting) return;
        setPostError(null);
        setPostSuccess(null);

        const content = postDraft.trim();
        if (content.length === 0) {
            setPostError('Write something before posting.');
            return;
        }

        setPosting(true);
        try {
            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partyId: representation!.partyId, content }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to post');
            }

            const newFeedItem: HomeFeedItem = {
                id: data?.post?.id || `new-post-${Date.now()}`,
                type: 'post',
                partyId: representation!.partyId,
                partyName: representation!.partyName,
                scope: 'member',
                title: 'New post in your group',
                preview: content,
                timestamp: data?.post?.created_at || new Date().toISOString(),
                linkUrl: `/group/${representation!.partyId}`,
            };

            setPostDraft('');
            setPostSuccess('Posted to your group feed.');
            setLocalFeedItems((prev) => [newFeedItem, ...prev]);
            router.refresh();
        } catch (e) {
            setPostError(e instanceof Error ? e.message : 'Failed to post');
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
            <YourRepresentationCard membership={representation} />

            {isGuest && (
                <div className="glass-panel p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-text-primary">Viewing public updates</p>
                        <p className="text-sm text-text-muted">Log in to see your local and member-specific feed.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/auth" className="btn btn-primary btn-sm">
                            Log in
                        </Link>
                        <Link href="/discover" className="btn btn-secondary btn-sm">
                            Explore groups
                        </Link>
                    </div>
                </div>
            )}

            {isFirstTimeState && (
                <div className="relative overflow-hidden glass-panel p-5 sm:p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 border-primary/20">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-sm">
                                <span className="text-base font-bold text-primary">GO</span>
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-text-primary leading-tight">
                                    Continue getting started
                                </h2>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    A few quick steps to personalize your experience
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                            <Link
                                href="/welcome"
                                className="flex items-start gap-3 p-4 rounded-xl border border-border-primary bg-white/60 hover:border-primary/50 hover:bg-white/80 transition-all group"
                            >
                                <span className="text-xs mt-1 font-semibold text-primary">1</span>
                                <div>
                                    <div className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors leading-snug">
                                        Set up your profile
                                    </div>
                                    <div className="text-xs text-text-muted mt-1">
                                        Add your name and location so others can recognize you
                                    </div>
                                </div>
                            </Link>
                            <Link
                                href="/discover"
                                className="flex items-start gap-3 p-4 rounded-xl border border-border-primary bg-white/60 hover:border-primary/50 hover:bg-white/80 transition-all group"
                            >
                                <span className="text-xs mt-1 font-semibold text-primary">2</span>
                                <div>
                                    <div className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors leading-snug">
                                        Find your first group
                                    </div>
                                    <div className="text-xs text-text-muted mt-1">
                                        Join a group for an issue you care about
                                    </div>
                                </div>
                            </Link>
                        </div>

                        <div className="mt-5 pt-4 border-t border-border-primary/50 flex items-center justify-between">
                            <p className="text-xs text-text-muted">
                                Or <Link href="/group/create" className="text-primary font-medium hover:underline">create your own group</Link> to lead a cause
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {canPost && (
                <div>
                    <div className="glass-panel p-4 sm:p-5 bg-gradient-to-br from-white to-bg-tertiary/30">
                        <div className="flex gap-3 sm:gap-4">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary shadow-sm">
                                YOU
                            </div>
                            <div className="flex-1">
                                <textarea
                                    value={postDraft}
                                    onChange={(e) => {
                                        setPostDraft(e.target.value);
                                        if (postSuccess) setPostSuccess(null);
                                    }}
                                    placeholder="What's on your mind? Share an update with your group..."
                                    className="w-full min-h-[88px] rounded-xl bg-white border border-border-primary px-4 py-3 text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-y mb-3 transition-all leading-relaxed"
                                    rows={3}
                                    maxLength={2000}
                                />

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-border-primary/50">
                                    <div className="text-xs text-text-muted font-medium">
                                        {postDraft.length > 0 && (
                                            <span className={postDraft.length > 1800 ? 'text-danger' : ''}>
                                                {postDraft.trim().length}/2000
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4">
                                        {postError && (
                                            <span className="text-xs text-danger font-medium">
                                                {postError}
                                            </span>
                                        )}
                                        {postSuccess && (
                                            <span className="text-xs text-success font-medium">
                                                {postSuccess}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-primary h-11 sm:h-auto px-6 w-full sm:w-auto"
                                            onClick={handleCreatePost}
                                            disabled={posting || postDraft.trim().length === 0}
                                        >
                                            {posting ? 'Posting...' : 'Post Update'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!isFirstTimeState && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between sticky top-[88px] sm:top-0 z-20 py-3 -mx-4 px-4 bg-bg-primary/95 backdrop-blur-sm border-b border-border-primary sm:mx-0 sm:px-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none">
                        <h3 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            Latest Activity
                        </h3>
                    </div>

                    <div className="space-y-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                            Filter activity
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                            {FILTER_GROUPS.map((group) => {
                                const isActive = activeFilter === group.id;
                                const count = countsByGroup[group.id];
                                return (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => setActiveFilter(group.id)}
                                        aria-pressed={isActive}
                                        className={`
                                        snap-start whitespace-nowrap h-10 sm:h-8 px-4 sm:px-3 rounded-full text-xs font-medium transition-colors duration-200 border
                                        ${isActive
                                                ? 'bg-primary text-white border-primary'
                                                : 'bg-bg-secondary text-text-secondary border-border-primary hover:bg-bg-hover hover:text-text-primary'
                                            }
                                    `}
                                    >
                                        {group.label}
                                        <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-bg-tertiary text-text-muted border border-border-primary'
                                            }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => (
                                <FeedItem
                                    key={item.id}
                                    item={item}
                                    onSupportChange={handleSupportChange}
                                    currentUserId={currentUserId}
                                />
                            ))
                        ) : (
                            <div className="relative overflow-hidden glass-panel flex flex-col items-center justify-center py-16 text-center border-dashed border-2 border-border-secondary/70 bg-gradient-to-br from-bg-secondary to-bg-tertiary/50">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-gradient-to-br from-bg-tertiary to-white border border-border-primary rounded-2xl flex items-center justify-center text-xs font-semibold text-text-secondary mb-5 shadow-sm">
                                        EMPTY
                                    </div>
                                    <h3 className="text-base sm:text-lg font-bold text-text-primary mb-2">No updates yet</h3>
                                    <p className="text-sm text-text-muted max-w-xs mx-auto leading-relaxed">
                                        {activeFilter === 'all'
                                            ? (isGuest
                                                ? 'No public updates yet. Log in to access local and member-specific activity.'
                                                : 'Things are quiet for now. Be the first to post something.')
                                            : 'No items match this filter. Try another category.'
                                        }
                                    </p>

                                    {activeFilter !== 'all' && (
                                        <button
                                            onClick={() => setActiveFilter('all')}
                                            className="mt-6 btn btn-secondary btn-sm"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
