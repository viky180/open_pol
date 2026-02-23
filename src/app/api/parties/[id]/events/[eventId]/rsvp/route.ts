import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Props {
    params: Promise<{ id: string; eventId: string }>;
}

// POST /api/parties/[id]/events/[eventId]/rsvp
export async function POST(request: NextRequest, { params }: Props) {
    const { id: partyId, eventId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [{ data: membership }, { data: event }] = await Promise.all([
        supabase
            .from('memberships')
            .select('id')
            .eq('party_id', partyId)
            .eq('user_id', user.id)
            .is('left_at', null)
            .maybeSingle(),
        supabase
            .from('campaign_events')
            .select('id')
            .eq('id', eventId)
            .eq('party_id', partyId)
            .maybeSingle(),
    ]);

    if (!membership) {
        return NextResponse.json({ error: 'Must be a member to RSVP' }, { status: 403 });
    }

    if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    let body: { status?: 'yes' | 'maybe' | 'no' };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const status = body.status;
    if (!status || !['yes', 'maybe', 'no'].includes(status)) {
        return NextResponse.json({ error: 'status must be one of yes, maybe, no' }, { status: 400 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('pincode')
        .eq('id', user.id)
        .maybeSingle();

    const { data, error } = await supabase
        .from('event_rsvps')
        .upsert(
            {
                event_id: eventId,
                user_id: user.id,
                status,
                user_pincode_snapshot: profile?.pincode || null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'event_id,user_id' }
        )
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
