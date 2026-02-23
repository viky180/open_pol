import type { Category, Party } from '@/types/database';
import type { Database } from '@/types/database';
import type { DiscoverGroupItem, GroupType } from '@/types/discover';
import type { SupabaseClient } from '@supabase/supabase-js';

type DiscoverSearchParams = {
    q?: string;
    category?: string;
    offset?: string;
    limit?: string;
};

type PartyWithMemberCountRow = Party & {
    member_count?: number | null;
};




export type DiscoverPageData = {
    categories: Category[];
    groupItems: DiscoverGroupItem[];
    query: string;
    selectedCategory: string;
    safeOffset: number;
    limit: number;
    hasMore: boolean;
    totalMembers: number;
};

export async function getDiscoverPageData(
    supabase: SupabaseClient<Database>,
    searchParams?: DiscoverSearchParams,
): Promise<DiscoverPageData> {
    const query = searchParams?.q?.trim() || '';
    const selectedCategory = searchParams?.category?.trim() || '';
    const offset = Number.parseInt(searchParams?.offset || '0', 10);
    const limit = Math.min(Math.max(Number.parseInt(searchParams?.limit || '24', 10), 12), 60);
    const safeOffset = Number.isNaN(offset) || offset < 0 ? 0 : offset;
    const isSearching = query.length > 0;

    const [categoriesResult, partyRowsResult] = await Promise.all([
        supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true }),
        (() => {
            let partiesQuery = supabase
                .from('parties_with_member_counts')
                .select('*')
                .order('created_at', { ascending: false })
                .range(safeOffset, safeOffset + limit);

            if (selectedCategory) {
                partiesQuery = partiesQuery.eq('category_id', selectedCategory);
            }

            if (isSearching) {
                partiesQuery = partiesQuery.ilike('issue_text', `%${query}%`);
            }

            return partiesQuery;
        })(),
    ]);

    const categories = categoriesResult.data || [];
    const partyRows = partyRowsResult.data;
    const hasMore = (partyRows || []).length > limit;
    const allParties = (hasMore ? (partyRows || []).slice(0, limit) : (partyRows || [])) as PartyWithMemberCountRow[];

    // parent_party_id is already available from parties_with_member_counts (p.*)
    // — no need for a separate query
    const parentByPartyId = new Map<string, string>();
    allParties.forEach((p) => {
        if (p.parent_party_id) {
            parentByPartyId.set(p.id, p.parent_party_id);
        }
    });


    const parties = allParties.filter((p) => {
        const hasParent = parentByPartyId.has(p.id);
        const looksLikeChildNode = p.node_type === 'group';
        return !hasParent && !looksLikeChildNode;
    });

    const visiblePartyIds = parties.map((p) => p.id);
    const [directChildrenResult] = await Promise.all([
        visiblePartyIds.length > 0
            ? supabase
                .from('parties')
                .select('id, parent_party_id')
                .in('parent_party_id', visiblePartyIds)
            : Promise.resolve({ data: [] as { id: string; parent_party_id: string | null }[] }),
    ]);

    const childrenCountByParentId = new Map<string, number>();
    (directChildrenResult.data || []).forEach((row) => {
        if (!row.parent_party_id) return;
        childrenCountByParentId.set(row.parent_party_id, (childrenCountByParentId.get(row.parent_party_id) || 0) + 1);
    });


    let groupItems: DiscoverGroupItem[];

    if (isSearching) {
        groupItems = parties.map((p) => ({
            party: p,
            memberCount: p.member_count || 0,
            lastActiveAt: p.created_at,
            type: 'standalone' as GroupType,
            hasChildren: childrenCountByParentId.has(p.id),
        }));
    } else {
        groupItems = parties.map((party) => {
            const hasChildren = childrenCountByParentId.has(party.id);
            const type: GroupType = hasChildren ? 'parent' : 'standalone';

            return {
                party,
                memberCount: party.member_count || 0,
                lastActiveAt: party.created_at,
                type,
                hasChildren,
            };
        });

        groupItems.sort((a, b) => {
            if (a.type !== 'standalone' && b.type === 'standalone') return -1;
            if (a.type === 'standalone' && b.type !== 'standalone') return 1;
            return b.memberCount - a.memberCount;
        });
    }

    const totalMembers = (parties || []).reduce((sum, party) => sum + (party.member_count || 0), 0);

    return {
        categories,
        groupItems,
        query,
        selectedCategory,
        safeOffset,
        limit,
        hasMore,
        totalMembers,
    };
}
