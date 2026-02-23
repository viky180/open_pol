import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface SimilarGroup {
    id: string;
    issue_text: string;
    location_scope: string | null;
    location_label: string | null;
    state_name: string | null;
    district_name: string | null;
    block_name: string | null;
    panchayat_name: string | null;
    village_name: string | null;
    member_count: number;
}

interface SimilarGroupsResponse {
    similarGroups: SimilarGroup[];
    totalPotentialMembers: number;
    totalGroupCount: number;
    stateCount: number;
}

// GET /api/parties/[id]/similar-groups - Get groups with same category for alliance suggestions
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    // Get the current party's category
    const { data: currentParty, error: partyError } = await supabase
        .from('parties')
        .select('id, category_id, pincodes')
        .eq('id', partyId)
        .single();

    if (partyError || !currentParty) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    if (!currentParty.category_id) {
        return NextResponse.json({
            similarGroups: [],
            totalPotentialMembers: 0,
            totalGroupCount: 0,
            stateCount: 0,
        } as SimilarGroupsResponse);
    }

    // Get all parties in the same category except the current one
    const { data: sameCategory, error: categoriesError } = await supabase
        .from('parties')
        .select('id, issue_text, pincodes, location_scope, location_label, state_name, district_name, block_name, panchayat_name, village_name, category_id')
        .eq('category_id', currentParty.category_id)
        .neq('id', partyId);

    if (categoriesError) {
        return NextResponse.json({ error: categoriesError.message }, { status: 500 });
    }

    if (!sameCategory || sameCategory.length === 0) {
        return NextResponse.json({
            similarGroups: [],
            totalPotentialMembers: 0,
            totalGroupCount: 0,
            stateCount: 0,
        } as SimilarGroupsResponse);
    }

    // Get member counts for each party
    const partyIds = sameCategory.map(p => p.id);
    const { data: memberCounts } = await supabase
        .from('memberships')
        .select('party_id')
        .in('party_id', partyIds)
        .is('left_at', null);

    // Count members per party
    const countByParty = new Map<string, number>();
    (memberCounts || []).forEach(m => {
        countByParty.set(m.party_id, (countByParty.get(m.party_id) || 0) + 1);
    });

    // Build similar groups with member counts
    const similarGroups: SimilarGroup[] = sameCategory.map(p => ({
        id: p.id,
        issue_text: p.issue_text,
        location_scope: p.location_scope,
        location_label: p.location_label,
        state_name: p.state_name,
        district_name: p.district_name,
        block_name: p.block_name,
        panchayat_name: p.panchayat_name,
        village_name: p.village_name,
        member_count: countByParty.get(p.id) || 0,
    }));

    // Sort by member count descending
    similarGroups.sort((a, b) => b.member_count - a.member_count);

    // Calculate aggregates
    const totalPotentialMembers = similarGroups.reduce((sum, g) => sum + g.member_count, 0);
    const totalGroupCount = similarGroups.length;

    // Estimate state count from available state metadata; fallback to pincode prefix (rough approximation)
    const uniqueStates = new Set<string>();
    sameCategory.forEach(group => {
        if (group.state_name?.trim()) {
            uniqueStates.add(group.state_name.trim().toLowerCase());
            return;
        }

        (group.pincodes || []).forEach((pin: string | null) => {
            if (pin && pin.length >= 2) {
                uniqueStates.add(pin.substring(0, 2));
            }
        });
    });

    return NextResponse.json({
        similarGroups: similarGroups.slice(0, 10), // Top 10 only
        totalPotentialMembers,
        totalGroupCount,
        stateCount: uniqueStates.size,
    } as SimilarGroupsResponse);
}
