"use client";

import { useState, useCallback } from 'react';
import { GroupDiscovery } from '@/components/GroupDiscovery';
import type { Party, Category } from '@/types/database';

interface GroupItem {
    party: Party;
    memberCount: number;
    lastActiveAt?: string | null;
}

interface GroupDiscoveryClientProps {
    groups: GroupItem[];
    categories: Category[];
    initialHasMore?: boolean;
    initialTotalCount?: number;
}

const PAGE_SIZE = 20;

export function GroupDiscoveryClient({
    groups,
    categories,
    initialHasMore = false,
}: GroupDiscoveryClientProps) {
    const [loadedGroups, setLoadedGroups] = useState<GroupItem[]>(groups);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [currentOffset, setCurrentOffset] = useState(groups.length);

    const fetchMoreGroups = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        try {
            const res = await fetch(`/api/parties?limit=${PAGE_SIZE}&offset=${currentOffset}&sort=recent`);
            if (!res.ok) throw new Error('Failed to fetch groups');

            const data = await res.json();

            const newGroups: GroupItem[] = (data.parties || []).map((p: {
                id: string;
                issue_text: string;
                pincodes: string[];
                category_id: string | null;
                created_at: string;
                created_by: string;
                level: number;
                member_count?: number;
            }) => ({
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
                lastActiveAt: p.created_at, // API doesn't return last activity yet
            }));

            setLoadedGroups(prev => {
                const existingIds = new Set(prev.map(item => item.party.id));
                const deduped = newGroups.filter(item => !existingIds.has(item.party.id));
                return [...prev, ...deduped];
            });
            setHasMore(data.hasMore);
            setCurrentOffset(prev => prev + newGroups.length);
        } catch (err) {
            console.error('Error fetching more groups:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, currentOffset]);

    return (
        <GroupDiscovery
            groups={loadedGroups}
            categories={categories}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={fetchMoreGroups}
        />
    );
}
