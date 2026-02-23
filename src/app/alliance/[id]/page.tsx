import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { AllianceDetailClient } from './AllianceDetailClient';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function AllianceDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch alliance detail from API internally
    const { data: alliance, error: allianceError } = await supabase
        .from('alliances')
        .select('*')
        .eq('id', id)
        .single();

    if (allianceError || !alliance) {
        notFound();
    }

    // Fetch active members with party details
    const { data: members } = await supabase
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
                category_id, created_by
            )
        `)
        .eq('alliance_id', id)
        .is('left_at', null);

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
    type LocationEntry = { scope: string; location: string; memberCount: number; groups: string[] };
    const locationBreakdown = new Map<string, LocationEntry>();
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

    // Fetch creator profile
    let creatorName: string | null = null;
    if (alliance.created_by) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', alliance.created_by)
            .maybeSingle();
        creatorName = profile?.display_name || null;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Check if user has a group eligible to join
    let userEligiblePartyId: string | null = null;
    let userPartyInAlliance = false;

    if (user) {
        const { data: userMemberships } = await supabase
            .from('memberships')
            .select('party_id')
            .eq('user_id', user.id)
            .is('left_at', null);

        const userPartyIds = (userMemberships || []).map(m => m.party_id);

        // Check if any of user's parties are already in THIS alliance
        for (const pid of userPartyIds) {
            if (partyIds.includes(pid)) {
                userPartyInAlliance = true;
                userEligiblePartyId = pid;
                break;
            }
        }

        if (!userPartyInAlliance && userPartyIds.length > 0) {
            // Check which parties are NOT in any alliance
            const { data: existingAllianceMembers } = await supabase
                .from('alliance_members')
                .select('party_id')
                .in('party_id', userPartyIds)
                .is('left_at', null);

            const inAllianceSet = new Set((existingAllianceMembers || []).map(m => m.party_id));
            const firstEligible = userPartyIds.find(pid => !inAllianceSet.has(pid));
            userEligiblePartyId = firstEligible || null;
        }
    }

    const allianceData = {
        ...alliance,
        creatorName,
        members: (members || []).map(m => ({
            id: m.id,
            alliance_id: m.alliance_id,
            party_id: m.party_id,
            joined_at: m.joined_at,
            left_at: m.left_at,
            party: m.parties as unknown as {
                id: string; issue_text: string; location_scope: string;
                location_label: string | null;
                state_name: string | null; district_name: string | null;
                block_name: string | null; panchayat_name: string | null;
                village_name: string | null;
                category_id: string | null; created_by: string | null;
            },
            memberCount: memberCountMap.get(m.party_id) || 0,
        })),
        combinedMemberCount,
        groupCount: (members || []).length,
        locationBreakdown: Array.from(locationBreakdown.values()),
    };

    return (
        <AllianceDetailClient
            alliance={allianceData}
            currentUserId={user?.id || null}
            userEligiblePartyId={userEligiblePartyId}
            userPartyInAlliance={userPartyInAlliance}
        />
    );
}
