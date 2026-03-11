import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

interface Props {
    params: Promise<{ id: string }>;
}

type MembershipPartyRelation = {
    issue_id?: string | null;
    location_scope: string | null;
};

type EnsureLocalGroupInput = {
    scope: 'state' | 'district' | 'village';
    issueId: string;
    issueText: string;
    categoryId: string | null;
    createdBy: string;
    stateName: string | null;
    districtName: string | null;
    villageName: string | null;
    parentPartyId: string;
};

async function ensureDefaultLocalGroup(
    supabase: Awaited<ReturnType<typeof createClient>>,
    input: EnsureLocalGroupInput
): Promise<{ partyId: string; created: boolean }> {
    const {
        scope,
        issueId,
        issueText,
        categoryId,
        createdBy,
        stateName,
        districtName,
        villageName,
        parentPartyId,
    } = input;

    let query = supabase
        .from('parties')
        .select('id')
        .eq('issue_id', issueId)
        .eq('location_scope', scope)
        .eq('parent_party_id', parentPartyId)
        .eq('issue_text', issueText)
        .limit(1);

    if (stateName) query = query.eq('state_name', stateName);
    if (districtName) query = query.eq('district_name', districtName);
    if (villageName) query = query.eq('village_name', villageName);

    const { data: existing } = await query.maybeSingle();
    if (existing?.id) {
        return { partyId: existing.id, created: false };
    }

    const locationLabel =
        scope === 'state'
            ? stateName
            : scope === 'district'
                ? districtName
                : villageName;

    const { data: createdParty, error: createError } = await supabase
        .from('parties')
        .insert({
            issue_text: issueText,
            pincodes: [],
            created_by: createdBy,
            category_id: categoryId,
            parent_party_id: parentPartyId,
            issue_id: issueId,
            node_type: 'group',
            location_scope: scope,
            location_label: locationLabel || null,
            state_name: stateName,
            district_name: districtName,
            village_name: villageName,
        })
        .select('id')
        .single();

    if (createError || !createdParty) {
        throw new Error(createError?.message || `Failed creating ${scope} group`);
    }

    return { partyId: createdParty.id, created: true };
}

async function ensureLocalLeadershipPathAfterNationalJoin(
    supabase: Awaited<ReturnType<typeof createClient>>,
    params: {
        userId: string;
        nationalPartyId: string;
        issueId: string;
        issueText: string;
        categoryId: string | null;
    }
) {
    const { userId, nationalPartyId, issueId, issueText, categoryId } = params;

    const { data: profile } = await supabase
        .from('profiles')
        .select('state, district, village')
        .eq('id', userId)
        .maybeSingle();

    const stateName = profile?.state?.trim() || null;
    const districtName = profile?.district?.trim() || null;
    const villageName = profile?.village?.trim() || null;

    const created: Array<{ scope: 'state' | 'district' | 'village'; party_id: string }> = [];
    const reused: Array<{ scope: 'state' | 'district' | 'village'; party_id: string }> = [];
    const skipped: Array<{ scope: 'state' | 'district' | 'village'; reason: string }> = [];

    if (!stateName) {
        skipped.push({ scope: 'state', reason: 'missing_state' });
        skipped.push({ scope: 'district', reason: 'missing_state' });
        skipped.push({ scope: 'village', reason: 'missing_state' });
        return { created, reused, skipped };
    }

    const stateResult = await ensureDefaultLocalGroup(supabase, {
        scope: 'state',
        issueId,
        issueText,
        categoryId,
        createdBy: userId,
        stateName,
        districtName: null,
        villageName: null,
        parentPartyId: nationalPartyId,
    });
    (stateResult.created ? created : reused).push({ scope: 'state', party_id: stateResult.partyId });

    if (!districtName) {
        skipped.push({ scope: 'district', reason: 'missing_district' });
        skipped.push({ scope: 'village', reason: 'missing_district' });
        return { created, reused, skipped };
    }

    const districtResult = await ensureDefaultLocalGroup(supabase, {
        scope: 'district',
        issueId,
        issueText,
        categoryId,
        createdBy: userId,
        stateName,
        districtName,
        villageName: null,
        parentPartyId: stateResult.partyId,
    });
    (districtResult.created ? created : reused).push({ scope: 'district', party_id: districtResult.partyId });

    if (!villageName) {
        skipped.push({ scope: 'village', reason: 'missing_village' });
        return { created, reused, skipped };
    }

    const villageResult = await ensureDefaultLocalGroup(supabase, {
        scope: 'village',
        issueId,
        issueText,
        categoryId,
        createdBy: userId,
        stateName,
        districtName,
        villageName,
        parentPartyId: districtResult.partyId,
    });
    (villageResult.created ? created : reused).push({ scope: 'village', party_id: villageResult.partyId });

    return { created, reused, skipped };
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
        .select('location_scope, issue_id, issue_text, category_id, state_name, district_name, village_name')
        .eq('id', id)
        .maybeSingle();

    const targetScope = targetParty?.location_scope ?? null;
    const targetIssueId = targetParty?.issue_id ?? null;

    // ── Constraint 1: one active membership per geographic level ──────────────
    // A user may join one village group, one district group, etc. independently.
    if (targetScope) {
        const { data: sameLevelMembership } = await supabase
            .from('memberships')
            .select('party_id, parties!inner(location_scope)')
            .eq('user_id', effectiveUserId)
            .is('left_at', null)
            .eq('parties.location_scope', targetScope)
            .maybeSingle();

        if (sameLevelMembership) {
            return NextResponse.json(
                {
                    error: `You are already in a ${targetScope}-level group. Leave that group first before joining another at the same level. You can still like groups to show interest.`,
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
            .select('state, district, village')
            .eq('id', effectiveUserId)
            .maybeSingle();

        const userState = userProfile?.state?.trim().toLowerCase() ?? null;
        const userDistrict = userProfile?.district?.trim().toLowerCase() ?? null;
        const userVillage = userProfile?.village?.trim().toLowerCase() ?? null;

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
                    { error: 'Please set your state and district in your profile before joining a district-level group.' },
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
                    { error: 'Please set your full location (state, district, and village) in your profile before joining a village-level group.' },
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

        let autoProvision: Awaited<ReturnType<typeof ensureLocalLeadershipPathAfterNationalJoin>> | null = null;
        if (targetScope === 'national' && targetIssueId) {
            try {
                autoProvision = await ensureLocalLeadershipPathAfterNationalJoin(supabase, {
                    userId: effectiveUserId,
                    nationalPartyId: id,
                    issueId: targetIssueId,
                    issueText: targetParty?.issue_text || '',
                    categoryId: targetParty?.category_id || null,
                });
            } catch (provisionError) {
                console.error('Failed to auto-provision local groups after re-join', provisionError);
            }
        }

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

    let autoProvision: Awaited<ReturnType<typeof ensureLocalLeadershipPathAfterNationalJoin>> | null = null;
    if (targetScope === 'national' && targetIssueId) {
        try {
            autoProvision = await ensureLocalLeadershipPathAfterNationalJoin(supabase, {
                userId: effectiveUserId,
                nationalPartyId: id,
                issueId: targetIssueId,
                issueText: targetParty?.issue_text || '',
                categoryId: targetParty?.category_id || null,
            });
        } catch (provisionError) {
            console.error('Failed to auto-provision local groups after join', provisionError);
        }
    }

    return NextResponse.json({ ...data, autoProvision }, { status: 201 });
}
