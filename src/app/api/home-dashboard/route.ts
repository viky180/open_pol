import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveUserContext } from '@/lib/effectiveUser';

export const dynamic = 'force-dynamic';

type Scope = 'india' | 'state' | 'district';

type DashboardResponse = {
    myGroups: Array<{
        id: string;
        name: string;
        memberCount: number;
        category: string;
        joinedAt: string;
        lastActivityAt: string;
        lastActivityPreview: string;
    }>;
    actionItems: Array<{
        id: string;
        type: 'trust_expiring';
        label: string;
        urgency: 'high' | 'medium' | 'low';
        linkUrl: string;
        meta?: Record<string, unknown>;
    }>;
    representation: {
        partyId: string;
        partyName: string;
        leaderName: string | null;
        trustExpiresInDays: number | null;
    } | null;
    trending: Array<{
        partyId: string;
        issueText: string;
        memberChange: number;
        memberChangePct: number;
        currentMembers: number;
    }>;
    fastestGrowing: Array<{
        partyId: string;
        issueText: string;
        memberChange: number;
        memberChangePct: number;
        currentMembers: number;
    }>;
    mostDiscussed: Array<{
        partyId: string;
        issueText: string;
        discussionCount: number;
        currentMembers: number;
    }>;
    userState: string | null;
    userDistrict: string | null;
    selectedScope: Scope;
};

type SnapshotRow = {
    party_id: string;
    member_count: number;
    supporter_count: number;
    like_count: number;
    recorded_at: string;
};

function deduplicateByParty(rows: SnapshotRow[]): Map<string, SnapshotRow> {
    const map = new Map<string, SnapshotRow>();
    for (const row of rows) {
        if (!map.has(row.party_id)) {
            map.set(row.party_id, row);
        }
    }
    return map;
}

function selectScope(requested: string | null, userState: string | null, userDistrict: string | null): Scope {
    if (requested === 'india' || requested === 'state' || requested === 'district') {
        if (requested === 'district' && !userDistrict) return userState ? 'state' : 'india';
        if (requested === 'state' && !userState) return 'india';
        return requested;
    }

    return userState ? 'state' : 'india';
}

async function getScopedPartyIds(
    supabase: Awaited<ReturnType<typeof createClient>>,
    scope: Scope,
    userState: string | null,
    userDistrict: string | null
): Promise<string[] | null> {
    if (scope === 'india') return null;
    if (scope === 'state' && userState) {
        const { data } = await supabase.from('parties').select('id').eq('state_name', userState).limit(5000);
        return (data || []).map((p: { id: string }) => p.id);
    }

    if (scope === 'district' && userState && userDistrict) {
        const { data } = await supabase
            .from('parties')
            .select('id')
            .eq('state_name', userState)
            .eq('district_name', userDistrict)
            .limit(5000);
        return (data || []).map((p: { id: string }) => p.id);
    }

    return null;
}

