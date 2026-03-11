import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminUserId } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/admin/simulation/leader
// Body: { partyId: string, leaderUserId: string }
// Sets a leader for a group by making all members vote for the specified user.
// In the flat level model, leadership at every level is determined by trust
// votes within the winning group (most members) at that (scope + issue_id).
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

    // Verify the leader is a direct member
    const { data: directMembers, error: memberError } = await adminClient
        .from('memberships')
        .select('user_id')
        .eq('party_id', partyId)
        .is('left_at', null);

    if (memberError) {
        return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    const directMemberIds = (directMembers || []).map((m) => m.user_id);

    if (!directMemberIds.includes(leaderUserId)) {
        return NextResponse.json(
            { error: 'Selected leader must be an active member of this group' },
            { status: 400 }
        );
    }

    // Clear existing votes and make all members vote for the specified user
    const { error: clearError } = await adminClient
        .from('trust_votes')
        .delete()
        .eq('party_id', partyId);

    if (clearError) {
        return NextResponse.json({ error: clearError.message }, { status: 500 });
    }

    if (directMemberIds.length > 0) {
        const rows = directMemberIds.map((fromUserId) => ({
            party_id: partyId,
            from_user_id: fromUserId,
            to_user_id: leaderUserId,
        }));

        const { error: insertError } = await adminClient.from('trust_votes').insert(rows);
        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true, leaderUserId, totalVotes: directMemberIds.length });
}
