import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

interface Props {
    params: Promise<{ id: string }>;
}

// POST /api/parties/[id]/nominate — self-nominate for parent group leadership
export async function POST(request: NextRequest, { params }: Props) {
    const { id: toPartyId } = await params;
    const supabase = await createClient();

    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(request, name)
    );
    if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const effectiveUserId = userContext.effectiveUserId;

    // Find child sub-groups of the target parent
    const { data: childParties } = await supabase
        .from('parties')
        .select('id')
        .eq('parent_party_id', toPartyId);

    const childPartyIds = (childParties || []).map(p => p.id);

    if (childPartyIds.length === 0) {
        return NextResponse.json(
            { error: 'This group has no sub-groups. Only sub-group leaders can self-nominate.' },
            { status: 400 }
        );
    }

    // Check the user is the leader of one of the child sub-groups
    let leadingSubgroupId: string | null = null;
    for (const childId of childPartyIds) {
        const { data: leaderId } = await supabase.rpc('get_party_leader', {
            p_party_id: childId,
        });
        if (leaderId === effectiveUserId) {
            leadingSubgroupId = childId;
            break;
        }
    }

    if (!leadingSubgroupId) {
        return NextResponse.json(
            { error: 'You must be the leader of a sub-group to nominate yourself.' },
            { status: 403 }
        );
    }

    // Upsert nomination (re-activate if previously withdrawn)
    const { data: existing } = await supabase
        .from('leader_nominations')
        .select('id, withdrawn_at')
        .eq('user_id', effectiveUserId)
        .eq('to_party_id', toPartyId)
        .maybeSingle();

    if (existing) {
        // Re-activate if withdrawn, or no-op if already active
        const { error } = await supabase
            .from('leader_nominations')
            .update({ withdrawn_at: null })
            .eq('id', existing.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ nominated: true, reactivated: !!existing.withdrawn_at }, { status: 200 });
    }

    // Insert new nomination
    const { error } = await supabase
        .from('leader_nominations')
        .insert({
            user_id: effectiveUserId,
            from_party_id: leadingSubgroupId,
            to_party_id: toPartyId,
        });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ nominated: true }, { status: 201 });
}

// DELETE /api/parties/[id]/nominate — withdraw self-nomination
export async function DELETE(request: NextRequest, { params }: Props) {
    const { id: toPartyId } = await params;
    const supabase = await createClient();

    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(request, name)
    );
    if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const effectiveUserId = userContext.effectiveUserId;

    const { error } = await supabase
        .from('leader_nominations')
        .update({ withdrawn_at: new Date().toISOString() })
        .eq('user_id', effectiveUserId)
        .eq('to_party_id', toPartyId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ withdrawn: true });
}
