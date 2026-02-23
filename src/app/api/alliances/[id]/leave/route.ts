import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/alliances/[id]/leave - Leave an alliance with a party
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: allianceId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { party_id } = body;

    if (!party_id) {
        return NextResponse.json({ error: 'party_id is required' }, { status: 400 });
    }

    // Verify user is creator or leader of the party
    const { data: party } = await supabase
        .from('parties')
        .select('id, created_by')
        .eq('id', party_id)
        .single();

    if (!party) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const isCreator = party.created_by === user.id;

    const { data: trustVotes } = await supabase
        .from('trust_votes')
        .select('to_user_id')
        .eq('party_id', party_id)
        .gt('expires_at', new Date().toISOString());

    let isLeader = false;
    if (trustVotes && trustVotes.length > 0) {
        const voteCounts: Record<string, number> = {};
        trustVotes.forEach(v => {
            voteCounts[v.to_user_id] = (voteCounts[v.to_user_id] || 0) + 1;
        });
        const leaderId = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        isLeader = leaderId === user.id;
    }

    if (!isCreator && !isLeader) {
        return NextResponse.json({ error: 'Only the group creator or elected leader can leave an alliance' }, { status: 403 });
    }

    // Find and update the membership
    const { data: membership } = await supabase
        .from('alliance_members')
        .select('id')
        .eq('alliance_id', allianceId)
        .eq('party_id', party_id)
        .is('left_at', null)
        .maybeSingle();

    if (!membership) {
        return NextResponse.json({ error: 'This group is not a member of this alliance' }, { status: 404 });
    }

    // Set left_at to mark departure
    const { error: leaveError } = await supabase
        .from('alliance_members')
        .update({ left_at: new Date().toISOString() })
        .eq('id', membership.id);

    if (leaveError) {
        return NextResponse.json({ error: leaveError.message }, { status: 500 });
    }

    // Check if alliance has fewer than 2 active members — if so, disband
    const { data: remainingMembers } = await supabase
        .from('alliance_members')
        .select('id')
        .eq('alliance_id', allianceId)
        .is('left_at', null);

    if (!remainingMembers || remainingMembers.length < 1) {
        await supabase
            .from('alliances')
            .update({ disbanded_at: new Date().toISOString() })
            .eq('id', allianceId);
    }

    return NextResponse.json({ success: true });
}
