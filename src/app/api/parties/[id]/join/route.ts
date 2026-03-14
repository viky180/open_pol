import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';
import { buildFoundingGroupName } from '@/lib/foundingGroups';

interface Props {
    params: Promise<{ id: string }>;
}

type MembershipPartyRelation = {
    issue_id?: string | null;
    location_scope: string | null;
};

type SubNationalScope = 'state' | 'district' | 'village';

type AutoProvisionPayload = {
    created: Array<{ scope: SubNationalScope; party_id: string }>;
    reused: Array<{ scope: SubNationalScope; party_id: string }>;
    skipped: Array<{ scope: SubNationalScope; reason: string }>;
};

type NationalPartyForProvision = {
    id: string;
    issue_id: string;
    issue_text: string | null;
    category_id: string | null;
};

async function provisionLocalFoundingGroupsForUser({
    supabase,
    effectiveUserId,
    nationalParty,
}: {
    supabase: Awaited<ReturnType<typeof createClient>>;
    effectiveUserId: string;
    nationalParty: NationalPartyForProvision;
}): Promise<AutoProvisionPayload> {
    const result: AutoProvisionPayload = {
        created: [],
        reused: [],
        skipped: [],
    };

    const { data: profile } = await supabase
        .from('profiles')
        .select('state, area_type, city, corporation, district, ward, locality, village')
        .eq('id', effectiveUserId)
        .maybeSingle();

    const userState = profile?.state?.trim() || null;
    const isUrban = profile?.area_type === 'urban';
    const userDistrict = isUrban
        ? (profile?.city?.trim() || profile?.corporation?.trim() || null)
        : (profile?.district?.trim() || null);
    const userVillage = isUrban
        ? (profile?.ward?.trim() || profile?.locality?.trim() || null)
        : (profile?.village?.trim() || null);

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
                category_id: nationalParty.category_id,
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
                category_id: nationalParty.category_id,
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
                category_id: nationalParty.category_id,
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

    return result;
}

