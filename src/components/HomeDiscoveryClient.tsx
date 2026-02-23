"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PartyListClient, type PartyListItem } from '@/components/PartyListClient';
import { useAuth } from '@/components/AuthContext';
import { PartyCard } from '@/components/PartyCard';
import type { Category } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { loadProgressiveDisclosureState, type ProgressiveStage } from '@/lib/progressiveDisclosure';

const PINCODE_KEY = 'openpolitics:pincode';
const INTERESTS_KEY = 'openpolitics:interests';

function sanitizePincode(input: string): string {
    return input.replace(/\D/g, '').slice(0, 6);
}

interface HomeDiscoveryClientProps {
    partyItems: PartyListItem[];
    categories: Category[];
    initialHasMore?: boolean;
    initialTotalCount?: number;
}

const PAGE_SIZE = 20;
const SINGLE_MEMBERSHIP_HINT = 'You can be part of only one group at a time. You can still like parties to show interest.';

export function HomeDiscoveryClient({
    partyItems,
    categories,
    initialHasMore = false,
    initialTotalCount = 0,
}: HomeDiscoveryClientProps) {
    const router = useRouter();
    const { user } = useAuth();
    const supabase = createClient();

    const [pincode, setPincode] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [joinLoadingPartyId, setJoinLoadingPartyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeMembershipPartyId, setActiveMembershipPartyId] = useState<string | null>(null);
    const [likeStatsByPartyId, setLikeStatsByPartyId] = useState<Record<string, { liked: boolean; count: number }>>({});
    const [stage, setStage] = useState<ProgressiveStage>('first_time');
    const [showAllParties, setShowAllParties] = useState(false);

    // Pagination state
    const [loadedParties, setLoadedParties] = useState<PartyListItem[]>(partyItems);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [currentOffset, setCurrentOffset] = useState(partyItems.length);

    useEffect(() => {
        const state = loadProgressiveDisclosureState();
        setStage(state.stage);
        if (state.stage !== 'first_time') {
            setShowAllParties(true);
        }
    }, []);

    // Load saved preferences
    useEffect(() => {
        try {
            const savedPincode = window.localStorage.getItem(PINCODE_KEY);
            const savedInterests = window.localStorage.getItem(INTERESTS_KEY);
            if (savedPincode) setPincode(sanitizePincode(savedPincode));
            if (savedInterests) setInterests(JSON.parse(savedInterests));
        } catch {
            // ignore
        }
    }, []);

    // Save pincode changes
    useEffect(() => {
        try {
            if (pincode) {
                window.localStorage.setItem(PINCODE_KEY, pincode);
            } else {
                window.localStorage.removeItem(PINCODE_KEY);
            }
        } catch {
            // ignore
        }
    }, [pincode]);

    useEffect(() => {
        let isMounted = true;

        const loadUserStats = async () => {
            if (!user) {
                if (isMounted) {
                    setActiveMembershipPartyId(null);
                    setLikeStatsByPartyId({});
                }
                return;
            }

            const [membershipResult, likesResult] = await Promise.all([
                supabase
                    .from('memberships')
                    .select('party_id')
                    .eq('user_id', user.id)
                    .is('left_at', null)
                    .maybeSingle(),
                supabase
                    .from('party_likes')
                    .select('party_id')
                    .eq('user_id', user.id)
            ]);

            if (!isMounted) return;

            setActiveMembershipPartyId(membershipResult.data?.party_id ?? null);

            const likedSet = new Set((likesResult.data || []).map(like => like.party_id));
            setLikeStatsByPartyId((prev) => {
                const next: Record<string, { liked: boolean; count: number }> = { ...prev };
                partyItems.forEach(item => {
                    const existing = next[item.party.id] ?? { liked: false, count: 0 };
                    next[item.party.id] = {
                        liked: likedSet.has(item.party.id),
                        count: existing.count
                    };
                });
                return next;
            });
        };

        loadUserStats();

        return () => {
            isMounted = false;
        };
    }, [user, supabase, partyItems]);

    useEffect(() => {
        let isMounted = true;

        const loadLikeCounts = async () => {
            if (partyItems.length === 0) {
                if (isMounted) {
                    setLikeStatsByPartyId({});
                }
                return;
            }

            const partyIds = partyItems.map(item => item.party.id);
            const { data } = await supabase
                .from('party_likes')
                .select('party_id')
                .in('party_id', partyIds);

            if (!isMounted) return;

            const counts: Record<string, number> = {};
            (data || []).forEach(row => {
                counts[row.party_id] = (counts[row.party_id] || 0) + 1;
            });

            setLikeStatsByPartyId((prev) => {
                const next: Record<string, { liked: boolean; count: number }> = { ...prev };
                partyIds.forEach(id => {
                    const existing = next[id] ?? { liked: false, count: 0 };
                    next[id] = {
                        liked: existing.liked,
                        count: counts[id] || 0
                    };
                });
                return next;
            });
        };

        loadLikeCounts();

        return () => {
            isMounted = false;
        };
    }, [partyItems, supabase]);

    const handlePincodeChange = useCallback((value: string) => {
        setPincode(sanitizePincode(value));
    }, []);

    // Fetch more parties for pagination
    const fetchMoreParties = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        try {
            const res = await fetch(`/api/parties?limit=${PAGE_SIZE}&offset=${currentOffset}`);
            if (!res.ok) throw new Error('Failed to fetch parties');

            const data = await res.json();

            // Transform API response to PartyListItem format
            const newParties: PartyListItem[] = (data.parties || []).map((p: { id: string; issue_text: string; pincodes: string[]; category_id: string | null; created_at: string; created_by: string; level: number; member_count?: number }) => ({
                party: {
                    id: p.id,
                    issue_text: p.issue_text,
                    pincodes: p.pincodes,
                    category_id: p.category_id,
                    created_at: p.created_at,
                    created_by: p.created_by,
                    level: p.level,
                },
                memberCount: p.member_count || 0,
            }));

            setLoadedParties(prev => [...prev, ...newParties]);
            setHasMore(data.hasMore);
            if (typeof data.total === 'number') {
                setTotalCount(data.total);
            }
            setCurrentOffset(prev => prev + newParties.length);
        } catch (err) {
            console.error('Error fetching more parties:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, currentOffset]);

    // Recommended parties based on pincode and/or interests
    const recommendedParties = useMemo(() => {
        if (!pincode && interests.length === 0) return [];

        return loadedParties.filter(item => {
            const matchesPincode = pincode.length === 6 && item.party.pincodes.includes(pincode);
            const matchesInterest = interests.includes(item.party.category_id || '');
            return matchesPincode || matchesInterest;
        }).slice(0, 6); // Limit to 6 recommendations
    }, [loadedParties, pincode, interests]);

    const nearbyCount = useMemo(() => {
        if (pincode.length !== 6) return null;
        return loadedParties.filter(item => item.party.pincodes.includes(pincode)).length;
    }, [loadedParties, pincode]);

    const joinLabelByPartyId = useMemo(() => {
        const labels: Record<string, string> = {};
        loadedParties.forEach(item => {
            if (activeMembershipPartyId && activeMembershipPartyId === item.party.id) {
                labels[item.party.id] = 'Already in your group';
            } else if (activeMembershipPartyId) {
                labels[item.party.id] = 'One group only';
            } else {
                labels[item.party.id] = joinLoadingPartyId === item.party.id ? 'Joining…' : 'Join';
            }
        });
        return labels;
    }, [loadedParties, joinLoadingPartyId, activeMembershipPartyId]);

    const joinDisabledByPartyId = useMemo(() => {
        const disabled: Record<string, boolean> = {};
        loadedParties.forEach(item => {
            const hasOtherActiveMembership = !!activeMembershipPartyId && activeMembershipPartyId !== item.party.id;
            disabled[item.party.id] = joinLoadingPartyId !== null || hasOtherActiveMembership || activeMembershipPartyId === item.party.id;
        });
        return disabled;
    }, [loadedParties, joinLoadingPartyId, activeMembershipPartyId]);

    const handleJoin = async (partyId: string) => {
        setError(null);

        if (!user) {
            router.push('/auth');
            return;
        }

        if (activeMembershipPartyId && activeMembershipPartyId !== partyId) {
            setError(SINGLE_MEMBERSHIP_HINT);
            return;
        }

        if (activeMembershipPartyId === partyId) {
            setError('You are already in this group.');
            return;
        }

        setJoinLoadingPartyId(partyId);
        try {
            const res = await fetch(`/api/parties/${partyId}/join`, { method: 'POST' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || 'Unable to join party');
            }

            // Take them directly into the party after join.
            router.push(`/party/${partyId}`);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to join party');
        } finally {
            setJoinLoadingPartyId(null);
        }
    };

    const hasPreferences = pincode.length === 6 || interests.length > 0;
    const isFirstTime = stage === 'first_time';
    const showFullDiscovery = !isFirstTime || showAllParties;

    return (
        <div className="space-y-6">
            {/* Recommended For You Section */}
            {hasPreferences && recommendedParties.length > 0 && (
                <div className="card-glass bg-gradient-to-br from-primary/5 to-accent/5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                                <span>✨</span> Recommended For You
                            </h3>
                            <p className="text-sm text-text-secondary">
                                Based on your location{interests.length > 0 ? ' and interests' : ''}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {pincode && (
                                <span className="badge text-xs">📍 {pincode}</span>
                            )}
                            {interests.length > 0 && (
                                <span className="badge text-xs">🎯 {interests.length} topics</span>
                            )}
                        </div>
                    </div>

                    {/* Horizontal scroll on mobile, grid on desktop */}
                    <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0">
                        {recommendedParties.map(({ party, memberCount }) => (
                            <div key={party.id} className="min-w-[280px] sm:min-w-0 snap-start">
                                <PartyCard
                                    party={party}
                                    memberCount={memberCount}
                                    currentUserId={user?.id || null}
                                    initialLiked={likeStatsByPartyId[party.id]?.liked || false}
                                    initialLikeCount={likeStatsByPartyId[party.id]?.count || 0}
                                    showJoin={true}
                                    joinLabel={joinLabelByPartyId[party.id]}
                                    joinDisabled={joinDisabledByPartyId[party.id]}
                                    onJoin={() => handleJoin(party.id)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Complete your profile nudge */}
            {!hasPreferences && (
                <div className="card-glass bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                    <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                        <span className="text-3xl">👋</span>
                        <div className="flex-1">
                            <h3 className="font-semibold text-text-primary">Get personalized recommendations</h3>
                            <p className="text-sm text-text-secondary">Set your location and interests to see relevant parties first</p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm whitespace-nowrap"
                            onClick={() => router.push('/welcome')}
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            )}

            {isFirstTime && !showFullDiscovery && (
                <div className="card-glass bg-bg-secondary border-border-primary">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="text-base font-semibold text-text-primary">Want to browse everything?</h3>
                            <p className="text-sm text-text-secondary">
                                Keep your focus on the essentials, or expand to see all issue-parties and filters.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowAllParties(true)}
                        >
                            Browse all parties
                        </button>
                    </div>
                </div>
            )}

            {showFullDiscovery && (
                <>
                    <PartyListClient
                        partyItems={loadedParties.map(item => ({
                            ...item,
                            likeCount: likeStatsByPartyId[item.party.id]?.count || 0,
                            likedByMe: likeStatsByPartyId[item.party.id]?.liked || false
                        }))}
                        categories={categories}
                        currentUserId={user?.id || null}
                        pincodeFilter={pincode.length === 6 ? pincode : null}
                        pincode={pincode}
                        onPincodeChange={handlePincodeChange}
                        nearbyCount={nearbyCount}
                        error={error}
                        showJoinCta={true}
                        joinLabelByPartyId={joinLabelByPartyId}
                        joinDisabledByPartyId={joinDisabledByPartyId}
                        onJoinParty={handleJoin}
                        hasMore={hasMore}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={fetchMoreParties}
                        totalCount={totalCount}
                    />
                </>
            )}
        </div>
    );
}
