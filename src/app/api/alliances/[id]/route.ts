import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/alliances/[id] - Get alliance detail with combined stats
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch the alliance
    const { data: alliance, error: allianceError } = await supabase
        .from('alliances')
        .select('*')
        .eq('id', id)
        .single();

    if (allianceError || !alliance) {
        return NextResponse.json({ error: 'Alliance not found' }, { status: 404 });
    }

    // Fetch active members with full party details
    const { data: members, error: membersError } = await supabase
        .from('alliance_members')
        .select(`
            id,
            alliance_id,
            party_id,
            joined_at,
            left_at,
            parties:party_id (
                id, issue_text, location_scope, location_label,
                state_name, district_name, block_name, panchayat_name, village_name,
                category_id, member_count, created_by
            )
        `)
        .eq('alliance_id', id)
        .is('left_at', null);

    if (membersError) {
        return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    const partyIds = (members || []).map(m => m.party_id);

    // Get recursive member counts for each party
    const memberCounts = partyIds.length > 0
        ? await Promise.all(
            partyIds.map(pid => supabase.rpc('get_recursive_member_count', { p_party_id: pid }))
        )
        : [];

    const memberCountMap = new Map<string, number>();
    partyIds.forEach((pid, i) => {
        memberCountMap.set(pid, (memberCounts[i]?.data as number) || 0);
    });

    const combinedMemberCount = Array.from(memberCountMap.values()).reduce((s, c) => s + c, 0);

    // Build location scope breakdown
    const locationBreakdown = new Map<string, { scope: string; location: string; memberCount: number; groups: string[] }>();
    (members || []).forEach(m => {
        const party = m.parties as unknown as {
            id: string; issue_text: string; location_scope: string;
            state_name: string | null; district_name: string | null;
            block_name: string | null; panchayat_name: string | null;
            village_name: string | null;
        } | null;
        if (!party) return;

        const scope = party.location_scope || 'district';
        const locationName = scope === 'national' ? 'India'
            : scope === 'state' ? (party.state_name || 'Unknown')
                : scope === 'district' ? (party.district_name || 'Unknown')
                    : scope === 'block' ? (party.block_name || 'Unknown')
                        : scope === 'panchayat' ? (party.panchayat_name || 'Unknown')
                            : scope === 'village' ? (party.village_name || 'Unknown')
                                : 'Unknown';

        const key = `${scope}:${locationName}`;
        const existing = locationBreakdown.get(key) || { scope, location: locationName, memberCount: 0, groups: [] };
        existing.memberCount += memberCountMap.get(m.party_id) || 0;
        existing.groups.push(party.issue_text);
        locationBreakdown.set(key, existing);
    });

    // Fetch the creator's profile name
    let creatorName: string | null = null;
    if (alliance.created_by) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', alliance.created_by)
            .maybeSingle();
        creatorName = profile?.display_name || null;
    }

    return NextResponse.json({
        ...alliance,
        creatorName,
        members: (members || []).map(m => ({
            id: m.id,
            alliance_id: m.alliance_id,
            party_id: m.party_id,
            joined_at: m.joined_at,
            left_at: m.left_at,
            party: m.parties,
            memberCount: memberCountMap.get(m.party_id) || 0,
        })),
        combinedMemberCount,
        groupCount: (members || []).length,
        locationBreakdown: Array.from(locationBreakdown.values()),
    });
}
