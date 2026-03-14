import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';
import { buildFoundingGroupName } from '@/lib/foundingGroups';

interface Props {
    params: Promise<{ id: string }>;
}

type SubNationalScope = 'state' | 'district' | 'village';

type ProvisionResult = {
    created: Array<{ scope: SubNationalScope; party_id: string }>;
    reused: Array<{ scope: SubNationalScope; party_id: string }>;
    skipped: Array<{ scope: SubNationalScope; reason: string }>;
};

// POST /api/parties/[id]/provision-local
// Idempotently creates founding groups at state/district/village levels
// for the authenticated user's location, under the given national party's issue.
export async function POST(request: NextRequest, { params }: Props) {
    const { id: nationalId } = await params;
    const supabase = await createClient();

    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(request, name)
    );
    if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const effectiveUserId = userContext.effectiveUserId;

    // Fetch the national party
    const { data: nationalParty } = await supabase
        .from('parties')
        .select('id, issue_id, issue_text, category_id, location_scope')
        .eq('id', nationalId)
        .maybeSingle();

    if (!nationalParty || nationalParty.location_scope !== 'national' || !nationalParty.issue_id) {
        return NextResponse.json(
            { error: 'Not a valid national party.' },
            { status: 400 }
        );
    }

    // Fetch user profile location (handles both urban and rural area types)
    const { data: profile } = await supabase
        .from('profiles')
        .select('state, area_type, city, corporation, district, ward, locality, village')
        .eq('id', effectiveUserId)
        .maybeSingle();

    const userState = profile?.state?.trim() || null;
    const isUrban = profile?.area_type === 'urban';

    // Urban users store location in city/corporation/ward/locality instead of district/village
    const userDistrict = isUrban
        ? (profile?.city?.trim() || profile?.corporation?.trim() || null)
        : (profile?.district?.trim() || null);
    const userVillage = isUrban
        ? (profile?.ward?.trim() || profile?.locality?.trim() || null)
        : (profile?.village?.trim() || null);

    const result: ProvisionResult = {
        created: [],
        reused: [],
        skipped: [],
    };

    const adminSupabase = createAdminClient();

    const ensureStateFoundingGroup = async (): Promise<string | null> => {
        if (!userState) {
            result.skipped.push({ scope: 'state', reason: 'missing_location' });
            return null;
        }

        const { data: existing } = await supabase
            .from('parties')
            .select('id')
            .eq('issue_id', nationalParty.issue_id)
            .eq('parent_party_id', nationalParty.id)
            .eq('location_scope', 'state')
            .eq('is_founding_group', true)
            .ilike('state_name', userState)
            .maybeSingle();

        if (existing) {
            result.reused.push({ scope: 'state', party_id: existing.id });
            return existing.id;
        }

        const { data: createdState, error } = await adminSupabase
            .from('parties')
            .insert({
                issue_text: buildFoundingGroupName({
                    issueText: nationalParty.issue_text,
                    locationScope: 'state',
                    stateName: userState,
                }),
                pincodes: [] as string[],
                is_founding_group: true,
                issue_id: nationalParty.issue_id,
                category_id: nationalParty.category_id ?? null,
                parent_party_id: nationalParty.id,
                node_type: 'group' as const,
                location_scope: 'state' as const,
                location_label: userState,
                state_name: userState,
                district_name: null,
                village_name: null,
                created_by: null as string | null,
            })
            .select('id')
            .single();

        if (error) {
            if (error.code === '23505') {
                const { data: raced } = await supabase
                    .from('parties')
                    .select('id')
                    .eq('issue_id', nationalParty.issue_id)
                    .eq('parent_party_id', nationalParty.id)
                    .eq('location_scope', 'state')
                    .eq('is_founding_group', true)
                    .ilike('state_name', userState)
                    .maybeSingle();

                if (raced) {
                    result.reused.push({ scope: 'state', party_id: raced.id });
                    return raced.id;
                }
            }

            result.skipped.push({ scope: 'state', reason: 'creation_failed' });
            return null;
        }

        if (createdState) {
            result.created.push({ scope: 'state', party_id: createdState.id });
            return createdState.id;
        }

        result.skipped.push({ scope: 'state', reason: 'creation_failed' });
        return null;
    };

    const ensureDistrictFoundingGroup = async (statePartyId: string | null): Promise<string | null> => {
        if (!userState || !userDistrict) {
            result.skipped.push({ scope: 'district', reason: 'missing_location' });
            return null;
        }
        if (!statePartyId) {
            result.skipped.push({ scope: 'district', reason: 'missing_parent' });
            return null;
        }

        const { data: existing } = await supabase
            .from('parties')
            .select('id')
            .eq('issue_id', nationalParty.issue_id)
            .eq('parent_party_id', statePartyId)
            .eq('location_scope', 'district')
            .eq('is_founding_group', true)
            .ilike('state_name', userState)
            .ilike('district_name', userDistrict)
            .maybeSingle();

        if (existing) {
            result.reused.push({ scope: 'district', party_id: existing.id });
            return existing.id;
        }

        const { data: createdDistrict, error } = await adminSupabase
            .from('parties')
            .insert({
                issue_text: buildFoundingGroupName({
                    issueText: nationalParty.issue_text,
                    locationScope: 'district',
                    stateName: userState,
                    districtName: userDistrict,
                }),
                pincodes: [] as string[],
                is_founding_group: true,
                issue_id: nationalParty.issue_id,
                category_id: nationalParty.category_id ?? null,
                parent_party_id: statePartyId,
                node_type: 'group' as const,
                location_scope: 'district' as const,
                location_label: userDistrict,
                state_name: userState,
                district_name: userDistrict,
                village_name: null,
                created_by: null as string | null,
            })
            .select('id')
            .single();

        if (error) {
            if (error.code === '23505') {
                const { data: raced } = await supabase
                    .from('parties')
                    .select('id')
                    .eq('issue_id', nationalParty.issue_id)
                    .eq('parent_party_id', statePartyId)
                    .eq('location_scope', 'district')
                    .eq('is_founding_group', true)
                    .ilike('state_name', userState)
                    .ilike('district_name', userDistrict)
                    .maybeSingle();

                if (raced) {
                    result.reused.push({ scope: 'district', party_id: raced.id });
                    return raced.id;
                }
            }

            result.skipped.push({ scope: 'district', reason: 'creation_failed' });
            return null;
        }

        if (createdDistrict) {
            result.created.push({ scope: 'district', party_id: createdDistrict.id });
            return createdDistrict.id;
        }

        result.skipped.push({ scope: 'district', reason: 'creation_failed' });
        return null;
    };

    const ensureVillageFoundingGroup = async (districtPartyId: string | null): Promise<string | null> => {
        if (!userState || !userDistrict || !userVillage) {
            result.skipped.push({ scope: 'village', reason: 'missing_location' });
            return null;
        }
        if (!districtPartyId) {
            result.skipped.push({ scope: 'village', reason: 'missing_parent' });
            return null;
        }

        const { data: existing } = await supabase
            .from('parties')
            .select('id')
            .eq('issue_id', nationalParty.issue_id)
            .eq('parent_party_id', districtPartyId)
            .eq('location_scope', 'village')
            .eq('is_founding_group', true)
            .ilike('state_name', userState)
            .ilike('district_name', userDistrict)
            .ilike('village_name', userVillage)
            .maybeSingle();

        if (existing) {
            result.reused.push({ scope: 'village', party_id: existing.id });
            return existing.id;
        }

        const { data: createdVillage, error } = await adminSupabase
            .from('parties')
            .insert({
                issue_text: buildFoundingGroupName({
                    issueText: nationalParty.issue_text,
                    locationScope: 'village',
                    stateName: userState,
                    districtName: userDistrict,
                    villageName: userVillage,
                }),
                pincodes: [] as string[],
                is_founding_group: true,
                issue_id: nationalParty.issue_id,
                category_id: nationalParty.category_id ?? null,
                parent_party_id: districtPartyId,
                node_type: 'group' as const,
                location_scope: 'village' as const,
                location_label: userVillage,
                state_name: userState,
                district_name: userDistrict,
                village_name: userVillage,
                created_by: null as string | null,
            })
            .select('id')
            .single();

        if (error) {
            if (error.code === '23505') {
                const { data: raced } = await supabase
                    .from('parties')
                    .select('id')
                    .eq('issue_id', nationalParty.issue_id)
                    .eq('parent_party_id', districtPartyId)
                    .eq('location_scope', 'village')
                    .eq('is_founding_group', true)
                    .ilike('state_name', userState)
                    .ilike('district_name', userDistrict)
                    .ilike('village_name', userVillage)
                    .maybeSingle();

                if (raced) {
                    result.reused.push({ scope: 'village', party_id: raced.id });
                    return raced.id;
                }
            }

            result.skipped.push({ scope: 'village', reason: 'creation_failed' });
            return null;
        }

        if (createdVillage) {
            result.created.push({ scope: 'village', party_id: createdVillage.id });
            return createdVillage.id;
        }

        result.skipped.push({ scope: 'village', reason: 'creation_failed' });
        return null;
    };

    const statePartyId = await ensureStateFoundingGroup();
    const districtPartyId = await ensureDistrictFoundingGroup(statePartyId);
    await ensureVillageFoundingGroup(districtPartyId);

    return NextResponse.json(result, { status: 200 });
}
