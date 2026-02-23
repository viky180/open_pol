import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

interface Props {
    params: Promise<{ id: string }>;
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

    // Enforce single active membership across parties
    const { data: activeMembership } = await supabase
        .from('memberships')
        .select('party_id')
        .eq('user_id', effectiveUserId)
        .is('left_at', null)
        .maybeSingle();

    if (activeMembership) {
        return NextResponse.json(
            { error: 'You can be part of only one group at a time. Leave your current group first. You can still like parties to show interest.' },
            { status: 400 }
        );
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

        return NextResponse.json(data, { status: 200 });
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

    return NextResponse.json(data, { status: 201 });
}
