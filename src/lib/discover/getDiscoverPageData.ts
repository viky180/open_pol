import type { Category, LocationScope, Party } from '@/types/database';
import type { Database } from '@/types/database';
import type { DiscoverAllianceItem, DiscoverGroupItem, ExploreScope, GroupType } from '@/types/discover';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolvePartyDisplayName } from '@/lib/foundingGroups';

export type DiscoverView = 'groups' | 'alliances' | 'issues';

type DiscoverSearchParams = {
    q?: string;
    category?: string;
    offset?: string;
    limit?: string;
    view?: string;
    scope?: string;
};

type PartyWithMemberCountRow = Party & {
    member_count?: number | null;
};

type AllianceMemberPartyRow = {
    id: string;
    issue_text: string;
    location_scope: string | null;
    location_label: string | null;
    member_count: number | null;
};

type AllianceMemberRow = {
    alliance_id: string;
    party_id: string;
    parties: AllianceMemberPartyRow | AllianceMemberPartyRow[] | null;
};




export type DiscoverIssueItem = {
    id: string;
    issue_text: string;
    nationalGroupCount: number;
    leadingGroupMemberCount: number;
};

export type DiscoverPageData = {
    activeView: DiscoverView;
    categories: Category[];
    groupItems: DiscoverGroupItem[];
    allianceItems: DiscoverAllianceItem[];
    issueItems: DiscoverIssueItem[];
    query: string;
    selectedCategory: string;
    selectedScope: ExploreScope;
    safeOffset: number;
    limit: number;
    hasMore: boolean;
    totalMembers: number;
    activeMembershipPartyId: string | null;
};

const SCOPE_TO_DB_SCOPE: Record<ExploreScope, LocationScope> = {
    india: 'national',
    state: 'state',
    district: 'district',
    village: 'village',
};

function toExploreScope(value?: string): ExploreScope {
    if (value === 'state' || value === 'district' || value === 'village') {
        return value;
    }

    return 'india';
}

function buildTrendPercent(seed: number): number {
    return 12 + (Math.abs(seed) % 44);
}

async function getDiscoverAllianceItems(
    supabase: SupabaseClient<Database>,
    options: {
        selectedScope: ExploreScope;
        query: string;
    },
): Promise<DiscoverAllianceItem[]> {
    const { data: alliancesData } = await supabase
        .from('alliances')
        .select('*')
        .is('disbanded_at', null)
        .order('created_at', { ascending: false });

    const alliances = (alliancesData || []) as Database['public']['Tables']['alliances']['Row'][];

    if (alliances.length === 0) {
        return [];
    }

    const allianceIds = alliances.map((alliance) => alliance.id);
    const { data: allianceMembersData } = await supabase
        .from('alliance_members')
        .select(`
            alliance_id,
            party_id,
            parties:party_id (id, issue_text, location_scope, location_label, member_count)
        `)
        .in('alliance_id', allianceIds)
        .is('left_at', null);

    const allianceMembers = (allianceMembersData || []) as AllianceMemberRow[];

    const membersByAlliance = new Map<string, AllianceMemberRow[]>();
    allianceMembers.forEach((member) => {
        const bucket = membersByAlliance.get(member.alliance_id) || [];
        bucket.push(member);
        membersByAlliance.set(member.alliance_id, bucket);
    });

    const items = alliances.map((alliance) => {
        const members = membersByAlliance.get(alliance.id) || [];

        const normalizedMembers = members
            .map((member) => {
                const party = Array.isArray(member.parties)
                    ? member.parties[0]
                    : member.parties;

                if (!party) {
                    return null;
                }

                return {
                    partyId: member.party_id,
                    issueText: party.issue_text,
                    locationScope: party.location_scope,
                    locationLabel: party.location_label,
                    memberCount: party.member_count || 0,
                };
            })
            .filter((member): member is NonNullable<typeof member> => member !== null);

        const scopes = Array.from(
            new Set(
                normalizedMembers
                    .map((member) => member.locationScope)
                    .filter((scope): scope is string => Boolean(scope)),
            ),
        );

        const combinedMemberCount = normalizedMembers.reduce(
            (sum, member) => sum + member.memberCount,
            0,
        );

        const textBlob = `${alliance.name} ${alliance.description || ''} ${normalizedMembers.map((m) => m.issueText).join(' ')}`.toLowerCase();
        const queryMatches = !options.query || textBlob.includes(options.query.toLowerCase());
        const dbScope = SCOPE_TO_DB_SCOPE[options.selectedScope];
        const scopeMatches = options.selectedScope === 'india'
            ? true
            : normalizedMembers.some((member) => member.locationScope === dbScope);

        if (!queryMatches || !scopeMatches) {
            return null;
        }

        return {
            alliance,
            members: normalizedMembers,
            combinedMemberCount,
            groupCount: normalizedMembers.length,
            scopes,
            trendPercent: buildTrendPercent(combinedMemberCount + normalizedMembers.length),
        };
    });

    return items.filter((item): item is NonNullable<typeof item> => item !== null);
}

