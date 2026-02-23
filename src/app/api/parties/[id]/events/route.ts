import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

interface Props {
    params: Promise<{ id: string }>;
}

// GET /api/parties/[id]/events
export async function GET(_request: NextRequest, { params }: Props) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('campaign_events')
        .select('*')
        .eq('party_id', partyId)
        .order('starts_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
}

// POST /api/parties/[id]/events
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
        return NextResponse.json({ error: 'Only the party leader can create events' }, { status: 403 });
    }

    let body: {
        event_type?: 'rally' | 'rti_drive' | 'public_hearing' | 'other';
        title?: string;
        description?: string;
        venue_name?: string;
        address?: string;
        lat?: number | null;
        lng?: number | null;
        reminder_pincodes?: string[];
        starts_at?: string;
        ends_at?: string | null;
    };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const eventType = body.event_type;
    const title = (body.title || '').trim();
    const startsAt = body.starts_at ? new Date(body.starts_at) : null;
    const endsAt = body.ends_at ? new Date(body.ends_at) : null;
    const validTypes = new Set(['rally', 'rti_drive', 'public_hearing', 'other']);

    if (!eventType || !validTypes.has(eventType) || !title || !startsAt) {
        return NextResponse.json(
            { error: 'event_type, title and starts_at are required' },
            { status: 400 }
        );
    }

    if (endsAt && endsAt < startsAt) {
        return NextResponse.json({ error: 'ends_at must be after starts_at' }, { status: 400 });
    }

    const reminderPincodes = (body.reminder_pincodes || []).filter(Boolean);

    const { data, error } = await supabase
        .from('campaign_events')
        .insert({
            party_id: partyId,
            created_by: effectiveUserId,
            event_type: eventType,
            title,
            description: (body.description || '').trim() || null,
            venue_name: (body.venue_name || '').trim() || null,
            address: (body.address || '').trim() || null,
            lat: body.lat ?? null,
            lng: body.lng ?? null,
            reminder_pincodes: reminderPincodes,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt ? endsAt.toISOString() : null,
        })
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
        const { sendNotificationToPartyMembers } = await import('@/lib/push/server');
        await sendNotificationToPartyMembers(partyId, {
            title: `📅 New ${eventType.replace('_', ' ')} event`,
            body: `${title} has been scheduled. RSVP now for location-based reminders.`,
            icon: '/favicon.ico',
            url: `/party/${partyId}`,
        });
    } catch {
        // best effort only
    }

    return NextResponse.json(data, { status: 201 });
}
