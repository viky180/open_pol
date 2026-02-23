import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PartyDetailClient } from './PartyDetailClient';
import { isAdminUserId } from '@/lib/admin';
import { cookies } from 'next/headers';
import { ADMIN_IMPERSONATION_COOKIE } from '@/lib/effectiveUser';
import type {
    MemberWithVotes,
    QuestionWithAnswers,
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
};

export default async function PartyPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch party first (required for other queries)
    const { data: party, error } = await supabase
        .from('parties')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !party) {
        notFound();
    }

    // Get current user (needed for user-specific queries)
    const { data: { user } } = await supabase.auth.getUser();
    const isAdmin = isAdminUserId(user?.id);
    const cookieStore = await cookies();
    const impersonatedUserId = isAdmin ? (cookieStore.get(ADMIN_IMPERSONATION_COOKIE)?.value || null) : null;
    const effectiveUserId = impersonatedUserId || user?.id || null;

    // ============================================
    // PARALLEL QUERY GROUP 1: Independent queries
    // ============================================
    const [
        memberCountResult,
        membershipsResult,
        trustVotesResult,
        questionsResult,
    ] = await Promise.all([
        // Fetch aggregated member count (including sub-groups)
        supabase.rpc('get_recursive_member_count', { p_party_id: id }),

        // Fetch members with trust votes
        supabase
            .from('memberships')
            .select(`
                user_id,
                joined_at,
                profiles:user_id (display_name)
            `)
            .eq('party_id', id)
            .is('left_at', null),

        // Get trust votes for all members
        supabase
            .from('trust_votes')
            .select('to_user_id')
            .eq('party_id', id)
            .gt('expires_at', new Date().toISOString()),

        // Fetch questions with answers
        supabase
            .from('questions')
            .select(`
                *,
                profiles:asked_by (display_name),
                answers (
                    *,
                    profiles:answered_by (display_name)
                )
            `)
            .eq('party_id', id)
            .order('created_at', { ascending: false }),
    ]);

    // ============================================
    // PARALLEL QUERY GROUP 2: User-specific queries (only if user is logged in)
    // ============================================
    const [userMembershipResult, activeMembershipResult, userVoteResult] = effectiveUserId
        ? await Promise.all([
            supabase
                .from('memberships')
                .select('id, joined_at')
                .eq('party_id', id)
                .eq('user_id', effectiveUserId)
                .is('left_at', null)
                .maybeSingle(),
            supabase
                .from('memberships')
                .select('party_id')
                .eq('user_id', effectiveUserId)
                .is('left_at', null)
                .maybeSingle(),
            supabase
                .from('trust_votes')
                .select('to_user_id, expires_at')
                .eq('party_id', id)
                .eq('from_user_id', effectiveUserId)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle()
        ])
        : [{ data: null }, { data: null }, { data: null }];

    // Extract data from results
    const memberCount = memberCountResult.data as number;
    const memberships = membershipsResult.data;
    const trustVotes = trustVotesResult.data;
    const questions = questionsResult.data;

    const userMembership = userMembershipResult.data;
    const activeMembership = activeMembershipResult.data;
    const userVote = userVoteResult.data;

    // Calculate vote counts per member
    const voteCounts: Record<string, number> = {};
    trustVotes?.forEach(vote => {
        voteCounts[vote.to_user_id] = (voteCounts[vote.to_user_id] || 0) + 1;
    });

    // Find leader (most votes)
    let leaderId: string | null = null;
    let maxVotes = 0;
    Object.entries(voteCounts).forEach(([userId, count]) => {
        if (count > maxVotes) {
            maxVotes = count;
            leaderId = userId;
        }
    });

    const members: MemberWithVotes[] = (memberships || []).map(m => ({
        user_id: m.user_id as string,
        display_name: ((m.profiles as unknown) as { display_name: string | null } | null)?.display_name || null,
        joined_at: m.joined_at as string,
        trust_votes: voteCounts[m.user_id as string] || 0,
        is_leader: m.user_id === leaderId
    }));

    // Inject sub-group leaders as votable candidates in this (parent) group.
    // They are not direct members but can be elected to lead this parent group.
    const directMemberUserIds = new Set(members.map(m => m.user_id));

    const questionsWithAnswers: QuestionWithAnswers[] = (questions || []).map(q => {
        const answers = (q.answers || []).map((a: { id: string; question_id: string; answered_by: string | null; answer_text: string; created_at: string; profiles: { display_name: string | null } | null }) => ({
            ...a,
            answerer_name: a.profiles?.display_name || null
        }));

        // Calculate response time
        let responseTimeHours: number | null = null;
        if (answers.length > 0) {
            const firstAnswer = answers.sort((a: { created_at: string }, b: { created_at: string }) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )[0];
            const questionTime = new Date(q.created_at).getTime();
            const answerTime = new Date(firstAnswer.created_at).getTime();
            responseTimeHours = (answerTime - questionTime) / (1000 * 60 * 60);
        }

        return {
            ...q,
            asker_name: (q.profiles as { display_name: string | null })?.display_name || null,
            answers,
            response_time_hours: responseTimeHours
        };
    });

    // Calculate Q&A metrics
    const qaMetrics: QAMetrics = {
        total_questions: questionsWithAnswers.length,
        unanswered_questions: questionsWithAnswers.filter(q => q.answers.length === 0).length,
        avg_response_time_hours: (() => {
            const answered = questionsWithAnswers.filter(q => q.response_time_hours !== null);
            if (answered.length === 0) return null;
            const total = answered.reduce((sum, q) => sum + (q.response_time_hours || 0), 0);
            return total / answered.length;
        })()
    };

    // Fetch parent metadata directly (instead of loading all parties)
    let currentParentParty: Party | null = null;

    if (party.parent_party_id) {
        const parentPartyResult = await supabase.from('parties').select('*').eq('id', party.parent_party_id).maybeSingle();
        currentParentParty = parentPartyResult.data || null;
    }

    // Sub-group leaders supporting this parent (shown in Leadership tab)
    const { data: attachedSubgroupsData } = await supabase
        .from('parties')
        .select('id, issue_text, icon_svg, icon_image_url, parent_party_id, location_scope, state_name, district_name, block_name, panchayat_name, village_name')
        .eq('parent_party_id', id);
    const attachedSubgroups = (attachedSubgroupsData || []) as Array<Pick<Party, 'id' | 'issue_text' | 'icon_svg' | 'icon_image_url' | 'parent_party_id' | 'location_scope' | 'state_name' | 'district_name' | 'block_name' | 'panchayat_name' | 'village_name'>>;
    const attachedSubgroupIds = attachedSubgroups.map((p) => p.id);

    // Fetch member counts for each sub-group (used for fork winner badge)
    const childGroupCounts = attachedSubgroups.length > 0
        ? await Promise.all(
            attachedSubgroups.map(s => supabase.rpc('get_recursive_member_count', { p_party_id: s.id }))
        )
        : [];
    const childGroupsWithCounts = attachedSubgroups.map((s, i) => ({
        id: s.id,
        issue_text: s.issue_text,
        icon_svg: s.icon_svg || null,
        icon_image_url: s.icon_image_url || null,
        memberCount: (childGroupCounts[i]?.data as number) || 0,
        location_scope: s.location_scope || null,
        state_name: s.state_name || null,
        district_name: s.district_name || null,
        block_name: s.block_name || null,
        panchayat_name: s.panchayat_name || null,
        village_name: s.village_name || null,
    }));

    // Fetch active self-nominations for this parent group
    const { data: activeNominations } = await supabase
        .from('leader_nominations')
        .select('user_id, from_party_id')
        .eq('to_party_id', id)
        .is('withdrawn_at', null);
    const nominatedUserIds = new Set((activeNominations || []).map(n => n.user_id as string));

    let subgroupLeaderSupports: Array<{
        partyId: string;
        partyIssueText: string;
        leaderUserId: string;
        leaderName: string | null;
        trustVotes: number;
    }> = [];

    if (attachedSubgroupIds.length > 0) {
        const [subgroupMembershipsResult, subgroupTrustVotesResult] = await Promise.all([
            supabase
                .from('memberships')
                .select(`
                    party_id,
                    user_id,
                    profiles:user_id (display_name)
                `)
                .in('party_id', attachedSubgroupIds)
                .is('left_at', null),
            supabase
                .from('trust_votes')
                .select('party_id, to_user_id')
                .in('party_id', attachedSubgroupIds)
                .gt('expires_at', new Date().toISOString()),
        ]);

        const subgroupMemberships = subgroupMembershipsResult.data || [];
        const subgroupTrustVotes = subgroupTrustVotesResult.data || [];

        const voteCountsByPartyUser = new Map<string, Map<string, number>>();
        subgroupTrustVotes.forEach((vote) => {
            const partyId = vote.party_id as string;
            const userId = vote.to_user_id as string;
            const partyMap = voteCountsByPartyUser.get(partyId) || new Map<string, number>();
            partyMap.set(userId, (partyMap.get(userId) || 0) + 1);
            voteCountsByPartyUser.set(partyId, partyMap);
        });

        const membersByParty = new Map<string, Array<{ user_id: string; display_name: string | null }>>();
        subgroupMemberships.forEach((m) => {
            const partyId = m.party_id as string;
            const bucket = membersByParty.get(partyId) || [];
            bucket.push({
                user_id: m.user_id as string,
                display_name: ((m.profiles as unknown) as { display_name: string | null } | null)?.display_name || null,
            });
            membersByParty.set(partyId, bucket);
        });

        subgroupLeaderSupports = attachedSubgroups.flatMap((subgroup) => {
            const votesForParty = voteCountsByPartyUser.get(subgroup.id) || new Map<string, number>();
            let leaderUserId: string | null = null;
            let trustVotes = 0;

            votesForParty.forEach((count, userId) => {
                if (count > trustVotes) {
                    trustVotes = count;
                    leaderUserId = userId;
                }
            });

            if (!leaderUserId) {
                return [];
            }

            const leaderName = (membersByParty.get(subgroup.id) || []).find((m) => m.user_id === leaderUserId)?.display_name || null;

            return [{
                partyId: subgroup.id,
                partyIssueText: subgroup.issue_text,
                leaderUserId,
                leaderName,
                trustVotes,
            }];
        });
    }

    // Only inject SELF-NOMINATED sub-group leaders into the parent group's member list
    for (const support of subgroupLeaderSupports) {
        if (!directMemberUserIds.has(support.leaderUserId) && nominatedUserIds.has(support.leaderUserId)) {
            members.push({
                user_id: support.leaderUserId,
                display_name: support.leaderName,
                joined_at: new Date().toISOString(),
                trust_votes: voteCounts[support.leaderUserId] || 0,
                is_leader: support.leaderUserId === leaderId,
                is_subgroup_leader: true,
                is_self_nominated: true,
                subgroup_name: support.partyIssueText,
            });
        }
    }

    // Determine if this group is the governing coalition at its scope
    let isGoverning = false;
    const scope = party.location_scope || 'district';
    const locationField = scope === 'state' ? 'state_name'
        : scope === 'district' ? 'district_name'
            : scope === 'block' ? 'block_name'
                : scope === 'panchayat' ? 'panchayat_name'
                    : scope === 'village' ? 'village_name'
                        : null;
    const locationValue = locationField ? (party as Record<string, unknown>)[locationField] as string | null : null;

    if (locationField && locationValue && !party.parent_party_id) {
        // Find sibling groups at same scope + same area (only top-level groups, no children)
        const siblingQuery = supabase
            .from('parties')
            .select('id')
            .eq('location_scope', scope)
            .eq(locationField, locationValue)
            .is('parent_party_id', null)
            .neq('id', id);
        const { data: siblings } = await siblingQuery;

        const myCount = memberCount || 0;
        let isLargest = myCount > 0;

        if (siblings && siblings.length > 0) {
            const siblingCounts = await Promise.all(
                siblings.map(s => supabase.rpc('get_recursive_member_count', { p_party_id: s.id }))
            );
            for (const result of siblingCounts) {
                if ((result.data as number) >= myCount) {
                    isLargest = false;
                    break;
                }
            }
        }
        isGoverning = isLargest;
    }

    let competingGroups: Array<{ id: string; issue_text: string; icon_svg?: string | null; icon_image_url?: string | null; memberCount: number }> = [];
    if (party.category_id) {
        let competitorQuery = supabase
            .from('parties')
            .select('id, issue_text, icon_svg, icon_image_url')
            .eq('category_id', party.category_id)
            .eq('location_scope', scope)
            .neq('id', id);

        // Match location details based on scope
        if (scope === 'national') {
            // All national groups in same category compete
        } else if (scope === 'state' && party.state_name) {
            competitorQuery = competitorQuery.eq('state_name', party.state_name);
        } else if (scope === 'district' && party.state_name && party.district_name) {
            competitorQuery = competitorQuery
                .eq('state_name', party.state_name)
                .eq('district_name', party.district_name);
        } else if (scope === 'block' && party.state_name && party.block_name) {
            competitorQuery = competitorQuery
                .eq('state_name', party.state_name)
                .eq('block_name', party.block_name);
        } else if (scope === 'panchayat' && party.panchayat_name) {
            competitorQuery = competitorQuery.eq('panchayat_name', party.panchayat_name);
        } else if (scope === 'village' && party.village_name) {
            competitorQuery = competitorQuery.eq('village_name', party.village_name);
        }

        const { data: competitors } = await competitorQuery;
        if (competitors && competitors.length > 0) {
            const competitorCounts = await Promise.all(
                competitors.map(c => supabase.rpc('get_recursive_member_count', { p_party_id: c.id }))
            );
            competingGroups = competitors.map((c, i) => ({
                id: c.id,
                issue_text: c.issue_text,
                icon_svg: c.icon_svg || null,
                icon_image_url: c.icon_image_url || null,
                memberCount: (competitorCounts[i]?.data as number) || 0,
            }));
        }
    }

    // Current user nomination status
    let currentUserIsSubgroupLeader = false;
    let currentUserNomination: { nominated: boolean; fromPartyId: string | null } = { nominated: false, fromPartyId: null };

    if (effectiveUserId && attachedSubgroupIds.length > 0) {
        // Check if current user is a leader of any sub-group
        for (const support of subgroupLeaderSupports) {
            if (support.leaderUserId === effectiveUserId) {
                currentUserIsSubgroupLeader = true;
                // Check if they have an active nomination
                const nomination = (activeNominations || []).find(
                    n => (n.user_id as string) === effectiveUserId
                );
                currentUserNomination = {
                    nominated: !!nomination,
                    fromPartyId: nomination ? (nomination.from_party_id as string) : support.partyId,
                };
                break;
            }
        }
    }

    // Fetch active alliance membership for this party
    const { data: allianceMembership } = await supabase
        .from('alliance_members')
        .select(`
            alliance_id,
            alliances (
                id,
                name
            )
        `)
        .eq('party_id', id)
        .is('left_at', null)
        .maybeSingle();

    const allianceRelation = allianceMembership?.alliances as AllianceSummary | AllianceSummary[] | null | undefined;
    const allianceDetails = Array.isArray(allianceRelation) ? allianceRelation[0] : allianceRelation;

    const currentAlliance = allianceDetails
        ? {
            id: allianceDetails.id,
            name: allianceDetails.name,
        }
        : null;

    return (
        <PartyDetailClient
            party={party}
            memberCount={memberCount || 0}
            members={members}
            questions={questionsWithAnswers}
            qaMetrics={qaMetrics}
            currentUserId={effectiveUserId}
            isMember={!!userMembership}
            activeMembershipPartyId={activeMembership?.party_id || null}
            memberSince={userMembership?.joined_at || null}
            votedFor={userVote?.to_user_id || null}
            voteExpiresAt={userVote?.expires_at || null}
            currentParentParty={currentParentParty}
            childGroups={childGroupsWithCounts}
            isGoverning={isGoverning}
            competingGroups={competingGroups}
            currentUserIsSubgroupLeader={currentUserIsSubgroupLeader}
            currentUserNomination={currentUserNomination}
            currentAlliance={currentAlliance}
            canEditPartyIcon={isAdmin}
        />
    );
}
