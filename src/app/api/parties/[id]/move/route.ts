import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isAdminUserId } from '@/lib/admin';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';
import { getLocationScopeRank } from '@/types/database';

// POST /api/parties/[id]/move - Reparent a node under another node (or detach to root)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(request, name)
    );
    if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveUserId = userContext.effectiveUserId;
    const isAdmin = isAdminUserId(userContext.realUser.id);

    const { data: leaderId, error: leaderError } = await supabase.rpc('get_party_leader', {
        p_party_id: partyId,
    });

    if (leaderError) {
        return NextResponse.json({ error: leaderError.message }, { status: 500 });
    }

    const isLeader = !!leaderId && leaderId === effectiveUserId;
    if (!isLeader && !isAdmin) {
        return NextResponse.json(
            { error: 'Only the group leader or an admin can move or detach this group' },
            { status: 403 }
        );
    }

    const body = await request.json();
    const parentPartyId = body.parent_party_id as string | null | undefined;

    if (parentPartyId && parentPartyId === partyId) {
        return NextResponse.json({ error: 'Cannot move a group under itself' }, { status: 400 });
    }

    if (parentPartyId) {
        const { data: wouldCycle } = await supabase.rpc('check_party_cycle', {
            child_id: partyId,
            parent_id: parentPartyId,
        });

        if (wouldCycle) {
            return NextResponse.json({ error: 'Cannot move under a descendant (cycle detected)' }, { status: 400 });
        }
    }

    const [{ data: currentParty }, { data: parentParty }] = await Promise.all([
        supabase
            .from('parties')
            .select('parent_party_id, node_type, location_scope')
            .eq('id', partyId)
            .maybeSingle(),
        parentPartyId
            ? supabase
                .from('parties')
                .select('id, node_type, location_scope')
                .eq('id', parentPartyId)
                .maybeSingle()
            : Promise.resolve({ data: null as { id: string; node_type: string; location_scope: string } | null }),
    ]);

    if (!currentParty) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    if (parentPartyId && !parentParty) {
        return NextResponse.json({ error: 'Parent party not found' }, { status: 404 });
    }

    // Validate location scope: child scope must be equal or narrower than parent
    if (parentPartyId && parentParty && currentParty) {
        const childRank = getLocationScopeRank(currentParty.location_scope || 'district');
        const parentRank = getLocationScopeRank(parentParty.location_scope || 'district');
        if (childRank < parentRank) {
            return NextResponse.json(
                { error: 'Cannot move under a parent with a narrower location scope' },
                { status: 400 }
            );
        }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json(
            { error: 'Server is missing Supabase service role configuration' },
            { status: 500 }
        );
    }

    // Authorization is enforced above (leader or admin).
    // We use service role for the write to bypass restrictive table-level RLS update policies.
    const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey);

    // If a detached top-level community is being attached under a group,
    // first promote that parent group to sub_community so the child can attach
    // as sub_community under a valid parent type.
    if (
        parentPartyId &&
        parentParty?.node_type === 'group' &&
        currentParty?.node_type === 'community' &&
        !currentParty?.parent_party_id
    ) {
        const { error: promoteParentError } = await supabaseAdmin
            .from('parties')
            .update({ node_type: 'sub_community' })
            .eq('id', parentPartyId);

        if (promoteParentError) {
            return NextResponse.json({ error: promoteParentError.message }, { status: 500 });
        }
    }

    const nextNodeType = parentPartyId
        ? (currentParty?.node_type === 'community' ? 'sub_community' : currentParty?.node_type || 'group')
        : 'community';

    const { data, error } = await supabaseAdmin
        .from('parties')
        .update({
            parent_party_id: parentPartyId || null,
            node_type: nextNodeType,
        })
        .eq('id', partyId)
        .select('id, parent_party_id, node_type')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        party: data,
    });
}
