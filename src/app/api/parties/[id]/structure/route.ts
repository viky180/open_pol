import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface Props {
    params: Promise<{ id: string }>;
}

type GroupCard = {
    id: string;
    issue_text: string;
    icon_svg?: string | null;
    icon_image_url?: string | null;
    memberCount: number;
};

type ChildGroup = GroupCard & {
    location_scope: string | null;
    state_name: string | null;
    district_name: string | null;
    block_name: string | null;
    panchayat_name: string | null;
    village_name: string | null;
};

// GET /api/parties/[id]/structure - load structure tab data lazily
export async function GET(_request: Request, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: party, error: partyError } = await supabase
        .from('parties')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (partyError || !party) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    let siblingGroups: GroupCard[] = [];
    if (party.parent_party_id) {
        let siblingQuery = supabase
            .from('parties')
            .select('id, issue_text, icon_svg, icon_image_url, member_count')
            .eq('parent_party_id', party.parent_party_id)
            .eq('location_scope', party.location_scope || 'district')
            .neq('id', id);

        const scope = party.location_scope || 'district';
        if (scope === 'state' && party.state_name) {
            siblingQuery = siblingQuery.eq('state_name', party.state_name);
        } else if (scope === 'district' && party.district_name) {
            siblingQuery = siblingQuery.eq('state_name', party.state_name || '').eq('district_name', party.district_name);
        } else if (scope === 'block' && party.block_name) {
            siblingQuery = siblingQuery.eq('state_name', party.state_name || '').eq('block_name', party.block_name);
        } else if (scope === 'panchayat' && party.panchayat_name) {
            siblingQuery = siblingQuery.eq('panchayat_name', party.panchayat_name);
        } else if (scope === 'village' && party.village_name) {
            siblingQuery = siblingQuery.eq('village_name', party.village_name);
        }

        const { data: siblingsData } = await siblingQuery;
        if (siblingsData && siblingsData.length > 0) {
            siblingGroups = siblingsData.map((s: { id: string; issue_text: string; icon_svg?: string | null; icon_image_url?: string | null; member_count?: number | null }) => ({
                id: s.id,
                issue_text: s.issue_text,
                icon_svg: s.icon_svg || null,
                icon_image_url: s.icon_image_url || null,
                memberCount: s.member_count || 0,
            }));
        }
    }

    const { data: attachedSubgroupsData } = await supabase
        .from('parties')
        .select('id, issue_text, icon_svg, icon_image_url, member_count, location_scope, state_name, district_name, block_name, panchayat_name, village_name')
        .eq('parent_party_id', id);

    const attachedSubgroups = (attachedSubgroupsData || []) as Array<{
        id: string;
        issue_text: string;
        icon_svg?: string | null;
        icon_image_url?: string | null;
        member_count?: number | null;
        location_scope?: string | null;
        state_name?: string | null;
        district_name?: string | null;
        block_name?: string | null;
        panchayat_name?: string | null;
        village_name?: string | null;
    }>;

    const childGroups: ChildGroup[] = attachedSubgroups.map((s) => ({
        id: s.id,
        issue_text: s.issue_text,
        icon_svg: s.icon_svg || null,
        icon_image_url: s.icon_image_url || null,
        memberCount: s.member_count || 0,
        location_scope: s.location_scope || null,
        state_name: s.state_name || null,
        district_name: s.district_name || null,
        block_name: s.block_name || null,
        panchayat_name: s.panchayat_name || null,
        village_name: s.village_name || null,
    }));

    // Determine if this group is leading at its scope (flat model: most members wins)
    let isGoverning = false;
    const scope = party.location_scope || 'district';
    const locationField = scope === 'state' ? 'state_name'
        : scope === 'district' ? 'district_name'
            : scope === 'block' ? 'block_name'
                : scope === 'panchayat' ? 'panchayat_name'
                    : scope === 'village' ? 'village_name'
                        : null;
    const locationValue = locationField ? (party as Record<string, unknown>)[locationField] as string | null : null;

    if (locationField && locationValue) {
        const myCount = party.member_count || 0;
        const peerQuery = supabase
            .from('parties')
            .select('id, member_count')
            .eq('location_scope', scope)
            .eq(locationField, locationValue)
            .neq('id', id);
        const { data: peers } = await peerQuery;
        const isLargest = myCount > 0 && (peers || []).every(
            (peer: { member_count?: number | null }) => (peer.member_count || 0) < myCount
        );
        isGoverning = isLargest;
    }

    // Competing groups at the same scope+category (flat model)
    let competingGroups: GroupCard[] = [];
    if (party.category_id) {
        let competitorQuery = supabase
            .from('parties')
            .select('id, issue_text, icon_svg, icon_image_url, member_count')
            .eq('category_id', party.category_id)
            .eq('location_scope', scope)
            .neq('id', id);

        if (scope === 'state' && party.state_name) {
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
        competingGroups = (competitors || []).map((c: { id: string; issue_text: string; icon_svg?: string | null; icon_image_url?: string | null; member_count?: number | null }) => ({
            id: c.id,
            issue_text: c.issue_text,
            icon_svg: c.icon_svg || null,
            icon_image_url: c.icon_image_url || null,
            memberCount: c.member_count || 0,
        }));
    }

    return NextResponse.json(
        {
            childGroups,
            siblingGroups,
            competingGroups,
            isGoverning,
        },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
}
