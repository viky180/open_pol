import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveUserContext } from '@/lib/effectiveUser';

export const dynamic = 'force-dynamic';

type FeedScope = 'member' | 'location' | 'category' | 'global';

type UnifiedFeedType =
    | 'question'
    | 'action_email'
    | 'action_escalation'
    | 'milestone'
    | 'merge'
    | 'post'
    | 'new_member'
    | 'invitation_accepted'
    | 'trust_milestone'
    | 'new_party';

type UnifiedFeedItem = {
    id: string;
    type: UnifiedFeedType;
    partyId: string;
    partyName: string;
    scope: FeedScope;
    title: string;
    preview: string;
    timestamp: string;
    linkUrl: string;
    meta?: Record<string, unknown>;
};

type QuestionRow = {
    id: string;
    party_id: string;
    question_text: string;
    created_at: string;
    parties: { issue_text: string } | { issue_text: string }[] | null;
    answers: { id: string }[] | null;
};

type EmailRow = {
    id: string;
    party_id: string;
    subject: string;
    recipient_name: string | null;
    sent_at: string | null;
    created_at: string;
    parties: { issue_text: string } | { issue_text: string }[] | null;
};

type EscalationRow = {
    id: string;
    source_party_id: string;
    target_party_id: string;
    created_at: string;
    source: { issue_text: string } | { issue_text: string }[] | null;
    target: { issue_text: string } | { issue_text: string }[] | null;
};

type MilestoneRow = {
    id: string;
    party_id: string;
    milestone_type: string;
    threshold: number;
    member_count_at_event: number;
    created_at: string;
    parties: { issue_text: string } | { issue_text: string }[] | null;
};

type MergeRow = {
    id: string;
    issue_text: string;
    parent_party_id: string | null;
    created_at: string;
    updated_at: string | null;
    parent: { issue_text: string } | { issue_text: string }[] | null;
};

type PostRow = {
    id: string;
    party_id: string;
    content: string;
    created_at: string;
    created_by: string | null;
    parties: { issue_text: string } | { issue_text: string }[] | null;
    profiles: { display_name: string | null } | { display_name: string | null }[] | null;
};

type NewMemberRow = {
    id: string;
    party_id: string;
    user_id: string;
    joined_at: string;
    parties: { issue_text: string } | { issue_text: string }[] | null;
    profiles: { display_name: string | null } | { display_name: string | null }[] | null;
};

type InvitationAcceptedRow = {
    id: string;
    party_id: string;
    inviter_id: string;
    accepted_by: string;
    accepted_at: string;
    parties: { issue_text: string } | { issue_text: string }[] | null;
    accepter: { display_name: string | null } | { display_name: string | null }[] | null;
};

type TrustMilestoneRow = {
    id: string;
    party_id: string;
    user_id: string;
    threshold: number;
    trust_count_at_event: number;
    created_at: string;
    parties: { issue_text: string } | { issue_text: string }[] | null;
    profiles: { display_name: string | null } | { display_name: string | null }[] | null;
};

type NewPartyRow = {
    id: string;
    issue_text: string;
    created_at: string;
    created_by: string | null;
    pincodes: string[];
    location_scope: string | null;
    location_label: string | null;
    state_name: string | null;
    district_name: string | null;
    block_name: string | null;
    panchayat_name: string | null;
    village_name: string | null;
    category_id: string | null;
    profiles: { display_name: string | null } | { display_name: string | null }[] | null;
};

function shortName(issueText: string): string {
    const t = issueText || 'Unknown';
    return t.slice(0, 30) + (t.length > 30 ? '...' : '');
}

