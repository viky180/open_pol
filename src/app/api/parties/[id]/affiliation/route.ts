import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';
import { createAdminClient } from '@/lib/supabase/admin';

interface Props {
    params: Promise<{ id: string }>;
}

type PartyShape = {
    id: string;
    issue_text?: string | null;
    icon_svg?: string | null;
    icon_image_url?: string | null;
    member_count?: number | null;
    created_at?: string;
    parent_party_id?: string | null;
    location_scope?: string | null;
};

function getBroaderScope(scope: string | null | undefined): string | null {
    if (scope === 'village') return 'district';
    if (scope === 'panchayat') return 'block';
    if (scope === 'block') return 'district';
    if (scope === 'district') return 'state';
    if (scope === 'state') return 'national';
    return null;
}

// GET /api/parties/[id]/affiliation
// Returns current upward affiliation + eligible target groups in the same competition pool.
export async function GET(request: NextRequest, { params }: Props) {
    const { id: fromPartyId } = await params;
    const supabase = await createClient();

    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(request, name)
    );
    const effectiveUserId = userContext?.effectiveUserId || null;

    const { data: fromParty } = await supabase
        .from('parties')
        .select('id, parent_party_id, location_scope')
        .eq('id', fromPartyId)
        .maybeSingle();

    if (!fromParty) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    if (!fromParty.parent_party_id) {
        return NextResponse.json(
            {
                from_party_id: fromPartyId,
                target_scope: null,
                current_affiliation_to_party_id: null,
                can_configure: false,
                eligible_targets: [],
                reason: 'Top-level groups do not affiliate upward.',
            },
            { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
    }

    const { data: currentParent } = await supabase
        .from('parties')
        .select('id, parent_party_id, location_scope')
        .eq('id', fromParty.parent_party_id)
        .maybeSingle();

    if (!currentParent) {
        return NextResponse.json({ error: 'Parent group not found' }, { status: 400 });
    }

    const targetScope = currentParent.location_scope || getBroaderScope(fromParty.location_scope || null);
    if (!targetScope) {
        return NextResponse.json(
            {
                from_party_id: fromPartyId,
                target_scope: null,
                current_affiliation_to_party_id: null,
                can_configure: false,
                eligible_targets: [],
                reason: 'This level has no broader competitive scope.',
            },
            { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
    }

    let eligibleTargetsQuery = supabase
        .from('parties')
        .select('id, issue_text, icon_svg, icon_image_url, member_count, created_at')
        .eq('location_scope', targetScope);

    if (currentParent.parent_party_id) {
        eligibleTargetsQuery = eligibleTargetsQuery.eq('parent_party_id', currentParent.parent_party_id);
    } else {
        eligibleTargetsQuery = eligibleTargetsQuery.is('parent_party_id', null);
    }

    const [{ data: eligibleTargetsRaw }, { data: currentAffiliation }] = await Promise.all([
        eligibleTargetsQuery,
        supabase
            .from('group_affiliations')
            .select('id, to_party_id')
            .eq('from_party_id', fromPartyId)
            .is('withdrawn_at', null)
            .maybeSingle(),
    ]);

    const eligibleTargets = (eligibleTargetsRaw || []) as PartyShape[];

    const isAdmin = !!userContext?.isAdmin;
    let canConfigure = isAdmin;
    if (effectiveUserId) {
        const { data: leaderId } = await supabase.rpc('get_party_leader', { p_party_id: fromPartyId });
        canConfigure = canConfigure || (!!leaderId && leaderId === effectiveUserId);
    }

    const targetIds = (eligibleTargets || []).map((t) => t.id);
    if (targetIds.length === 0) {
        return NextResponse.json(
            {
                from_party_id: fromPartyId,
                target_scope: targetScope,
                current_affiliation_to_party_id: currentAffiliation?.to_party_id || null,
                can_configure: canConfigure,
                eligible_targets: [],
            },
            { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
    }

    const targetSupportCountsResp = await supabase.rpc('get_party_supported_member_counts_batch', { p_party_ids: targetIds });

    const targetSupportCountMap = new Map<string, number>(
        ((targetSupportCountsResp.data as Array<{ party_id: string; member_count: number }> | null) || [])
            .map((row) => [row.party_id, row.member_count])
    );

    // Support score is support-gated membership:
    // own direct members + recursively affiliated supporter memberships.
    const supportScoreMap = new Map<string, number>(
        targetIds.map((targetId) => [targetId, targetSupportCountMap.get(targetId) || 0])
    );

    const sortedTargets = [...eligibleTargets].sort((a, b) => {
        const scoreA = supportScoreMap.get(a.id) || 0;
        const scoreB = supportScoreMap.get(b.id) || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;

        const membersA = (a.member_count || 0);
        const membersB = (b.member_count || 0);
        if (membersA !== membersB) return membersB - membersA;

        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

    const winnerId = sortedTargets[0]?.id || null;

    return NextResponse.json(
        {
            from_party_id: fromPartyId,
            target_scope: targetScope,
            current_affiliation_to_party_id: currentAffiliation?.to_party_id || null,
            can_configure: canConfigure,
            eligible_targets: eligibleTargets.map((target) => ({
                id: target.id,
                issue_text: target.issue_text || '',
                icon_svg: target.icon_svg || null,
                icon_image_url: target.icon_image_url || null,
                member_count: target.member_count || 0,
                support_score: supportScoreMap.get(target.id) || 0,
                is_current: currentAffiliation?.to_party_id === target.id,
                is_winning: winnerId === target.id,
            })),
        },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
}

// POST /api/parties/[id]/affiliation
// Body: { to_party_id: string }
export async function POST(request: NextRequest, { params }: Props) {
    const { id: fromPartyId } = await params;
    const supabase = await createClient();

    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(request, name)
    );

    if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveUserId = userContext.effectiveUserId;
    const isAdmin = userContext.isAdmin;

    let body: { to_party_id?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const toPartyId = (body.to_party_id || '').trim();
    if (!toPartyId) {
        return NextResponse.json({ error: 'to_party_id is required' }, { status: 400 });
    }

    const [{ data: fromParty }, { data: leaderId }] = await Promise.all([
        supabase
            .from('parties')
            .select('id, location_scope, parent_party_id')
            .eq('id', fromPartyId)
            .maybeSingle(),
        supabase.rpc('get_party_leader', { p_party_id: fromPartyId }),
    ]);

    if (!fromParty) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    if (!isAdmin && leaderId !== effectiveUserId) {
        return NextResponse.json({ error: 'Only admins or the current group leader can set affiliation' }, { status: 403 });
    }

    if (!fromParty.parent_party_id) {
        return NextResponse.json({ error: 'Top-level groups cannot affiliate upward' }, { status: 400 });
    }

    const { data: fromParent } = await supabase
        .from('parties')
        .select('id, location_scope')
        .eq('id', fromParty.parent_party_id)
        .maybeSingle();

    const { data: toParty } = await supabase
        .from('parties')
        .select('id, location_scope')
        .eq('id', toPartyId)
        .maybeSingle();

    if (!toParty) {
        return NextResponse.json({ error: 'Target group not found' }, { status: 404 });
    }

    const expectedScope = fromParent?.location_scope || getBroaderScope(fromParty.location_scope || null);
    if (!expectedScope || toParty.location_scope !== expectedScope) {
        return NextResponse.json({ error: `Target must be a ${expectedScope || 'broader-level'} group` }, { status: 400 });
    }

    const writeClient = isAdmin ? createAdminClient() : supabase;

    const { data: activeAffiliation } = await supabase
        .from('group_affiliations')
        .select('id, to_party_id')
        .eq('from_party_id', fromPartyId)
        .is('withdrawn_at', null)
        .maybeSingle();

    if (activeAffiliation?.to_party_id === toPartyId) {
        return NextResponse.json({ success: true, unchanged: true, to_party_id: toPartyId });
    }

    if (activeAffiliation) {
        const { error: updateError } = await writeClient
            .from('group_affiliations')
            .update({ to_party_id: toPartyId, created_by: effectiveUserId, withdrawn_at: null })
            .eq('id', activeAffiliation.id);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, updated: true, to_party_id: toPartyId });
    }

    const { error: insertError } = await writeClient
        .from('group_affiliations')
        .insert({
            from_party_id: fromPartyId,
            to_party_id: toPartyId,
            created_by: effectiveUserId,
        });

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, created: true, to_party_id: toPartyId }, { status: 201 });
}
