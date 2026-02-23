import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/alliances - List all active alliances with member groups and combined stats
export async function GET() {
    const supabase = await createClient();

    // Fetch all active (not disbanded) alliances
    const { data: alliances, error: alliancesError } = await supabase
        .from('alliances')
        .select('*')
        .is('disbanded_at', null)
        .order('created_at', { ascending: false });

    if (alliancesError) {
        return NextResponse.json({ error: alliancesError.message }, { status: 500 });
    }

    if (!alliances || alliances.length === 0) {
        return NextResponse.json({ alliances: [] });
    }

    const allianceIds = alliances.map(a => a.id);

    // Fetch all active alliance members with party data
    const { data: allianceMembers, error: membersError } = await supabase
        .from('alliance_members')
        .select(`
            id,
            alliance_id,
            party_id,
            joined_at,
            left_at,
            parties:party_id (id, issue_text, location_scope, location_label, state_name, district_name, block_name, panchayat_name, village_name, category_id, member_count)
        `)
        .in('alliance_id', allianceIds)
        .is('left_at', null);

    if (membersError) {
        return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Group members by alliance and compute combined stats
    const membersByAlliance = new Map<string, typeof allianceMembers>();
    (allianceMembers || []).forEach(m => {
        const bucket = membersByAlliance.get(m.alliance_id) || [];
        bucket.push(m);
        membersByAlliance.set(m.alliance_id, bucket);
    });

    const result = alliances.map(alliance => {
        const members = membersByAlliance.get(alliance.id) || [];
        const combinedMemberCount = members.reduce((sum, m) => {
            const party = m.parties as unknown as { member_count: number } | null;
            return sum + (party?.member_count || 0);
        }, 0);

        return {
            ...alliance,
            members: members.map(m => ({
                id: m.id,
                alliance_id: m.alliance_id,
                party_id: m.party_id,
                joined_at: m.joined_at,
                left_at: m.left_at,
                party: m.parties,
            })),
            combinedMemberCount,
            groupCount: members.length,
        };
    });

    return NextResponse.json({ alliances: result });
}

// POST /api/alliances - Create a new alliance
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, party_id } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Alliance name is required' }, { status: 400 });
    }

    if (!party_id) {
        return NextResponse.json({ error: 'party_id is required — select which group to register in this alliance' }, { status: 400 });
    }

    // Verify user is the creator or leader of the party
    const { data: party } = await supabase
        .from('parties')
        .select('id, created_by')
        .eq('id', party_id)
        .single();

    if (!party) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const isCreator = party.created_by === user.id;

    // Check if user is the leader (most trust votes)
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
        return NextResponse.json({ error: 'Only the group creator or elected leader can create an alliance' }, { status: 403 });
    }

    // Check if the party is already in an active alliance
    const { data: existingMembership } = await supabase
        .from('alliance_members')
        .select('id')
        .eq('party_id', party_id)
        .is('left_at', null)
        .maybeSingle();

    if (existingMembership) {
        return NextResponse.json({ error: 'This group is already in an active alliance. Leave the current alliance first.' }, { status: 409 });
    }

    // Create the alliance
    const { data: alliance, error: allianceError } = await supabase
        .from('alliances')
        .insert({
            name: name.trim(),
            description: description?.trim() || null,
            created_by: user.id,
        })
        .select()
        .single();

    if (allianceError) {
        return NextResponse.json({ error: allianceError.message }, { status: 500 });
    }

    // Add the creator's party as the first member
    const { error: memberError } = await supabase
        .from('alliance_members')
        .insert({
            alliance_id: alliance.id,
            party_id: party_id,
        });

    if (memberError) {
        // Rollback alliance creation
        await supabase.from('alliances').delete().eq('id', alliance.id);
        return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json(alliance, { status: 201 });
}