export async function GET(request?: NextRequest) {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => cookieStore.get(name)?.value
    );

    const effectiveUserId = userContext?.effectiveUserId ?? null;

    const response: DashboardResponse = {
        myGroups: [],
        actionItems: [],
        representation: null,
        trending: [],
        fastestGrowing: [],
        mostDiscussed: [],
        userState: null,
        userDistrict: null,
        selectedScope: 'india',
    };

    let myPartyIds: string[] = [];
    let currentPartyId: string | null = null;

    if (effectiveUserId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('state, district')
            .eq('id', effectiveUserId)
            .maybeSingle();

        response.userState = profile?.state ?? null;
        response.userDistrict = profile?.district ?? null;

        const { data: memberships } = await supabase
            .from('memberships')
            .select(`
        party_id,
        joined_at,
        parties!inner(
          id,
          issue_text,
          category_id,
          state_name,
          district_name,
          categories(name)
        )
      `)
            .eq('user_id', effectiveUserId)
            .is('left_at', null);

        const membershipRows = (memberships || []) as Array<{
            party_id: string;
            joined_at: string;
            parties:
            | {
                id: string;
                issue_text: string;
                category_id: string | null;
                state_name: string | null;
                district_name: string | null;
                categories: { name: string } | { name: string }[] | null;
            }
            | {
                id: string;
                issue_text: string;
                category_id: string | null;
                state_name: string | null;
                district_name: string | null;
                categories: { name: string } | { name: string }[] | null;
            }[];
        }>;

        myPartyIds = membershipRows.map((m) => m.party_id);

        if (membershipRows.length > 0) {
            currentPartyId = membershipRows[0].party_id;
            const primaryParty = Array.isArray(membershipRows[0].parties)
                ? membershipRows[0].parties[0]
                : membershipRows[0].parties;

            // Fallback to membership location only when profile location is unavailable.
            response.userState = response.userState ?? primaryParty?.state_name ?? null;
            response.userDistrict = response.userDistrict ?? primaryParty?.district_name ?? null;
        }

        const requestedScope = request ? new URL(request.url).searchParams.get('scope') : null;
        response.selectedScope = selectScope(requestedScope, response.userState, response.userDistrict);

        if (myPartyIds.length > 0) {
            const { data: memberCountRows } = await supabase
                .from('parties_with_member_counts')
                .select('id, member_count')
                .in('id', myPartyIds);

            const memberCountMap = new Map(
                (memberCountRows || []).map((row: { id: string; member_count: number | null }) => [row.id, row.member_count || 0])
            );

            const [postsRes, questionsRes] = await Promise.all([
                supabase
                    .from('party_posts')
                    .select('id, party_id, created_at, profiles!party_posts_created_by_fkey(display_name)')
                    .in('party_id', myPartyIds)
                    .order('created_at', { ascending: false })
                    .limit(500),
                supabase
                    .from('questions')
                    .select('id, party_id, created_at')
                    .in('party_id', myPartyIds)
                    .order('created_at', { ascending: false })
                    .limit(500),
            ]);

            const activityMap = new Map<string, { at: string; preview: string }>();

            ((postsRes.data || []) as Array<{
                party_id: string;
                created_at: string;
                profiles: { display_name: string | null } | { display_name: string | null }[] | null;
            }>).forEach((post) => {
                const existing = activityMap.get(post.party_id);
                if (!existing || new Date(post.created_at).getTime() > new Date(existing.at).getTime()) {
                    const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
                    const author = profile?.display_name?.trim() || 'a member';
                    activityMap.set(post.party_id, {
                        at: post.created_at,
                        preview: `New post by ${author}`,
                    });
                }
            });

            ((questionsRes.data || []) as Array<{ party_id: string; created_at: string }>).forEach((question) => {
                const existing = activityMap.get(question.party_id);
                if (!existing || new Date(question.created_at).getTime() > new Date(existing.at).getTime()) {
                    activityMap.set(question.party_id, {
                        at: question.created_at,
                        preview: 'New question raised',
                    });
                }
            });

            response.myGroups = membershipRows
                .map((membership) => {
                    const party = Array.isArray(membership.parties) ? membership.parties[0] : membership.parties;
                    const category = Array.isArray(party?.categories) ? party.categories[0] : party?.categories;
                    const activity = activityMap.get(membership.party_id);
                    return {
                        id: membership.party_id,
                        name: party?.issue_text || 'Unnamed Group',
                        memberCount: memberCountMap.get(membership.party_id) || 0,
                        category: category?.name || 'General',
                        joinedAt: membership.joined_at,
                        lastActivityAt: activity?.at || membership.joined_at,
                        lastActivityPreview: activity?.preview || 'You joined this group',
                    };
                })
                .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

            if (currentPartyId) {
                const currentGroup = response.myGroups.find((g) => g.id === currentPartyId);

                const { data: leaderVotes } = await supabase
                    .from('trust_votes')
                    .select('to_user_id, profiles!trust_votes_to_user_id_fkey(display_name)')
                    .eq('party_id', currentPartyId)
                    .gt('expires_at', new Date().toISOString());

                const voteCounts: Record<string, { count: number; name: string | null }> = {};
                (leaderVotes || []).forEach((vote: {
                    to_user_id: string;
                    profiles: { display_name: string | null } | { display_name: string | null }[] | null;
                }) => {
                    const userId = vote.to_user_id;
                    const profile = Array.isArray(vote.profiles) ? vote.profiles[0] : vote.profiles;
                    if (!voteCounts[userId]) voteCounts[userId] = { count: 0, name: profile?.display_name ?? null };
                    voteCounts[userId].count += 1;
                });

                const leaderEntry = Object.entries(voteCounts).sort((a, b) => b[1].count - a[1].count)[0];

                const { data: userVote } = await supabase
                    .from('trust_votes')
                    .select('expires_at')
                    .eq('party_id', currentPartyId)
                    .eq('from_user_id', effectiveUserId)
                    .gt('expires_at', new Date().toISOString())
                    .maybeSingle();

                let trustExpiresInDays: number | null = null;
                if (userVote?.expires_at) {
                    const expiresAt = new Date(userVote.expires_at);
                    const now = new Date();
                    trustExpiresInDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                }

                response.representation = currentGroup
                    ? {
                        partyId: currentPartyId,
                        partyName: currentGroup.name,
                        leaderName: leaderEntry?.[1]?.name ?? null,
                        trustExpiresInDays,
                    }
                    : null;
            }

            const now = new Date();
            const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

            const [expiringVotesRes] = await Promise.all([
                supabase
                    .from('trust_votes')
                    .select('id, party_id, expires_at')
                    .eq('from_user_id', effectiveUserId)
                    .in('party_id', myPartyIds)
                    .gt('expires_at', now.toISOString())
                    .lte('expires_at', in3Days.toISOString())
                    .order('expires_at', { ascending: true })
                    .limit(20),
            ]);

            const partyNameMap = new Map(response.myGroups.map((g) => [g.id, g.name]));

            ((expiringVotesRes.data || []) as Array<{ id: string; party_id: string; expires_at: string }>).forEach((vote) => {
                const expiresInDays = Math.ceil((new Date(vote.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const groupName = partyNameMap.get(vote.party_id) || 'this group';
                response.actionItems.push({
                    id: `trust-${vote.id}`,
                    type: 'trust_expiring',
                    label: `Your trust vote in ${groupName} expires in ${Math.max(0, expiresInDays)} day${Math.abs(expiresInDays) === 1 ? '' : 's'}`,
                    urgency: 'high',
                    linkUrl: `/party/${vote.party_id}`,
                    meta: { expiresAt: vote.expires_at },
                });
            });

            const urgencyRank: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 1, low: 2 };
            response.actionItems.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency]);
        }
    } else {
        response.selectedScope = request
            ? (new URL(request.url).searchParams.get('scope') === 'district' || new URL(request.url).searchParams.get('scope') === 'state'
                ? 'india'
                : ((new URL(request.url).searchParams.get('scope') as Scope | null) || 'india'))
            : 'india';
    }

    const scopedPartyIds = await getScopedPartyIds(supabase, response.selectedScope, response.userState, response.userDistrict);

    const now = new Date();
    const cutoff7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [latestSnapshotsRes, baselineSnapshotsRes] = await Promise.all([
        scopedPartyIds
            ? supabase
                .from('party_snapshots')
                .select('party_id, member_count, supporter_count, like_count, recorded_at')
                .in('party_id', scopedPartyIds.length > 0 ? scopedPartyIds : ['00000000-0000-0000-0000-000000000000'])
                .order('recorded_at', { ascending: false })
            : supabase
                .from('party_snapshots')
                .select('party_id, member_count, supporter_count, like_count, recorded_at')
                .order('recorded_at', { ascending: false }),
        scopedPartyIds
            ? supabase
                .from('party_snapshots')
                .select('party_id, member_count, supporter_count, like_count, recorded_at')
                .in('party_id', scopedPartyIds.length > 0 ? scopedPartyIds : ['00000000-0000-0000-0000-000000000000'])
                .gte('recorded_at', cutoff7.toISOString())
                .order('recorded_at', { ascending: true })
            : supabase
                .from('party_snapshots')
                .select('party_id, member_count, supporter_count, like_count, recorded_at')
                .gte('recorded_at', cutoff7.toISOString())
                .order('recorded_at', { ascending: true }),
    ]);

    const latestByParty = deduplicateByParty((latestSnapshotsRes.data || []) as SnapshotRow[]);
    const baselineByParty = deduplicateByParty((baselineSnapshotsRes.data || []) as SnapshotRow[]);

    const trendRows: Array<{
        partyId: string;
        currentMembers: number;
        memberChange: number;
        memberChangePct: number;
    }> = [];

    latestByParty.forEach((latest, partyId) => {
        const baseline = baselineByParty.get(partyId);
        const prevMembers = baseline ? baseline.member_count : latest.member_count;
        const memberChange = latest.member_count - prevMembers;
        const memberChangePct = prevMembers > 0
            ? Math.round((memberChange / prevMembers) * 1000) / 10
            : (memberChange > 0 ? 100 : 0);

        trendRows.push({
            partyId,
            currentMembers: latest.member_count,
            memberChange,
            memberChangePct,
        });
    });

    const trendPartyIds = trendRows.map((row) => row.partyId);
    const { data: trendParties } = await supabase
        .from('parties')
        .select('id, issue_text')
        .in('id', trendPartyIds.length > 0 ? trendPartyIds : ['00000000-0000-0000-0000-000000000000']);
    const trendPartyNameMap = new Map((trendParties || []).map((party: { id: string; issue_text: string }) => [party.id, party.issue_text]));

    const withNames = trendRows.map((row) => ({
        ...row,
        issueText: trendPartyNameMap.get(row.partyId) || 'Unknown group',
    }));

    const trendingSorted = [...withNames].sort((a, b) => b.memberChange - a.memberChange);
    const fastestSorted = [...withNames].sort((a, b) => b.memberChangePct - a.memberChangePct);

    response.trending = trendingSorted
        .filter((item) => item.memberChange > 0)
        .slice(0, 5)
        .map((item) => ({
            partyId: item.partyId,
            issueText: item.issueText,
            memberChange: item.memberChange,
            memberChangePct: item.memberChangePct,
            currentMembers: item.currentMembers,
        }));

    if (response.trending.length < 5) {
        response.trending = trendingSorted.slice(0, 5).map((item) => ({
            partyId: item.partyId,
            issueText: item.issueText,
            memberChange: item.memberChange,
            memberChangePct: item.memberChangePct,
            currentMembers: item.currentMembers,
        }));
    }

    response.fastestGrowing = fastestSorted
        .filter((item) => item.memberChange > 0)
        .slice(0, 5)
        .map((item) => ({
            partyId: item.partyId,
            issueText: item.issueText,
            memberChange: item.memberChange,
            memberChangePct: item.memberChangePct,
            currentMembers: item.currentMembers,
        }));

    if (response.fastestGrowing.length < 5) {
        response.fastestGrowing = fastestSorted.slice(0, 5).map((item) => ({
            partyId: item.partyId,
            issueText: item.issueText,
            memberChange: item.memberChange,
            memberChangePct: item.memberChangePct,
            currentMembers: item.currentMembers,
        }));
    }

    const [recentPostsRes, recentQuestionsRes] = await Promise.all([
        scopedPartyIds
            ? supabase
                .from('party_posts')
                .select('party_id, created_at')
                .in('party_id', scopedPartyIds.length > 0 ? scopedPartyIds : ['00000000-0000-0000-0000-000000000000'])
                .gte('created_at', cutoff7.toISOString())
                .limit(5000)
            : supabase
                .from('party_posts')
                .select('party_id, created_at')
                .gte('created_at', cutoff7.toISOString())
                .limit(5000),
        scopedPartyIds
            ? supabase
                .from('questions')
                .select('party_id, created_at')
                .in('party_id', scopedPartyIds.length > 0 ? scopedPartyIds : ['00000000-0000-0000-0000-000000000000'])
                .gte('created_at', cutoff7.toISOString())
                .limit(5000)
            : supabase
                .from('questions')
                .select('party_id, created_at')
                .gte('created_at', cutoff7.toISOString())
                .limit(5000),
    ]);

    const discussionCounts = new Map<string, number>();
    ((recentPostsRes.data || []) as Array<{ party_id: string }>).forEach((row) => {
        discussionCounts.set(row.party_id, (discussionCounts.get(row.party_id) || 0) + 1);
    });
    ((recentQuestionsRes.data || []) as Array<{ party_id: string }>).forEach((row) => {
        discussionCounts.set(row.party_id, (discussionCounts.get(row.party_id) || 0) + 1);
    });

    const discussedPartyIds = Array.from(discussionCounts.keys());

    const [discussedPartiesRes, discussedMemberCountsRes] = await Promise.all([
        supabase
            .from('parties')
            .select('id, issue_text')
            .in('id', discussedPartyIds.length > 0 ? discussedPartyIds : ['00000000-0000-0000-0000-000000000000']),
        supabase
            .from('parties_with_member_counts')
            .select('id, member_count')
            .in('id', discussedPartyIds.length > 0 ? discussedPartyIds : ['00000000-0000-0000-0000-000000000000']),
    ]);

    const discussedNameMap = new Map((discussedPartiesRes.data || []).map((row: { id: string; issue_text: string }) => [row.id, row.issue_text]));
    const discussedMemberMap = new Map((discussedMemberCountsRes.data || []).map((row: { id: string; member_count: number | null }) => [row.id, row.member_count || 0]));

    response.mostDiscussed = discussedPartyIds
        .map((partyId) => ({
            partyId,
            issueText: discussedNameMap.get(partyId) || 'Unknown group',
            discussionCount: discussionCounts.get(partyId) || 0,
            currentMembers: discussedMemberMap.get(partyId) || 0,
        }))
        .sort((a, b) => b.discussionCount - a.discussionCount)
        .slice(0, 5);

    return NextResponse.json(response);
}
