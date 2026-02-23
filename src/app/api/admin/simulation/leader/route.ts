import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminUserId } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/admin/simulation/leader
// Body: { partyId: string, leaderUserId: string }
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminUserId(user.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: { partyId?: string; leaderUserId?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const partyId = (body.partyId || '').trim();
    const leaderUserId = (body.leaderUserId || '').trim();
    if (!partyId || !leaderUserId) {
        return NextResponse.json({ error: 'partyId and leaderUserId are required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: directMembers, error: memberError } = await adminClient
        .from('memberships')
        .select('user_id')
        .eq('party_id', partyId)
        .is('left_at', null);

    if (memberError) {
        return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    const directMemberIds = (directMembers || []).map((m) => m.user_id);

    // Parent-group compatibility: candidate can be a direct member OR
    // current leader of a direct child subgroup.
    const { data: childGroups, error: childGroupsError } = await adminClient
        .from('parties')
        .select('id')
        .eq('parent_party_id', partyId);

    if (childGroupsError) {
        return NextResponse.json({ error: childGroupsError.message }, { status: 500 });
    }

    const childGroupIds = (childGroups || []).map((p) => p.id);
    const childGroupLeaderIds = new Set<string>();

    for (const childId of childGroupIds) {
        const { data: childLeaderId, error: childLeaderError } = await adminClient.rpc('get_party_leader', {
            p_party_id: childId,
        });
        if (childLeaderError) {
            return NextResponse.json({ error: childLeaderError.message }, { status: 500 });
        }
        if (childLeaderId) {
            childGroupLeaderIds.add(childLeaderId as string);
        }
    }

    const isEligibleLeader = directMemberIds.includes(leaderUserId) || childGroupLeaderIds.has(leaderUserId);
    if (!isEligibleLeader) {
        return NextResponse.json(
            { error: 'Selected leader must be an active member of this group or a direct child subgroup leader' },
            { status: 400 }
        );
    }

    // Mirror parent trust-vote eligibility for voters: direct members plus
    // members of direct child subgroups.
    const voterIds = new Set<string>(directMemberIds);
    if (childGroupIds.length > 0) {
        const { data: subgroupMembers, error: subgroupMembersError } = await adminClient
            .from('memberships')
            .select('user_id')
            .in('party_id', childGroupIds)
            .is('left_at', null);

        if (subgroupMembersError) {
            return NextResponse.json({ error: subgroupMembersError.message }, { status: 500 });
        }

        for (const row of subgroupMembers || []) {
            voterIds.add(row.user_id);
        }
    }

    const { error: clearError } = await adminClient
        .from('trust_votes')
        .delete()
        .eq('party_id', partyId);

    if (clearError) {
        return NextResponse.json({ error: clearError.message }, { status: 500 });
    }

    const voterIdList = Array.from(voterIds);
    if (voterIdList.length > 0) {
        const rows = voterIdList.map((fromUserId) => ({
            party_id: partyId,
            from_user_id: fromUserId,
            to_user_id: leaderUserId,
        }));

        const { error: insertError } = await adminClient.from('trust_votes').insert(rows);
        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true, leaderUserId, totalVotes: voterIdList.length });
}
