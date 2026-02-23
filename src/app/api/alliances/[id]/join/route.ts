import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/alliances/[id]/join - Join an alliance with a party
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

    // Verify alliance exists and is active
    const { data: alliance } = await supabase
        .from('alliances')
        .select('id')
        .eq('id', allianceId)
        .is('disbanded_at', null)
        .single();

    if (!alliance) {
        return NextResponse.json({ error: 'Alliance not found or disbanded' }, { status: 404 });
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
        return NextResponse.json({ error: 'Only the group creator or elected leader can join an alliance' }, { status: 403 });
    }

    // Check if the party is already in an active alliance
    const { data: existingMembership } = await supabase
        .from('alliance_members')
        .select('id, alliance_id')
        .eq('party_id', party_id)
        .is('left_at', null)
        .maybeSingle();

    if (existingMembership) {
        if (existingMembership.alliance_id === allianceId) {
            return NextResponse.json({ error: 'This group is already a member of this alliance' }, { status: 409 });
        }
        return NextResponse.json({ error: 'This group is already in another alliance. Leave it first.' }, { status: 409 });
    }

    // Add party to alliance
    const { error: joinError } = await supabase
        .from('alliance_members')
        .insert({
            alliance_id: allianceId,
            party_id: party_id,
        });

    if (joinError) {
        return NextResponse.json({ error: joinError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
