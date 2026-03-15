import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PartyDetailClient } from './PartyDetailClient';
import { isAdminUserId } from '@/lib/admin';
import { cookies } from 'next/headers';
import { ADMIN_IMPERSONATION_COOKIE } from '@/lib/effectiveUser';
import type {
    MemberWithVotes,
    QAMetrics,
    Party,
} from '@/types/database';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

type AllianceSummary = {
    id: string;
    name: string;
    created_by?: string | null;
};

type ActivityItem = {
    id: string;
    type: 'post' | 'leader_message' | 'question' | 'milestone';
    title: string;
    preview: string;
    created_at: string;
};

export default async function PartyPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();
    const now = new Date();
    const nowIso = now.toISOString();

    // ============================================
    // STEP 1: Party + user in parallel (both needed for everything else)
    // ============================================
    const [partyResult, userResult, cookieStore] = await Promise.all([
        supabase.from('parties').select('*').eq('id', id).single(),
        supabase.auth.getUser(),
        cookies(),
    ]);

    const { data: party, error } = partyResult;
    if (error || !party) {
        notFound();
    }

    const user = userResult.data?.user;
    const isAdmin = isAdminUserId(user?.id);
    const impersonatedUserId = isAdmin ? (cookieStore.get(ADMIN_IMPERSONATION_COOKIE)?.value || null) : null;
    const effectiveUserId = impersonatedUserId || user?.id || null;

    // ============================================
    // STEP 2: ALL remaining queries in one parallel batch
    // ============================================
    type AncestorNode = {
        id: string;
        location_scope: string | null;
        state_name: string | null;
        district_name: string | null;
        village_name: string | null;
        location_label: string | null;
        issue_text: string;
    };

    const [
        memberCountResult,
        membershipsResult,
        trustVotesResult,
        levelLeaderResult,
        likeCountResult,
        issueResult,
        totalQuestionsResult,
        unansweredProbeResult,
        userQueriesResult,
        parentPartyResult,
        siblingResult,
        subgroupsResult,
        allianceMembershipResult,
        rankResult,
        weeklyTrendResult,
        postsResult,
        questionsResult,
        milestonesResult,
        petitionCampaignsResult,
        userStateResult,
        candidaciesResult,
    ] = await Promise.all([
        // Member count
        supabase.from('parties').select('member_count').eq('id', id).maybeSingle(),

        // Members with profiles
        supabase.from('memberships').select(`
            user_id,
            joined_at,
            profiles:user_id (display_name, bio)
        `).eq('party_id', id).is('left_at', null),

        // Trust votes
        supabase.from('trust_votes').select('to_user_id').eq('party_id', id).gt('expires_at', nowIso),

        // Level leader RPC
        supabase.rpc('get_party_leader', { p_party_id: id }),

        // Like count
        supabase.from('party_likes').select('*', { count: 'exact', head: true }).eq('party_id', id),

        // Issue text
        party.issue_id
            ? supabase.from('issues').select('issue_text').eq('id', party.issue_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),

        // Q&A counts
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('party_id', id),
        supabase.from('questions').select('id, answers(id)').eq('party_id', id),

        // User-specific queries (bundled)
        effectiveUserId
            ? Promise.all([
                supabase.from('memberships').select('id, joined_at').eq('party_id', id).eq('user_id', effectiveUserId).is('left_at', null).maybeSingle(),
                (() => {
                    const base = supabase
                        .from('memberships')
                        .select('party_id, parties!inner(location_scope, issue_text)')
                        .eq('user_id', effectiveUserId)
                        .is('left_at', null)
                        .eq('parties.location_scope', party.location_scope || 'district')
                        .neq('party_id', id)
                        .limit(1);
                    return (party.issue_id ? base.eq('parties.issue_id', party.issue_id) : base).maybeSingle();
                })(),
                supabase.from('trust_votes').select('to_user_id, expires_at').eq('party_id', id).eq('from_user_id', effectiveUserId).gt('expires_at', nowIso).maybeSingle(),
                supabase.rpc('is_coalition_eligible_voter', { p_party_id: id, p_user_id: effectiveUserId }),
                supabase.from('party_likes').select('id').eq('party_id', id).eq('user_id', effectiveUserId).maybeSingle(),
            ])
            : Promise.resolve(null),

        // Parent party
        party.parent_party_id
            ? supabase.from('parties').select('*').eq('id', party.parent_party_id).maybeSingle()
            : Promise.resolve({ data: null }),

        // Sibling groups
        (async () => {
            if (!party.parent_party_id) return [];
            let siblingQuery = supabase
                .from('parties')
                .select('id, issue_text, icon_svg, icon_image_url, member_count')
                .eq('parent_party_id', party.parent_party_id)
                .eq('location_scope', party.location_scope || 'district')
                .neq('id', id);

            const scope = party.location_scope || 'district';
            if (scope === 'state' && party.state_name) {
                siblingQuery = siblingQuery.eq('state_name', party.state_name);
            } else if (scope === 'district' && party.district_name) {
                siblingQuery = siblingQuery.eq('state_name', party.state_name || '').eq('district_name', party.district_name);
            } else if (scope === 'block' && party.block_name) {
                siblingQuery = siblingQuery.eq('state_name', party.state_name || '').eq('block_name', party.block_name);
            } else if (scope === 'panchayat' && party.panchayat_name) {
                siblingQuery = siblingQuery.eq('panchayat_name', party.panchayat_name);
            } else if (scope === 'village' && party.village_name) {
                siblingQuery = siblingQuery.eq('village_name', party.village_name);
            }

            const { data: siblingRows } = await siblingQuery;
            return (siblingRows || []).map((s: { id: string; issue_text: string; icon_svg?: string | null; icon_image_url?: string | null; member_count?: number | null }) => ({
                id: s.id,
                issue_text: s.issue_text,
                icon_svg: s.icon_svg || null,
                icon_image_url: s.icon_image_url || null,
                memberCount: s.member_count || 0,
            }));
        })(),

        // Sub-groups
        supabase.from('parties')
            .select('id, issue_text, icon_svg, icon_image_url, member_count, location_scope, state_name, district_name, block_name, panchayat_name, village_name')
            .eq('parent_party_id', id),

        // Alliance membership
        supabase.from('alliance_members').select(`
            alliance_id,
            alliances (
                id,
                name,
                created_by
            )
        `).eq('party_id', id).is('left_at', null).maybeSingle(),

        // Rank context
        (async () => {
            const scope = party.location_scope || 'district';
            let rankQuery = supabase.from('parties').select('id, member_count').eq('location_scope', scope);

            if (scope === 'state' && party.state_name) {
                rankQuery = rankQuery.eq('state_name', party.state_name);
            } else if (scope === 'district' && party.state_name && party.district_name) {
                rankQuery = rankQuery.eq('state_name', party.state_name).eq('district_name', party.district_name);
            } else if (scope === 'block' && party.state_name && party.block_name) {
                rankQuery = rankQuery.eq('state_name', party.state_name).eq('block_name', party.block_name);
            } else if (scope === 'panchayat' && party.panchayat_name) {
                rankQuery = rankQuery.eq('panchayat_name', party.panchayat_name);
            } else if (scope === 'village' && party.village_name) {
                rankQuery = rankQuery.eq('village_name', party.village_name);
            }

            const { data: sameScopeParties } = await rankQuery;
            const peers = sameScopeParties || [];
            if (peers.length === 0) return { rank: 1, total: 1, isLeading: true };

            const sorted = [...peers].sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
            const index = sorted.findIndex((row) => row.id === id);
            return {
                rank: index >= 0 ? index + 1 : sorted.length + 1,
                total: sorted.length,
                isLeading: index === 0,
            };
        })(),

        // Weekly trend
        (async () => {
            const cutoff = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
            const { data: snapshots } = await supabase
                .from('party_snapshots')
                .select('member_count, recorded_at')
                .eq('party_id', id)
                .gte('recorded_at', cutoff)
                .order('recorded_at', { ascending: true });

            if (!snapshots || snapshots.length < 2) return { delta: 0, percent: 0 };

            const first = snapshots[0];
            const last = snapshots[snapshots.length - 1];
            const delta = (last.member_count || 0) - (first.member_count || 0);
            const percent = first.member_count > 0
                ? Math.round((delta / first.member_count) * 100)
                : delta > 0 ? 100 : 0;
            return { delta, percent };
        })(),

        // Activity: posts, questions, milestones, petitions
        supabase.from('party_posts')
            .select('id, content, created_at, created_by, profiles!party_posts_created_by_fkey(display_name)')
            .eq('party_id', id).order('created_at', { ascending: false }).limit(8),
        supabase.from('questions')
            .select('id, question_text, created_at, answers(id)')
            .eq('party_id', id).order('created_at', { ascending: false }).limit(8),
        supabase.from('party_milestones')
            .select('id, threshold, member_count_at_event, created_at')
            .eq('party_id', id).order('created_at', { ascending: false }).limit(8),
        supabase.from('petition_campaigns')
            .select('id, title, description, target_signatures, status, ends_at, created_at')
            .eq('party_id', id).in('status', ['active', 'threshold_met']).order('created_at', { ascending: false }).limit(6),

        // User state (for chapter highlighting on national groups)
        effectiveUserId && party.location_scope === 'national'
            ? supabase.from('profiles').select('state').eq('id', effectiveUserId).maybeSingle()
            : Promise.resolve({ data: null }),

        // Active candidacies for this group
        supabase.from('candidacies').select('user_id').eq('party_id', id).is('withdrawn_at', null),
    ]);

    // ============================================
    // STEP 3: Extract results and do post-processing
    // ============================================

    // User-specific data
    type UserQueryResults = [
        { data: { id: string; joined_at: string } | null },
        { data: { party_id: string; parties: { location_scope: string | null; issue_text: string } | { location_scope: string | null; issue_text: string }[] | null } | null },
        { data: { to_user_id: string; expires_at: string } | null },
        { data: boolean | null },
        { data: { id: string } | null },
    ];
    const [userMembershipResult, sameScopeConflictResult, userVoteResult, eligibleVoterResult, likedByMeResult]: UserQueryResults = userQueriesResult
        ? userQueriesResult as UserQueryResults
        : [{ data: null }, { data: null }, { data: null }, { data: false }, { data: null }];

    const memberCount = (memberCountResult.data as { member_count: number | null } | null)?.member_count ?? 0;
    const memberships = membershipsResult.data;
    const trustVotes = trustVotesResult.data;

    const userMembership = userMembershipResult.data;
    const sameScopeConflict = sameScopeConflictResult.data as {
        party_id: string;
        parties: { location_scope: string | null; issue_text: string } | { location_scope: string | null; issue_text: string }[] | null;
    } | null;
    const sameScopeConflictPartyId = sameScopeConflict?.party_id || null;
    const sameScopeConflictPartyRelation = Array.isArray(sameScopeConflict?.parties)
        ? sameScopeConflict?.parties[0]
        : sameScopeConflict?.parties;
    const sameScopeConflictIssueText = sameScopeConflictPartyRelation?.issue_text || null;
    const userVote = userVoteResult.data;
    const isEligibleVoter = (eligibleVoterResult.data as boolean) || false;
    const likedByMe = !!likedByMeResult.data;
    const likeCount = likeCountResult.count || 0;
    const userStateName = userStateResult.data?.state ?? null;

    // ── Candidacies ──
    const candidateUserIds = new Set((candidaciesResult.data || []).map(c => c.user_id));
    const isCurrentUserCandidate = effectiveUserId ? candidateUserIds.has(effectiveUserId) : false;

    // ── Trust-vote counts within THIS group ──
    const voteCounts: Record<string, number> = {};
    trustVotes?.forEach(vote => {
        voteCounts[vote.to_user_id] = (voteCounts[vote.to_user_id] || 0) + 1;
    });

    // ── This group's OWN internal leader ──
    const groupInternalLeaderId: string | null = Object.keys(voteCounts).length > 0
        ? Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0][0]
        : null;

    // ── Level leader: from get_party_leader RPC ──
    const levelLeaderId = (levelLeaderResult.data as string | null) || null;

    const members: MemberWithVotes[] = (memberships || []).map(m => ({
        user_id: m.user_id as string,
        display_name: ((m.profiles as unknown) as { display_name: string | null } | null)?.display_name || null,
        bio: ((m.profiles as unknown) as { bio?: string | null } | null)?.bio || null,
        joined_at: m.joined_at as string,
        trust_votes: voteCounts[m.user_id as string] || 0,
        is_leader: m.user_id === groupInternalLeaderId,
        is_candidate: candidateUserIds.has(m.user_id as string),
    }));

    // Group-internal leader info
    const groupLeaderMember = members.find((m) => m.user_id === groupInternalLeaderId) || null;
    const groupLeaderSince = groupLeaderMember?.joined_at || null;
    const groupLeaderVoteCount = groupInternalLeaderId ? (voteCounts[groupInternalLeaderId] || 0) : 0;

    // Level leader info
    const levelLeaderMemberInThisGroup = members.find((m) => m.user_id === levelLeaderId) || null;
    const levelLeaderSince = levelLeaderMemberInThisGroup?.joined_at || null;
    const levelLeaderVoteCount = levelLeaderId ? (voteCounts[levelLeaderId] || 0) : 0;

    // Q&A metrics
    const totalQuestions = totalQuestionsResult.count || 0;
    const unansweredQuestions = (unansweredProbeResult.data || []).filter((q) => {
        const answers = (q as { answers?: Array<unknown> }).answers;
        return !answers || answers.length === 0;
    }).length;

    const qaMetrics: QAMetrics = {
        total_questions: totalQuestions,
        unanswered_questions: unansweredQuestions,
        avg_response_time_hours: null,
    };

    // Parent party + ancestor chain
    const currentParentParty = (parentPartyResult.data as Party | null) || null;

    const ancestorChain: AncestorNode[] = [];
    ancestorChain.push({
        id: party.id,
        location_scope: party.location_scope ?? null,
        state_name: party.state_name ?? null,
        district_name: party.district_name ?? null,
        village_name: party.village_name ?? null,
        location_label: party.location_label ?? null,
        issue_text: party.issue_text,
    });

    // Walk up the parent chain (sequential by nature, but parent is already fetched)
    let cursor: Party | null = currentParentParty;
    while (cursor && ancestorChain.length < 4) {
        ancestorChain.push({
            id: cursor.id,
            location_scope: cursor.location_scope ?? null,
            state_name: cursor.state_name ?? null,
            district_name: cursor.district_name ?? null,
            village_name: cursor.village_name ?? null,
            location_label: cursor.location_label ?? null,
            issue_text: cursor.issue_text,
        });
        if (cursor.parent_party_id) {
            const grandparentResult = await supabase
                .from('parties')
                .select('id, location_scope, state_name, district_name, village_name, location_label, issue_text, parent_party_id')
                .eq('id', cursor.parent_party_id)
                .maybeSingle();
            cursor = grandparentResult.data as Party | null;
        } else {
            cursor = null;
        }
    }

    // Sibling groups
    const siblingGroups = siblingResult;

    // Child groups
    const attachedSubgroups = (subgroupsResult.data || []) as Array<Pick<Party, 'id' | 'issue_text' | 'icon_svg' | 'icon_image_url' | 'location_scope' | 'state_name' | 'district_name' | 'block_name' | 'panchayat_name' | 'village_name'> & { member_count?: number | null }>;
    const childGroupsWithCounts = attachedSubgroups.map((subgroup) => ({
        id: subgroup.id,
        issue_text: subgroup.issue_text,
        icon_svg: subgroup.icon_svg || null,
        icon_image_url: subgroup.icon_image_url || null,
        memberCount: subgroup.member_count || 0,
        location_scope: subgroup.location_scope || null,
        state_name: subgroup.state_name || null,
        district_name: subgroup.district_name || null,
        block_name: subgroup.block_name || null,
        panchayat_name: subgroup.panchayat_name || null,
        village_name: subgroup.village_name || null,
    }));

    // Alliance (may need one follow-up parallel batch)
    const allianceRelation = allianceMembershipResult.data?.alliances as AllianceSummary | AllianceSummary[] | null | undefined;
    const allianceDetails = Array.isArray(allianceRelation) ? allianceRelation[0] : allianceRelation;

    let currentAlliance: {
        id: string;
        name: string;
        combinedMemberCount: number;
        leaderName: string | null;
    } | null = null;

    if (allianceDetails) {
        const [allianceMembersRes, allianceLeaderRes] = await Promise.all([
            supabase.from('alliance_members').select('party_id').eq('alliance_id', allianceDetails.id).is('left_at', null),
            allianceDetails.created_by
                ? supabase.from('profiles').select('display_name').eq('id', allianceDetails.created_by).maybeSingle()
                : Promise.resolve({ data: null }),
        ]);

        const alliancePartyIds = (allianceMembersRes.data || []).map((member: { party_id: string }) => member.party_id);
        let combinedMemberCount = 0;

        if (alliancePartyIds.length > 0) {
            const allianceCountsResult = await supabase.from('parties').select('member_count').in('id', alliancePartyIds);
            combinedMemberCount = ((allianceCountsResult.data as Array<{ member_count: number | null }> | null) || [])
                .reduce((sum, row) => sum + (row.member_count || 0), 0);
        }

        currentAlliance = {
            id: allianceDetails.id,
            name: allianceDetails.name,
            combinedMemberCount,
            leaderName: allianceLeaderRes.data?.display_name || null,
        };
    }

    const rankContext = rankResult;
    const weeklyTrend = weeklyTrendResult;

    // Activity items
    const activityItems: ActivityItem[] = [
        ...((postsResult.data || []).map((post: {
            id: string;
            content: string;
            created_at: string;
            created_by: string | null;
            profiles: { display_name: string | null } | { display_name: string | null }[] | null;
        }) => {
            const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
            const author = profile?.display_name || 'Member';
            const isLeaderPost = !!groupInternalLeaderId && post.created_by === groupInternalLeaderId;
            return {
                id: `post_${post.id}`,
                type: isLeaderPost ? 'leader_message' : 'post',
                title: isLeaderPost ? `Leader message from ${author}` : `Post by ${author}`,
                preview: post.content,
                created_at: post.created_at,
            } as ActivityItem;
        })),
        ...((questionsResult.data || []).map((question: {
            id: string;
            question_text: string;
            created_at: string;
            answers?: Array<unknown>;
        }) => ({
            id: `question_${question.id}`,
            type: 'question',
            title: 'New question',
            preview: `${question.question_text}${(question.answers || []).length > 0 ? ` · ${(question.answers || []).length} answer(s)` : ''}`,
            created_at: question.created_at,
        } as ActivityItem))),
        ...((milestonesResult.data || []).map((milestone: {
            id: string;
            threshold: number;
            member_count_at_event: number;
            created_at: string;
        }) => ({
            id: `milestone_${milestone.id}`,
            type: 'milestone',
            title: `Milestone reached: ${milestone.threshold}`,
            preview: `${milestone.member_count_at_event.toLocaleString('en-IN')} members at this milestone`,
            created_at: milestone.created_at,
        } as ActivityItem))),
    ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 12);

    // Petition campaigns with signature counts (parallel)
    const petitionCampaignRows = (petitionCampaignsResult.data || []) as Array<{
        id: string;
        title: string;
        description: string;
        target_signatures: number;
        status: string;
        ends_at: string;
        created_at: string;
    }>;

    const petitionSignatureCounts = await Promise.all(
        petitionCampaignRows.map(async (campaign) => {
            const { count } = await supabase
                .from('petition_signatures')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_id', campaign.id);
            return { campaign_id: campaign.id, signatures: count || 0 };
        })
    );
    const petitionCountMap = new Map(petitionSignatureCounts.map((row) => [row.campaign_id, row.signatures]));

    const petitionCampaigns = petitionCampaignRows.map((campaign) => ({
        ...campaign,
        signatures: petitionCountMap.get(campaign.id) || 0,
    }));

    return (
        <PartyDetailClient
            key={party.id}
            party={party}
            memberCount={memberCount || 0}
            members={members}
            questions={[]}
            qaMetrics={qaMetrics}
            currentUserId={effectiveUserId}
            isMember={!!userMembership}
            isEligibleVoter={isEligibleVoter}
            sameScopeConflictPartyId={sameScopeConflictPartyId}
            sameScopeConflictIssueText={sameScopeConflictIssueText}
            memberSince={userMembership?.joined_at || null}
            votedFor={userVote?.to_user_id || null}
            voteExpiresAt={userVote?.expires_at || null}
            currentParentParty={currentParentParty}
            ancestorChain={ancestorChain}
            childGroups={childGroupsWithCounts}
            siblingGroups={siblingGroups}
            currentAlliance={currentAlliance}
            canEditPartyIcon={isAdmin || groupInternalLeaderId === effectiveUserId}
            initialLikeCount={likeCount}
            initialLikedByMe={likedByMe}
            weeklyMemberDelta={weeklyTrend.delta}
            trendingPercent={weeklyTrend.percent}
            rankInScope={rankContext.rank}
            isLeadingInScope={rankContext.isLeading}
            groupLeaderMeta={{
                leaderId: groupInternalLeaderId,
                leaderName: groupLeaderMember?.display_name || null,
                leaderSince: groupLeaderSince,
                electedBy: groupLeaderVoteCount,
            }}
            levelLeaderMeta={{
                leaderId: levelLeaderId,
                leaderName: levelLeaderMemberInThisGroup?.display_name || null,
                leaderSince: levelLeaderSince,
                electedBy: levelLeaderVoteCount,
                isFromThisGroup: rankContext.isLeading,
            }}
            activityItems={activityItems}
            petitionCampaigns={petitionCampaigns}
            isCurrentUserLeader={groupInternalLeaderId === effectiveUserId}
            isCurrentUserCandidate={isCurrentUserCandidate}
            issueId={party.issue_id || null}
            issueName={issueResult.data?.issue_text || null}
            userStateName={userStateName}
        />
    );
}
