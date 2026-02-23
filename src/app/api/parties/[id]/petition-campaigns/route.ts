import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

interface Props {
    params: Promise<{ id: string }>;
}

// GET /api/parties/[id]/petition-campaigns
export async function GET(_request: NextRequest, { params }: Props) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('petition_campaigns')
        .select('*')
        .eq('party_id', partyId)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
}

// POST /api/parties/[id]/petition-campaigns
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

    const { data: leaderId } = await supabase.rpc('get_party_leader', { p_party_id: partyId });
    if (leaderId !== effectiveUserId) {
        return NextResponse.json({ error: 'Only the party leader can create petition campaigns' }, { status: 403 });
    }

    let body: {
        title?: string;
        description?: string;
        authority_name?: string;
        authority_email?: string;
        target_signatures?: number;
        starts_at?: string;
        ends_at?: string;
        auto_send_enabled?: boolean;
    };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const title = (body.title || '').trim();
    const description = (body.description || '').trim();
    const targetSignatures = Number(body.target_signatures || 0);
    const startsAt = body.starts_at ? new Date(body.starts_at) : new Date();
    const endsAt = body.ends_at ? new Date(body.ends_at) : null;

    if (!title || !description || !targetSignatures || !endsAt) {
        return NextResponse.json(
            { error: 'title, description, target_signatures and ends_at are required' },
            { status: 400 }
        );
    }

    if (!Number.isFinite(targetSignatures) || targetSignatures < 1) {
        return NextResponse.json({ error: 'target_signatures must be a positive number' }, { status: 400 });
    }

    if (endsAt <= startsAt) {
        return NextResponse.json({ error: 'ends_at must be later than starts_at' }, { status: 400 });
    }

    const authorityEmail = (body.authority_email || '').trim();
    if (authorityEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(authorityEmail)) {
            return NextResponse.json({ error: 'Invalid authority_email format' }, { status: 400 });
        }
    }

    const { data, error } = await supabase
        .from('petition_campaigns')
        .insert({
            party_id: partyId,
            created_by: effectiveUserId,
            title,
            description,
            authority_name: (body.authority_name || '').trim() || null,
            authority_email: authorityEmail || null,
            target_signatures: targetSignatures,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            auto_send_enabled: body.auto_send_enabled ?? true,
            status: 'active',
        })
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