// POST /api/parties/[id]/join - Join a party
export async function POST(request: NextRequest, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(request, name)
    );
    if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const effectiveUserId = userContext.effectiveUserId;

    // Check if membership row already exists for this user + party
    const { data: existing } = await supabase
        .from('memberships')
        .select('id, left_at')
        .eq('party_id', id)
        .eq('user_id', effectiveUserId)
        .maybeSingle();

    if (existing && existing.left_at === null) {
        return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    // Look up the scope and issue_id of the group being joined
    const { data: targetParty } = await supabase
        .from('parties')
        .select('location_scope, issue_id, issue_text, category_id, state_name, district_name, village_name, is_founding_group')
        .eq('id', id)
        .maybeSingle();

    const targetScope = targetParty?.location_scope ?? null;
    const targetIssueId = targetParty?.issue_id ?? null;
    const shouldAutoProvisionLocalPath = targetScope === 'national'
        && !!targetIssueId
        && !!targetParty?.is_founding_group;

    const maybeAutoProvisionLocalPath = async (): Promise<AutoProvisionPayload | null> => {
        if (!shouldAutoProvisionLocalPath || !targetParty || !targetParty.issue_id) {
            return null;
        }

        try {
            return await provisionLocalFoundingGroupsForUser({
                supabase,
                effectiveUserId,
                nationalParty: {
                    id,
                    issue_id: targetParty.issue_id,
                    issue_text: targetParty.issue_text ?? null,
                    category_id: targetParty.category_id ?? null,
                },
            });
        } catch (error) {
            console.error('Failed to auto-provision local founding groups:', error);
            return null;
        }
    };

    // ── Constraint 1: one active membership per geographic level (within the same national group) ──
    // A user may join one village group, one district group, etc. per national group independently.
    if (targetScope && targetIssueId) {
        const { data: sameLevelMembership } = await supabase
            .from('memberships')
            .select('party_id, parties!inner(location_scope, issue_id)')
            .eq('user_id', effectiveUserId)
            .is('left_at', null)
            .eq('parties.location_scope', targetScope)
            .eq('parties.issue_id', targetIssueId)
            .maybeSingle();

        if (sameLevelMembership) {
            return NextResponse.json(
                {
                    error: `You are already in a ${targetScope}-level group for this national group. Leave that group first before joining another at the same level. You can still like groups to show interest.`,
                },
                { status: 400 }
            );
        }
    }

    // ── Constraint 2: issue-scoped branch constraint ──────────────────────────
    // Users must stay within the same issue branch across all levels.
    // Skip-level joining (e.g. national + district without state) is allowed,
    // but you cannot mix groups from different issues.
    if (targetIssueId) {
        const { data: conflictingMembership } = await supabase
            .from('memberships')
            .select('party_id, parties!inner(issue_id, location_scope)')
            .eq('user_id', effectiveUserId)
            .is('left_at', null)
            .not('parties.issue_id', 'is', null)
            .neq('parties.issue_id', targetIssueId)
            .maybeSingle();

        if (conflictingMembership) {
            const conflictPartyRelation = Array.isArray(conflictingMembership.parties)
                ? conflictingMembership.parties[0]
                : conflictingMembership.parties as MembershipPartyRelation | null;
            const conflictScope = conflictPartyRelation?.location_scope ?? 'other';
            return NextResponse.json(
                {
                    error: `You are already in a ${conflictScope}-level group for a different issue. Leave that group first, or join a group under the same issue.`,
                },
                { status: 400 }
            );
        }
    }

    // ── Constraint 3: geographic location constraint ─────────────────────────
    // For sub-national groups, the user must belong to the same geographic
    // area as the group (state / district / village).
    const SUB_NATIONAL_SCOPES = ['state', 'district', 'village'];
    if (targetScope && SUB_NATIONAL_SCOPES.includes(targetScope)) {
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('state, area_type, city, corporation, district, ward, locality, village')
            .eq('id', effectiveUserId)
            .maybeSingle();

        const isUrban = userProfile?.area_type === 'urban';
        const userState = userProfile?.state?.trim().toLowerCase() ?? null;
        const userDistrict = (isUrban
            ? (userProfile?.city?.trim() || userProfile?.corporation?.trim() || null)
            : (userProfile?.district?.trim() || null))?.toLowerCase() ?? null;
        const userVillage = (isUrban
            ? (userProfile?.ward?.trim() || userProfile?.locality?.trim() || null)
            : (userProfile?.village?.trim() || null))?.toLowerCase() ?? null;

        const partyState = targetParty?.state_name?.trim().toLowerCase() ?? null;
        const partyDistrict = targetParty?.district_name?.trim().toLowerCase() ?? null;
        const partyVillage = targetParty?.village_name?.trim().toLowerCase() ?? null;

        if (targetScope === 'state') {
            if (!userState) {
                return NextResponse.json(
                    { error: 'Please set your state in your profile before joining a state-level group.' },
                    { status: 400 }
                );
            }
            if (partyState && userState !== partyState) {
                return NextResponse.json(
                    { error: `This group is for ${targetParty?.state_name} residents. Update your profile location if you have moved.` },
                    { status: 400 }
                );
            }
        }

        if (targetScope === 'district') {
            if (!userState || !userDistrict) {
                return NextResponse.json(
                    { error: 'Please set your state and city/district in your profile before joining a district-level group.' },
                    { status: 400 }
                );
            }
            if ((partyState && userState !== partyState) || (partyDistrict && userDistrict !== partyDistrict)) {
                return NextResponse.json(
                    { error: `This group is for ${targetParty?.district_name}, ${targetParty?.state_name} residents. Update your profile location if you have moved.` },
                    { status: 400 }
                );
            }
        }

        if (targetScope === 'village') {
            if (!userState || !userDistrict || !userVillage) {
                return NextResponse.json(
                    { error: 'Please set your full location (state, city/district, and village/ward) in your profile before joining a village-level group.' },
                    { status: 400 }
                );
            }
            if (
                (partyState && userState !== partyState) ||
                (partyDistrict && userDistrict !== partyDistrict) ||
                (partyVillage && userVillage !== partyVillage)
            ) {
                return NextResponse.json(
                    { error: `This group is for ${targetParty?.village_name}, ${targetParty?.district_name}, ${targetParty?.state_name} residents. Update your profile location if you have moved.` },
                    { status: 400 }
                );
            }
        }
    }

    // Re-activate previous membership row if user had left earlier.
    // This avoids UNIQUE(party_id, user_id) violations while preserving history via left_at.
    if (existing && existing.left_at !== null) {
        const { data, error } = await supabase
            .from('memberships')
            .update({
                left_at: null,
                leave_feedback: null,
                joined_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const autoProvision = await maybeAutoProvisionLocalPath();
        return NextResponse.json({ ...data, autoProvision }, { status: 200 });
    }

    // First-time join for this user + party
    const { data, error } = await supabase
        .from('memberships')
        .insert({
            party_id: id,
            user_id: effectiveUserId
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const autoProvision = await maybeAutoProvisionLocalPath();
    return NextResponse.json({ ...data, autoProvision }, { status: 201 });
}
