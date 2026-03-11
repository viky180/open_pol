import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type LocationBody = {
    display_name?: string;
    pincode?: string;
    country?: string;
    state?: string;
    area_type?: 'urban' | 'rural';
    city?: string;
    corporation?: string;
    ward?: string;
    locality?: string;
    district?: string;
    block?: string;
    panchayat?: string;
    village?: string;
    lat?: number;
    lng?: number;
    gps_label?: string;
};

export async function PATCH(request: Request) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as LocationBody;
    const updates: Record<string, unknown> = {};

    if (typeof body.display_name === 'string') {
        const trimmed = body.display_name.trim();
        if (trimmed.length === 0) {
            return NextResponse.json({ error: 'Display name cannot be empty' }, { status: 400 });
        }
        if (trimmed.length > 100) {
            return NextResponse.json({ error: 'Display name is too long' }, { status: 400 });
        }
        updates.display_name = trimmed;
    }

    if (typeof body.pincode === 'string') {
        const cleaned = body.pincode.replace(/\D/g, '');
        if (cleaned.length > 0 && cleaned.length !== 6) {
            return NextResponse.json({ error: 'Pincode must be exactly 6 digits' }, { status: 400 });
        }
        if (cleaned.length === 6) {
            updates.pincode = cleaned;
        }
    }

    // Location text fields (allow explicit null to clear stale values)
    for (const field of ['country', 'state', 'area_type', 'city', 'corporation', 'ward', 'locality', 'district', 'block', 'panchayat', 'village', 'gps_label'] as const) {
        if (body[field] === null) {
            updates[field] = null;
            continue;
        }
        if (typeof body[field] === 'string' && (body[field] as string).trim().length > 0) {
            updates[field] = (body[field] as string).trim();
        }
    }

    // GPS coordinates
    if (typeof body.lat === 'number') updates.lat = body.lat;
    if (typeof body.lng === 'number') updates.lng = body.lng;

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}

export async function GET() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, pincode, country, state, area_type, city, corporation, ward, locality, district, block, panchayat, village, lat, lng, gps_label')
        .eq('id', user.id)
        .maybeSingle();

    return NextResponse.json({
        display_name: profile?.display_name || user.user_metadata?.full_name || '',
        pincode: profile?.pincode || '',
        country: profile?.country || 'India',
        state: profile?.state || null,
        area_type: profile?.area_type || null,
        city: profile?.city || null,
        corporation: profile?.corporation || null,
        ward: profile?.ward || null,
        locality: profile?.locality || null,
        district: profile?.district || null,
        block: profile?.block || null,
        panchayat: profile?.panchayat || null,
        village: profile?.village || null,
        lat: profile?.lat || null,
        lng: profile?.lng || null,
        gps_label: profile?.gps_label || null,
    });
}
