import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

interface Props {
    params: Promise<{ id: string }>;
}

// POST /api/parties/[id]/candidacy — declare candidacy for group leadership
export async function POST(request: NextRequest, { params }: Props) {
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

    // Must be an active member of this group
    const { data: membership } = await supabase
        .from('memberships')
        .select('id')
        .eq('party_id', partyId)
        .eq('user_id', effectiveUserId)
        .is('left_at', null)
        .maybeSingle();

    if (!membership) {
        return NextResponse.json(
            { error: 'You must be a member of this group to declare candidacy.' },
            { status: 403 }
        );
    }

    // Upsert — re-activate if previously withdrawn
    const { data: existing } = await supabase
        .from('candidacies')
        .select('id, withdrawn_at')
        .eq('user_id', effectiveUserId)
        .eq('party_id', partyId)
        .maybeSingle();

    if (existing) {
        if (!existing.withdrawn_at) {
            return NextResponse.json({ declared: true }, { status: 200 });
        }
        const { error } = await supabase
            .from('candidacies')
            .update({ withdrawn_at: null })
            .eq('id', existing.id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ declared: true, reactivated: true }, { status: 200 });
    }

    const { error } = await supabase
        .from('candidacies')
        .insert({ user_id: effectiveUserId, party_id: partyId });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ declared: true }, { status: 201 });
}

// DELETE /api/parties/[id]/candidacy — withdraw candidacy
export async function DELETE(request: NextRequest, { params }: Props) {
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

    const { error } = await supabase
        .from('candidacies')
        .update({ withdrawn_at: new Date().toISOString() })
        .eq('user_id', effectiveUserId)
        .eq('party_id', partyId)
        .is('withdrawn_at', null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ withdrawn: true });
}