async function getDiscoverIssueItems(
    supabase: SupabaseClient<Database>,
    options: {
        query: string;
        selectedCategory: string;
    }
): Promise<DiscoverIssueItem[]> {
    // Fetch all issues (with category and search filters if applicable)
    let issuesQuery = supabase
        .from('issues')
        .select('id, issue_text, category_id')
        .order('issue_text', { ascending: true });

    if (options.selectedCategory) {
        issuesQuery = issuesQuery.eq('category_id', options.selectedCategory);
    }

    if (options.query) {
        issuesQuery = issuesQuery.ilike('issue_text', `%${options.query}%`);
    }

    const partyRowsQuery = supabase
        .from('parties')
        .select('id, issue_id')
        .eq('location_scope', 'national')
        .not('issue_id', 'is', null);

    const [{ data: issuesRaw }, { data: partyRows }] = await Promise.all([
        issuesQuery,
        partyRowsQuery
    ]);

    const issuesData = (issuesRaw || []) as Array<{ id: string; issue_text: string }>;
    if (issuesData.length === 0) return [];

    // Fetch national groups grouped per issue
    // Since parties_with_member_counts view may lack issue_id, we fetch base table first
    const nationalParties = (partyRows || []) as Array<{ id: string; issue_id: string }>;
    const partyIds = nationalParties.map((p) => p.id);

    // Fetch member counts for those parties
    const { data: memberCountRows } = partyIds.length > 0
        ? await supabase
            .from('parties_with_member_counts')
            .select('id, member_count')
            .in('id', partyIds)
        : { data: [] as Array<{ id: string; member_count: number | null }> };

    const memberCountsById = new Map<string, number>();
    (memberCountRows || []).forEach((row) => {
        memberCountsById.set(row.id, row.member_count || 0);
    });

    const groupsByIssue = new Map<string, number[]>();
    nationalParties.forEach((g) => {
        if (!g.issue_id) return;
        const counts = groupsByIssue.get(g.issue_id) || [];
        counts.push(memberCountsById.get(g.id) || 0);
        groupsByIssue.set(g.issue_id, counts);
    });

    return issuesData.map((issue) => {
        const counts = (groupsByIssue.get(issue.id) || []).sort((a, b) => b - a);
        return {
            id: issue.id,
            issue_text: issue.issue_text,
            nationalGroupCount: counts.length,
            leadingGroupMemberCount: counts[0] || 0,
        };
    });
}