export async function GET() {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => cookieStore.get(name)?.value
    );

    // Get current user (supports admin impersonation flows).
    const user = userContext?.realUser ?? null;
    const effectiveUserId = userContext?.effectiveUserId ?? null;

    if (!user || !effectiveUserId) {
        // Unauthenticated: return a public/global feed preview.
        const publicFeedItems: UnifiedFeedItem[] = [];
        const push = (item: UnifiedFeedItem) => publicFeedItems.push(item);

        const takeGlobal = 10;

        async function fetchQuestions(limit: number) {
            const { data } = await supabase
                .from('questions')
                .select('id, party_id, question_text, created_at, parties!inner(issue_text), answers(id)')
                .order('created_at', { ascending: false })
                .limit(limit);
            (data || []).forEach((row: QuestionRow) => {
                const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
                const issueText = party?.issue_text ?? 'Unknown';
                const answersCount = Array.isArray(row.answers) ? row.answers.length : 0;
                push({
                    id: row.id,
                    type: 'question',
                    partyId: row.party_id,
                    partyName: shortName(issueText),
                    scope: 'global',
                    title: row.question_text,
                    preview: answersCount > 0
                        ? `${answersCount} answer${answersCount !== 1 ? 's' : ''}`
                        : 'No answers yet',
                    timestamp: row.created_at,
                    linkUrl: `/party/${row.party_id}#questions`,
                    meta: { answersCount },
                });
            });
        }

        async function fetchEmails(limit: number) {
            const { data } = await supabase
                .from('advocacy_emails')
                .select('id, party_id, subject, recipient_name, sent_at, created_at, parties!inner(issue_text)')
                .eq('status', 'sent')
                .order('sent_at', { ascending: false })
                .limit(limit);
            (data || []).forEach((row: EmailRow) => {
                const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
                const issueText = party?.issue_text ?? 'Unknown';
                push({
                    id: row.id,
                    type: 'action_email',
                    partyId: row.party_id,
                    partyName: shortName(issueText),
                    scope: 'global',
                    title: `Email sent: ${row.subject}`,
                    preview: row.recipient_name ? `Sent to ${row.recipient_name}` : 'Advocacy email sent',
                    timestamp: row.sent_at || row.created_at || new Date().toISOString(),
                    linkUrl: `/party/${row.party_id}`,
                });
            });
        }

        async function fetchEscalations(limit: number) {
            const { data } = await supabase
                .from('escalations')
                .select('id, source_party_id, target_party_id, created_at, source:source_party_id(issue_text), target:target_party_id(issue_text)')
                .order('created_at', { ascending: false })
                .limit(limit);
            (data || []).forEach((row: EscalationRow) => {
                const source = Array.isArray(row.source) ? row.source[0] : row.source;
                const target = Array.isArray(row.target) ? row.target[0] : row.target;
                const sourceIssue = source?.issue_text ?? 'Unknown';
                const targetIssue = target?.issue_text ?? 'Unknown';
                push({
                    id: row.id,
                    type: 'action_escalation',
                    partyId: row.source_party_id,
                    partyName: shortName(sourceIssue),
                    scope: 'global',
                    title: 'Issue escalated',
                    preview: `Escalated to: ${targetIssue.slice(0, 80)}${targetIssue.length > 80 ? '...' : ''}`,
                    timestamp: row.created_at,
                    linkUrl: `/party/${row.source_party_id}`,
                    meta: { targetPartyId: row.target_party_id },
                });
            });
        }

        async function fetchMilestones(limit: number) {
            const { data } = await supabase
                .from('party_milestones')
                .select('id, party_id, milestone_type, threshold, member_count_at_event, created_at, parties!party_milestones_party_id_fkey(issue_text)')
                .order('created_at', { ascending: false })
                .limit(limit);
            (data || []).forEach((row: MilestoneRow) => {
                const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
                const issueText = party?.issue_text ?? 'Unknown';
                const threshold = row.threshold as number;
                push({
                    id: row.id,
                    type: 'milestone',
                    partyId: row.party_id,
                    partyName: shortName(issueText),
                    scope: 'global',
                    title: `Milestone: ${threshold} members`,
                    preview: `"${issueText.slice(0, 90)}${issueText.length > 90 ? '...' : ''}" crossed ${threshold} members.`,
                    timestamp: row.created_at,
                    linkUrl: `/party/${row.party_id}`,
                    meta: { threshold, milestoneType: row.milestone_type },
                });
            });
        }

        async function fetchMerges(limit: number) {
            const { data } = await supabase
                .from('parties')
                .select('id, issue_text, parent_party_id, created_at, updated_at, parent:parent_party_id(issue_text)')
                .not('parent_party_id', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(limit);
            (data || []).forEach((row: MergeRow) => {
                const parent = Array.isArray(row.parent) ? row.parent[0] : row.parent;
                const childText = row.issue_text ?? 'Child party';
                const parentText = parent?.issue_text ?? 'Parent party';
                push({
                    id: row.id,
                    type: 'merge',
                    partyId: row.id,
                    partyName: shortName(childText),
                    scope: 'global',
                    title: `Moved under: ${parentText.slice(0, 60)}${parentText.length > 60 ? '...' : ''}`,
                    preview: `"${childText.slice(0, 80)}${childText.length > 80 ? '...' : ''}" is now in the hierarchy tree.`,
                    timestamp: row.updated_at || row.created_at,
                    linkUrl: `/party/${row.id}`,
                    meta: { parentPartyId: row.parent_party_id },
                });
            });
        }

        async function fetchPosts(limit: number) {
            const { data } = await supabase
                .from('party_posts')
                .select('id, party_id, content, created_at, created_by, parties!party_posts_party_id_fkey(issue_text), profiles!party_posts_created_by_fkey(display_name)')
                .order('created_at', { ascending: false })
                .limit(limit);
            (data || []).forEach((row: PostRow) => {
                const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
                const issueText = party?.issue_text ?? 'Unknown';
                const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
                const authorName = profile?.display_name ?? null;
                push({
                    id: row.id,
                    type: 'post',
                    partyId: row.party_id,
                    partyName: shortName(issueText),
                    scope: 'global',
                    title: authorName ? `Post by ${authorName}` : 'Member post',
                    preview: row.content,
                    timestamp: row.created_at,
                    linkUrl: `/party/${row.party_id}`,
                    meta: { authorName },
                });
            });
        }

        await Promise.all([
            fetchQuestions(takeGlobal),
            fetchEmails(takeGlobal),
            fetchEscalations(takeGlobal),
            fetchMilestones(takeGlobal),
            fetchMerges(takeGlobal),
            fetchPosts(takeGlobal),
        ]);

        publicFeedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return NextResponse.json({
            representation: null,
            feedItems: publicFeedItems.slice(0, 60),
        });
    }

    // Get user's active membership
    const { data: membership } = await supabase
        .from('memberships')
        .select(`
            party_id,
            parties!inner (
                id,
                issue_text,
                created_at
            )
        `)
        .eq('user_id', effectiveUserId)
        .is('left_at', null)
        .maybeSingle();

    let representation = null;

    if (membership?.parties) {
        const party = Array.isArray(membership.parties)
            ? membership.parties[0]
            : membership.parties;

        const partyId = party.id;

        // Get leader for this party
        const { data: leaderVotes } = await supabase
            .from('trust_votes')
            .select('to_user_id, profiles!trust_votes_to_user_id_fkey(display_name)')
            .eq('party_id', partyId)
            .gt('expires_at', new Date().toISOString());

        // Count votes per user
        const voteCounts: Record<string, { count: number; name: string | null }> = {};
        (leaderVotes || []).forEach((vote) => {
            const userId = vote.to_user_id;
            const profile = vote.profiles as { display_name: string | null } | { display_name: string | null }[] | null;
            const name = Array.isArray(profile)
                ? profile[0]?.display_name
                : profile?.display_name ?? null;

            if (!voteCounts[userId]) {
                voteCounts[userId] = { count: 0, name };
            }
            voteCounts[userId].count++;
        });

        const leaderEntry = Object.entries(voteCounts)
            .sort((a, b) => b[1].count - a[1].count)[0];
        const leaderName = leaderEntry?.[1]?.name ?? null;

        // Get user's trust vote expiry
        const { data: userVote } = await supabase
            .from('trust_votes')
            .select('expires_at')
            .eq('party_id', partyId)
            .eq('from_user_id', effectiveUserId)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        let trustExpiresInDays: number | null = null;
        if (userVote?.expires_at) {
            const expiresAt = new Date(userVote.expires_at);
            const now = new Date();
            trustExpiresInDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        representation = {
            partyId,
            partyName: party.issue_text,
            leaderName,
            trustExpiresInDays,
        };
    }

    // Logged-in but not represented yet: skip expensive feed fanout and return onboarding state.
    if (!membership?.parties) {
        return NextResponse.json({
            representation: null,
            feedItems: [],
        });
    }

    // ============================================
    // Scope priority: member -> location -> category -> global
    // ============================================
    const userPartyId = membership?.party_id ?? null;

    const [{ data: profile }, { data: userParty }] = await Promise.all([
        supabase.from('profiles').select('pincode').eq('id', effectiveUserId).maybeSingle(),
        userPartyId
            ? supabase.from('parties').select('id, pincodes, lat, lng, category_id, issue_text, location_scope, location_label, state_name, district_name, block_name, panchayat_name, village_name').eq('id', userPartyId).maybeSingle()
            : Promise.resolve({ data: null } as { data: { id: string; pincodes: string[]; lat: number | null; lng: number | null; category_id: string | null; issue_text: string; location_scope: string | null; location_label: string | null; state_name: string | null; district_name: string | null; block_name: string | null; panchayat_name: string | null; village_name: string | null } | null }),
    ]);

    const userPincode = profile?.pincode ?? null;
    const userPartyPincodes: string[] = (userParty?.pincodes ?? []) as string[];
    const userPartyLat = typeof userParty?.lat === 'number' ? userParty.lat : null;
    const userPartyLng = typeof userParty?.lng === 'number' ? userParty.lng : null;
    const userPartyScope = (userParty?.location_scope ?? null) as string | null;
    const userPartyState = (userParty?.state_name ?? null) as string | null;
    const userPartyDistrict = (userParty?.district_name ?? null) as string | null;
    const userPartyBlock = (userParty?.block_name ?? null) as string | null;
    const userPartyPanchayat = (userParty?.panchayat_name ?? null) as string | null;
    const userPartyVillage = (userParty?.village_name ?? null) as string | null;
    const userCategoryId: string | null = (userParty?.category_id ?? null) as string | null;

    const memberPartyIds = userPartyId ? [userPartyId] : [];
    const locationPartyIds: string[] = [];
    const categoryPartyIds: string[] = [];

    // Parties by geo first (if user's current party has coordinates), then fallback to scope-location, then pincode.
    if (userPartyLat !== null && userPartyLng !== null) {
        const radiusKm = 25;
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.max(Math.cos(userPartyLat * Math.PI / 180), 0.1));
        const { data: partiesByGeo } = await supabase
            .from('parties')
            .select('id')
            .not('lat', 'is', null)
            .not('lng', 'is', null)
            .gte('lat', userPartyLat - latDelta)
            .lte('lat', userPartyLat + latDelta)
            .gte('lng', userPartyLng - lngDelta)
            .lte('lng', userPartyLng + lngDelta)
            .limit(200);
        (partiesByGeo || []).forEach(p => locationPartyIds.push(p.id));
    } else {
        let partiesByScope: Array<{ id: string }> = [];

        if (userPartyScope) {
            let scopeQuery = supabase
                .from('parties')
                .select('id')
                .eq('location_scope', userPartyScope)
                .limit(200);

            if (userPartyScope === 'state' && userPartyState) {
                scopeQuery = scopeQuery.eq('state_name', userPartyState);
            }
            if (userPartyScope === 'district' && userPartyState && userPartyDistrict) {
                scopeQuery = scopeQuery
                    .eq('state_name', userPartyState)
                    .eq('district_name', userPartyDistrict);
            }
            if (userPartyScope === 'block' && userPartyState && userPartyBlock) {
                scopeQuery = scopeQuery
                    .eq('state_name', userPartyState)
                    .eq('block_name', userPartyBlock);
            }
            if (userPartyScope === 'panchayat' && userPartyPanchayat) {
                scopeQuery = scopeQuery.eq('panchayat_name', userPartyPanchayat);
            }
            if (userPartyScope === 'village' && userPartyVillage) {
                scopeQuery = scopeQuery.eq('village_name', userPartyVillage);
            }

            const { data } = await scopeQuery;
            partiesByScope = data || [];
            partiesByScope.forEach((p) => locationPartyIds.push(p.id));
        }

        if (partiesByScope.length === 0) {
            const pincodesForFallback = (userPartyPincodes.length > 0 ? userPartyPincodes : (userPincode ? [userPincode] : []));
            if (pincodesForFallback.length > 0) {
                const { data: partiesByPin } = await supabase
                    .from('parties')
                    .select('id')
                    .overlaps('pincodes', pincodesForFallback)
                    .limit(200);
                (partiesByPin || []).forEach(p => locationPartyIds.push(p.id));
            }
        }
    }

    // Parties by category
    if (userCategoryId) {
        const { data: partiesByCat } = await supabase
            .from('parties')
            .select('id')
            .eq('category_id', userCategoryId)
            .limit(200);
        (partiesByCat || []).forEach(p => categoryPartyIds.push(p.id));
    }

    const memberSet = new Set(memberPartyIds);
    const locationSet = new Set(locationPartyIds);
    // categorySet currently unused, but kept for future extensions.
    // const categorySet = new Set(categoryPartyIds);

    const dedupe = (arr: string[]) => Array.from(new Set(arr));
    const memberIds = dedupe(memberPartyIds);
    const locationIds = dedupe(locationPartyIds.filter(id => !memberSet.has(id)));
    const categoryIds = dedupe(categoryPartyIds.filter(id => !memberSet.has(id) && !locationSet.has(id)));

    // We'll query each content type per-scope and then merge + rank.
    const takeMember = 20;
    const takeLocation = 15;
    const takeCategory = 10;
    const takeGlobal = 10;

    const feedItems: UnifiedFeedItem[] = [];

    const push = (item: UnifiedFeedItem) => feedItems.push(item);

    async function fetchQuestions(partyIds: string[] | null, scope: FeedScope, limit: number) {
        let q = supabase
            .from('questions')
            .select('id, party_id, question_text, created_at, parties!inner(issue_text), answers(id)')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (partyIds && partyIds.length > 0) q = q.in('party_id', partyIds);
        if (partyIds && partyIds.length === 0) return;

        const { data } = await q;
        (data || []).forEach((row: QuestionRow) => {
            const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
            const issueText = party?.issue_text ?? 'Unknown';
            const answersCount = Array.isArray(row.answers) ? row.answers.length : 0;
            push({
                id: row.id,
                type: 'question',
                partyId: row.party_id,
                partyName: shortName(issueText),
                scope,
                title: row.question_text,
                preview: answersCount > 0
                    ? `${answersCount} answer${answersCount !== 1 ? 's' : ''}`
                    : 'No answers yet',
                timestamp: row.created_at,
                linkUrl: `/party/${row.party_id}#questions`,
                meta: { answersCount },
            });
        });
    }

    async function fetchEmails(partyIds: string[] | null, scope: FeedScope, limit: number) {
        let q = supabase
            .from('advocacy_emails')
            .select('id, party_id, subject, recipient_name, sent_at, created_at, parties!inner(issue_text)')
            .eq('status', 'sent')
            .order('sent_at', { ascending: false })
            .limit(limit);
        if (partyIds && partyIds.length > 0) q = q.in('party_id', partyIds);
        if (partyIds && partyIds.length === 0) return;

        const { data } = await q;
        (data || []).forEach((row: EmailRow) => {
            const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
            const issueText = party?.issue_text ?? 'Unknown';
            push({
                id: row.id,
                type: 'action_email',
                partyId: row.party_id,
                partyName: shortName(issueText),
                scope,
                title: `Email sent: ${row.subject}`,
                preview: row.recipient_name ? `Sent to ${row.recipient_name}` : 'Advocacy email sent',
                timestamp: row.sent_at || row.created_at || new Date().toISOString(),
                linkUrl: `/party/${row.party_id}`,
            });
        });
    }

    async function fetchEscalations(partyIds: string[] | null, scope: FeedScope, limit: number) {
        let q = supabase
            .from('escalations')
            .select('id, source_party_id, target_party_id, created_at, source:source_party_id(issue_text), target:target_party_id(issue_text)')
            .order('created_at', { ascending: false })
            .limit(limit);
        // Filter by source party (simpler + avoids UUID quoting issues in or() strings).
        if (partyIds && partyIds.length > 0) q = q.in('source_party_id', partyIds);
        if (partyIds && partyIds.length === 0) return;

        const { data } = await q;
        (data || []).forEach((row: EscalationRow) => {
            const source = Array.isArray(row.source) ? row.source[0] : row.source;
            const target = Array.isArray(row.target) ? row.target[0] : row.target;
            const sourceIssue = source?.issue_text ?? 'Unknown';
            const targetIssue = target?.issue_text ?? 'Unknown';
            push({
                id: row.id,
                type: 'action_escalation',
                partyId: row.source_party_id,
                partyName: shortName(sourceIssue),
                scope,
                title: 'Issue escalated',
                preview: `Escalated to: ${targetIssue.slice(0, 80)}${targetIssue.length > 80 ? '...' : ''}`,
                timestamp: row.created_at,
                linkUrl: `/party/${row.source_party_id}`,
                meta: { targetPartyId: row.target_party_id },
            });
        });
    }

    async function fetchMilestones(partyIds: string[] | null, scope: FeedScope, limit: number) {
        let q = supabase
            .from('party_milestones')
            .select('id, party_id, milestone_type, threshold, member_count_at_event, created_at, parties!party_milestones_party_id_fkey(issue_text)')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (partyIds && partyIds.length > 0) q = q.in('party_id', partyIds);
        if (partyIds && partyIds.length === 0) return;

        const { data } = await q;
        (data || []).forEach((row: MilestoneRow) => {
            const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
            const issueText = party?.issue_text ?? 'Unknown';
            const threshold = row.threshold as number;
            push({
                id: row.id,
                type: 'milestone',
                partyId: row.party_id,
                partyName: shortName(issueText),
                scope,
                title: `Milestone: ${threshold} members`,
                preview: `"${issueText.slice(0, 90)}${issueText.length > 90 ? '...' : ''}" crossed ${threshold} members.`,
                timestamp: row.created_at,
                linkUrl: `/party/${row.party_id}`,
                meta: { threshold, milestoneType: row.milestone_type },
            });
        });
    }

    async function fetchMerges(partyIds: string[] | null, scope: FeedScope, limit: number) {
        let q = supabase
            .from('parties')
            .select('id, issue_text, parent_party_id, created_at, updated_at, parent:parent_party_id(issue_text)')
            .not('parent_party_id', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(limit);
        // Filter by child party.
        if (partyIds && partyIds.length > 0) q = q.in('id', partyIds);
        if (partyIds && partyIds.length === 0) return;

        const { data } = await q;
        (data || []).forEach((row: MergeRow) => {
            const parent = Array.isArray(row.parent) ? row.parent[0] : row.parent;
            const childText = row.issue_text ?? 'Child party';
            const parentText = parent?.issue_text ?? 'Parent party';
            push({
                id: row.id,
                type: 'merge',
                partyId: row.id,
                partyName: shortName(childText),
                scope,
                title: `Moved under: ${parentText.slice(0, 60)}${parentText.length > 60 ? '...' : ''}`,
                preview: `"${childText.slice(0, 80)}${childText.length > 80 ? '...' : ''}" is now in the hierarchy tree.`,
                timestamp: row.updated_at || row.created_at,
                linkUrl: `/party/${row.id}`,
                meta: { parentPartyId: row.parent_party_id },
            });
        });
    }

    async function fetchPosts(partyIds: string[] | null, scope: FeedScope, limit: number) {
        let q = supabase
            .from('party_posts')
            .select('id, party_id, content, created_at, created_by, parties!party_posts_party_id_fkey(issue_text), profiles!party_posts_created_by_fkey(display_name)')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (partyIds && partyIds.length > 0) q = q.in('party_id', partyIds);
        if (partyIds && partyIds.length === 0) return;

        const { data } = await q;
        (data || []).forEach((row: PostRow) => {
            const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
            const issueText = party?.issue_text ?? 'Unknown';
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            const authorName = profile?.display_name ?? null;
            push({
                id: row.id,
                type: 'post',
                partyId: row.party_id,
                partyName: shortName(issueText),
                scope,
                title: authorName ? `Post by ${authorName}` : 'Member post',
                preview: row.content,
                timestamp: row.created_at,
                linkUrl: `/party/${row.party_id}`,
                meta: { authorName },
            });
        });
    }

    // Fetch new members who joined in the last 7 days
    async function fetchNewMembers(partyIds: string[] | null, scope: FeedScope, limit: number) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let q = supabase
            .from('memberships')
            .select('id, party_id, user_id, joined_at, parties!inner(issue_text), profiles!memberships_user_id_fkey(display_name)')
            .is('left_at', null)
            .gt('joined_at', sevenDaysAgo)
            .order('joined_at', { ascending: false })
            .limit(limit);
        if (partyIds && partyIds.length > 0) q = q.in('party_id', partyIds);
        if (partyIds && partyIds.length === 0) return;

        const { data } = await q;
        (data || []).forEach((row: NewMemberRow) => {
            const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
            const issueText = party?.issue_text ?? 'Unknown';
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            const memberName = profile?.display_name ?? 'A new member';
            push({
                id: `new_member_${row.id}`,
                type: 'new_member',
                partyId: row.party_id,
                partyName: shortName(issueText),
                scope,
                title: `${memberName} joined`,
                preview: `Welcome to "${issueText.slice(0, 80)}${issueText.length > 80 ? '...' : ''}"`,
                timestamp: row.joined_at,
                linkUrl: `/party/${row.party_id}`,
                meta: { memberName, userId: row.user_id },
            });
        });
    }

    // Fetch invitations accepted by people the current user invited
    async function fetchInvitationAccepted(limit: number) {
        if (!user) return;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
            .from('invitations')
            .select(`
                id, party_id, inviter_id, accepted_by, accepted_at,
                parties!inner(issue_text),
                accepter:profiles!invitations_accepted_by_fkey(display_name)
            `)
            .eq('inviter_id', effectiveUserId)
            .not('accepted_at', 'is', null)
            .gt('accepted_at', sevenDaysAgo)
            .order('accepted_at', { ascending: false })
            .limit(limit);

        (data || []).forEach((row: InvitationAcceptedRow) => {
            const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
            const issueText = party?.issue_text ?? 'Unknown';
            const accepter = Array.isArray(row.accepter) ? row.accepter[0] : row.accepter;
            const accepterName = accepter?.display_name ?? 'Someone';
            push({
                id: `invite_accepted_${row.id}`,
                type: 'invitation_accepted',
                partyId: row.party_id,
                partyName: shortName(issueText),
                scope: 'member',
                title: `${accepterName} joined via your invite`,
                preview: `Your invitation was accepted. Welcome them to the group!`,
                timestamp: row.accepted_at,
                linkUrl: `/party/${row.party_id}`,
                meta: { acceptedBy: row.accepted_by, accepterName },
            });
        });
    }

    // Fetch trust milestones
    async function fetchTrustMilestones(partyIds: string[] | null, scope: FeedScope, limit: number) {
        let q = supabase
            .from('trust_milestones')
            .select('id, party_id, user_id, threshold, trust_count_at_event, created_at, parties!inner(issue_text), profiles!trust_milestones_user_id_fkey(display_name)')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (partyIds && partyIds.length > 0) q = q.in('party_id', partyIds);
        if (partyIds && partyIds.length === 0) return;

        const { data } = await q;
        (data || []).forEach((row: TrustMilestoneRow) => {
            const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
            const issueText = party?.issue_text ?? 'Unknown';
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            const leaderName = profile?.display_name ?? 'A leader';
            push({
                id: row.id,
                type: 'trust_milestone',
                partyId: row.party_id,
                partyName: shortName(issueText),
                scope,
                title: `${leaderName} reached ${row.threshold} trust votes`,
                preview: `A growing sign of trust in "${issueText.slice(0, 60)}${issueText.length > 60 ? '...' : ''}"`,
                timestamp: row.created_at,
                linkUrl: `/party/${row.party_id}`,
                meta: { threshold: row.threshold, leaderName, userId: row.user_id },
            });
        });
    }

    // Fetch new parties created in the last 7 days
    async function fetchNewParties(partyIds: string[] | null, scope: FeedScope, limit: number) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let q = supabase
            .from('parties')
            .select('id, issue_text, created_at, created_by, pincodes, location_scope, location_label, state_name, district_name, block_name, panchayat_name, village_name, category_id, profiles!parties_created_by_fkey(display_name)')
            .gt('created_at', sevenDaysAgo)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (partyIds && partyIds.length > 0) q = q.in('id', partyIds);
        if (partyIds && partyIds.length === 0) return;

        const { data } = await q;
        (data || []).forEach((row: NewPartyRow) => {
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            const creatorName = profile?.display_name ?? null;
            push({
                id: `new_party_${row.id}`,
                type: 'new_party',
                partyId: row.id,
                partyName: shortName(row.issue_text),
                scope,
                title: 'New group created',
                preview: `"${row.issue_text.slice(0, 100)}${row.issue_text.length > 100 ? '...' : ''}"`,
                timestamp: row.created_at,
                linkUrl: `/party/${row.id}`,
                meta: {
                    creatorName,
                    locationScope: row.location_scope,
                    locationLabel: row.location_label,
                    stateName: row.state_name,
                    districtName: row.district_name,
                    blockName: row.block_name,
                    panchayatName: row.panchayat_name,
                    villageName: row.village_name,
                    pincodes: row.pincodes,
                },
            });
        });
    }

    const scopeRank: Record<FeedScope, number> = {
        member: 0,
        location: 1,
        category: 2,
        global: 3,
    };

    const sortAndDedupe = () => {
        const sorted = [...feedItems].sort((a, b) => {
            const sr = scopeRank[a.scope] - scopeRank[b.scope];
            if (sr !== 0) return sr;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        const seen = new Set<string>();
        return sorted.filter((item) => {
            const key = `${item.type}:${item.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    await Promise.all([
        fetchQuestions(memberIds, 'member', takeMember),
        fetchEmails(memberIds, 'member', takeMember),
        fetchEscalations(memberIds, 'member', takeMember),
        fetchMilestones(memberIds, 'member', takeMember),
        fetchMerges(memberIds, 'member', takeMember),
        fetchPosts(memberIds, 'member', takeMember),
        fetchNewMembers(memberIds, 'member', takeMember),
        fetchTrustMilestones(memberIds, 'member', takeMember),

        fetchQuestions(locationIds, 'location', takeLocation),
        fetchEmails(locationIds, 'location', takeLocation),
        fetchEscalations(locationIds, 'location', takeLocation),
        fetchMilestones(locationIds, 'location', takeLocation),
        fetchMerges(locationIds, 'location', takeLocation),
        fetchPosts(locationIds, 'location', takeLocation),
        fetchNewMembers(locationIds, 'location', takeLocation),
        fetchNewParties(locationIds, 'location', takeLocation),

        fetchQuestions(categoryIds, 'category', takeCategory),
        fetchEmails(categoryIds, 'category', takeCategory),
        fetchEscalations(categoryIds, 'category', takeCategory),
        fetchMilestones(categoryIds, 'category', takeCategory),
        fetchMerges(categoryIds, 'category', takeCategory),
        fetchPosts(categoryIds, 'category', takeCategory),
        fetchNewParties(categoryIds, 'category', takeCategory),

        // User-specific: invitations accepted
        fetchInvitationAccepted(takeMember),
    ]);

    let dedupedItems = sortAndDedupe();

    // Only fetch global feed if local scopes did not fill the payload.
    if (dedupedItems.length < 60) {
        const globalLimit = Math.min(40, Math.max(takeGlobal, 60 - dedupedItems.length));
        await Promise.all([
            fetchQuestions(null, 'global', globalLimit),
            fetchEmails(null, 'global', globalLimit),
            fetchEscalations(null, 'global', globalLimit),
            fetchMilestones(null, 'global', globalLimit),
            fetchMerges(null, 'global', globalLimit),
            fetchPosts(null, 'global', globalLimit),
            fetchTrustMilestones(null, 'global', globalLimit),
            fetchNewParties(null, 'global', globalLimit),
        ]);
        dedupedItems = sortAndDedupe();
    }

    // Final limit for payload size
    const finalItems = dedupedItems.slice(0, 60);

    return NextResponse.json({
        representation,
        feedItems: finalItems,
    });
}
