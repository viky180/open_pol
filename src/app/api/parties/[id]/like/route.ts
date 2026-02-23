import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface Props {
    params: Promise<{ id: string }>;
}

// POST /api/parties/[id]/like - Like a party (non-exclusive)
export async function POST(_request: Request, { params }: Props) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('party_likes')
        .insert({ party_id: partyId, user_id: user.id })
        .select()
        .maybeSingle();

    // Unique violation => already liked; treat as success
    if (error && (error as { code?: string }).code !== '23505') {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? null }, { status: 201 });
}

// DELETE /api/parties/[id]/like - Unlike a party
export async function DELETE(_request: Request, { params }: Props) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
        .from('party_likes')
        .delete()
        .eq('party_id', partyId)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