export async function getDiscoverPageData(
    supabase: SupabaseClient<Database>,
    searchParams?: DiscoverSearchParams,
): Promise<DiscoverPageData> {
    const selectedScope = toExploreScope(searchParams?.scope);
    const activeView: DiscoverView = searchParams?.view === 'alliances'
        ? 'alliances'
        : searchParams?.view === 'groups'
            ? 'groups'
            : searchParams?.view === 'issues'
                ? 'issues'
                : selectedScope === 'india' ? 'issues' : 'groups';
    const query = searchParams?.q?.trim() || '';
    const selectedCategory = searchParams?.category?.trim() || '';
    // selectedScope already defined above
    const offset = Number.parseInt(searchParams?.offset || '0', 10);
    const limit = Math.min(Math.max(Number.parseInt(searchParams?.limit || '24', 10), 12), 60);
    const safeOffset = Number.isNaN(offset) || offset < 0 ? 0 : offset;

    // Start independent promises concurrently
    const userContextPromise = (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { user: null, activeMembershipPartyId: null };

        const membershipResult = await supabase
            .from('memberships')
            .select('party_id')
            .eq('user_id', user.id)
            .is('left_at', null)
            .maybeSingle();

        const membership = membershipResult.data as { party_id: string } | null;
        return { user, activeMembershipPartyId: membership?.party_id || null };
    })();

    const categoriesPromise = supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

    if (activeView === 'alliances') {
        const [categoriesResult, userContext, allianceItems] = await Promise.all([
            categoriesPromise,
            userContextPromise,
            getDiscoverAllianceItems(supabase, { selectedScope, query }),
        ]);

        return {
            activeView,
            categories: categoriesResult.data || [],
            groupItems: [],
            allianceItems,
            issueItems: [],
            query,
            selectedCategory,
            selectedScope,
            safeOffset,
            limit,
            hasMore: false,
            totalMembers: 0,
            activeMembershipPartyId: userContext.activeMembershipPartyId,
        };
    }

    if (activeView === 'issues') {
        const [categoriesResult, userContext, issueItems] = await Promise.all([
            categoriesPromise,
            userContextPromise,
            getDiscoverIssueItems(supabase, { query, selectedCategory }),
        ]);

        return {
            activeView,
            categories: categoriesResult.data || [],
            groupItems: [],
            allianceItems: [],
            issueItems,
            query,
            selectedCategory,
            selectedScope,
            safeOffset,
            limit,
            hasMore: false,
            totalMembers: 0,
            activeMembershipPartyId: userContext.activeMembershipPartyId,
        };
    }

    const isSearching = query.length > 0;
    const dbScope = SCOPE_TO_DB_SCOPE[selectedScope];

    const partyRowsPromise = (() => {
        let partiesQuery = supabase
            .from('parties_with_member_counts')
            .select('*')
            .eq('location_scope', dbScope)
            .order('created_at', { ascending: false })
            .range(safeOffset, safeOffset + limit);

        if (selectedCategory) {
            partiesQuery = partiesQuery.eq('category_id', selectedCategory);
        }

        if (isSearching) {
            partiesQuery = partiesQuery.ilike('issue_text', `%${query}%`);
        }

        return partiesQuery;
    })();

    const [categoriesResult, userContext, partyRowsResult] = await Promise.all([
        categoriesPromise,
        userContextPromise,
        partyRowsPromise,
    ]);

    const categories = categoriesResult.data || [];
    const partyRows = partyRowsResult.data;
    const activeMembershipPartyId = userContext.activeMembershipPartyId;
    const user = userContext.user;
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
        const looksLikeChildNode = p.node_type === 'group';

        // At state/district/block/village levels, groups will naturally have parents (their higher-level scope representations)
        // so we shouldn't filter them out just for having a parent if they match the current scope.
        if (dbScope !== 'national') {
            return !looksLikeChildNode;
        }

        const hasParent = parentByPartyId.has(p.id);
        return !hasParent && !looksLikeChildNode;
    });

    const visiblePartyIds = parties.map((p) => p.id);

    const [likeRowsResult, likedByMeRowsResult] = await Promise.all([
        visiblePartyIds.length > 0
            ? supabase
                .from('party_likes')
                .select('party_id')
                .in('party_id', visiblePartyIds)
            : Promise.resolve({ data: [] as { party_id: string }[] }),
        visiblePartyIds.length > 0 && user
            ? supabase
                .from('party_likes')
                .select('party_id')
                .eq('user_id', user.id)
                .in('party_id', visiblePartyIds)
            : Promise.resolve({ data: [] as { party_id: string }[] }),
    ]);

    const likesByPartyId = new Map<string, number>();
    (likeRowsResult.data || []).forEach((row) => {
        likesByPartyId.set(row.party_id, (likesByPartyId.get(row.party_id) || 0) + 1);
    });

    const likedByMeSet = new Set((likedByMeRowsResult.data || []).map((row) => row.party_id));

    const parentIds = Array.from(
        new Set(
            allParties
                .map((party) => party.parent_party_id)
                .filter((value): value is string => Boolean(value))
        )
    );

    const [directChildrenResult, parentNamesResult] = await Promise.all([
        visiblePartyIds.length > 0
            ? supabase
                .from('parties')
                .select('id, parent_party_id')
                .in('parent_party_id', visiblePartyIds)
            : Promise.resolve({ data: [] as { id: string; parent_party_id: string | null }[] }),
        parentIds.length > 0
            ? supabase
                .from('parties')
                .select('id, issue_text, is_founding_group, location_scope, location_label, state_name, district_name, block_name, panchayat_name, village_name')
                .in('id', parentIds)
            : Promise.resolve({ data: [] as { id: string; issue_text: string; is_founding_group: boolean | null; location_scope: string | null; location_label: string | null; state_name: string | null; district_name: string | null; block_name: string | null; panchayat_name: string | null; village_name: string | null }[] }),
    ]);

    const childrenCountByParentId = new Map<string, number>();
    (directChildrenResult.data || []).forEach((row) => {
        if (!row.parent_party_id) return;
        childrenCountByParentId.set(row.parent_party_id, (childrenCountByParentId.get(row.parent_party_id) || 0) + 1);
    });

    const parentNameById = new Map<string, string>();
    (parentNamesResult.data || []).forEach((row) => {
        parentNameById.set(row.id, resolvePartyDisplayName({
            partyName: row.issue_text,
            isFoundingGroup: row.is_founding_group,
            issueText: row.issue_text,
            locationScope: row.location_scope as LocationScope | undefined,
            locationLabel: row.location_label,
            stateName: row.state_name,
            districtName: row.district_name,
            blockName: row.block_name,
            panchayatName: row.panchayat_name,
            villageName: row.village_name
        }));
    });


    let groupItems: DiscoverGroupItem[];

    if (isSearching) {
        groupItems = parties.map((p) => ({
            party: p,
            memberCount: p.member_count || 0,
            likeCount: likesByPartyId.get(p.id) || 0,
            likedByMe: likedByMeSet.has(p.id),
            joinedByMe: activeMembershipPartyId === p.id,
            trendPercent: buildTrendPercent((p.member_count || 0) + (likesByPartyId.get(p.id) || 0)),
            lastActiveAt: p.created_at,
            type: 'standalone' as GroupType,
            hasChildren: childrenCountByParentId.has(p.id),
            parentName: p.parent_party_id ? parentNameById.get(p.parent_party_id) : undefined,
        }));
    } else {
        groupItems = parties.map((party) => {
            const hasChildren = childrenCountByParentId.has(party.id);
            const type: GroupType = hasChildren ? 'parent' : 'standalone';

            return {
                party,
                memberCount: party.member_count || 0,
                likeCount: likesByPartyId.get(party.id) || 0,
                likedByMe: likedByMeSet.has(party.id),
                joinedByMe: activeMembershipPartyId === party.id,
                trendPercent: buildTrendPercent((party.member_count || 0) + (likesByPartyId.get(party.id) || 0)),
                lastActiveAt: party.created_at,
                type,
                hasChildren,
                parentName: party.parent_party_id ? parentNameById.get(party.parent_party_id) : undefined,
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
        activeView,
        categories,
        groupItems,
        allianceItems: [],
        issueItems: [],
        query,
        selectedCategory,
        selectedScope,
        safeOffset,
        limit,
        hasMore,
        totalMembers,
        activeMembershipPartyId,
    };
}
