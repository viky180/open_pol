import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

interface Props {
    params: Promise<{ id: string }>;
}

// POST /api/parties/[id]/trust - Give trust vote
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

    const body = await request.json();
    const { to_user_id } = body;

    if (!to_user_id) {
        return NextResponse.json({ error: 'to_user_id is required' }, { status: 400 });
    }

    // Check if voter is a direct member OR a sub-group member
    const { data: membership } = await supabase
        .from('memberships')
        .select('id')
        .eq('party_id', id)
        .eq('user_id', effectiveUserId)
        .is('left_at', null)
        .maybeSingle();

    if (!membership) {
        // Check if voter is a member of any child sub-group
        const { data: childParties } = await supabase
            .from('parties')
            .select('id')
            .eq('parent_party_id', id);

        const childPartyIds = (childParties || []).map(p => p.id);
        let isSubgroupMember = false;

        if (childPartyIds.length > 0) {
            const { data: subgroupMembership } = await supabase
                .from('memberships')
                .select('id')
                .in('party_id', childPartyIds)
                .eq('user_id', effectiveUserId)
                .is('left_at', null)
                .maybeSingle();

            isSubgroupMember = !!subgroupMembership;
        }

        if (!isSubgroupMember) {
            return NextResponse.json({ error: 'Must be a member of this group or a sub-group to vote' }, { status: 403 });
        }
    }

    // Verify candidate is eligible: either a direct member OR a self-nominated sub-group leader
    const { data: candidateMembership } = await supabase
        .from('memberships')
        .select('id')
        .eq('party_id', id)
        .eq('user_id', to_user_id)
        .is('left_at', null)
        .maybeSingle();

    if (!candidateMembership) {
        // Check if candidate has an active self-nomination for this parent group
        const { data: nomination } = await supabase
            .from('leader_nominations')
            .select('id')
            .eq('user_id', to_user_id)
            .eq('to_party_id', id)
            .is('withdrawn_at', null)
            .maybeSingle();

        if (!nomination) {
            return NextResponse.json(
                { error: 'Candidate must be a member of this group or a self-nominated sub-group leader' },
                { status: 400 }
            );
        }
    }

    // Remove any existing vote
    await supabase
        .from('trust_votes')
        .delete()
        .eq('party_id', id)
        .eq('from_user_id', effectiveUserId);

    // Give new vote
    const { data, error } = await supabase
        .from('trust_votes')
        .insert({
            party_id: id,
            from_user_id: effectiveUserId,
            to_user_id
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}

// DELETE /api/parties/[id]/trust - Withdraw trust vote
export async function DELETE(request: NextRequest, { params }: Props) {
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

    await supabase
        .from('trust_votes')
        .delete()
        .eq('party_id', id)
        .eq('from_user_id', effectiveUserId);

    return NextResponse.json({ success: true });
}
