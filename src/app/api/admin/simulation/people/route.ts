import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminUserId } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

function randomPassword(length = 20) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let out = '';
    for (let i = 0; i < length; i += 1) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

// POST /api/admin/simulation/people
// Body: { partyId: string, names?: string[], count?: number, prefix?: string, pincode?: string }
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminUserId(user.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: { partyId?: string; names?: string[]; count?: number; prefix?: string; pincode?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const partyId = (body.partyId || '').trim();
    const names = Array.isArray(body.names)
        ? body.names.map((name) => String(name || '').trim()).filter(Boolean)
        : [];
    const count = Number(body.count || 0);
    const prefix = (body.prefix || 'Demo Person').trim() || 'Demo Person';
    const pincode = (body.pincode || '').trim() || null;

    if (!partyId) {
        return NextResponse.json({ error: 'partyId is required' }, { status: 400 });
    }
    if (names.length > 10) {
        return NextResponse.json({ error: 'names can have at most 10 entries' }, { status: 400 });
    }

    if (names.length === 0 && (!Number.isInteger(count) || count < 1 || count > 100)) {
        return NextResponse.json({ error: 'Provide names (up to 10) or count between 1 and 100' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: party, error: partyError } = await adminClient
        .from('parties')
        .select('id, pincodes')
        .eq('id', partyId)
        .maybeSingle();

    if (partyError) {
        return NextResponse.json({ error: partyError.message }, { status: 500 });
    }
    if (!party) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const fallbackPincode = pincode || party.pincodes?.[0] || null;
    const created: Array<{ id: string; display_name: string; email: string }> = [];

    const displayNames = names.length > 0
        ? names
        : Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);

    for (let i = 0; i < displayNames.length; i += 1) {
        const serial = `${Date.now()}-${Math.floor(Math.random() * 100000)}-${i + 1}`;
        const displayName = displayNames[i];
        const email = `openpolitics.fake+${serial}@example.com`;

        const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
            email,
            password: randomPassword(),
            email_confirm: true,
            user_metadata: {
                display_name: displayName,
                full_name: displayName,
            },
        });

        if (createUserError || !createdUser?.user) {
            return NextResponse.json(
                { error: createUserError?.message || 'Failed to create fake user' },
                { status: 500 }
            );
        }

        const userId = createdUser.user.id;

        await adminClient
            .from('profiles')
            .update({
                display_name: displayName,
                pincode: fallbackPincode,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

        const { error: membershipError } = await adminClient.from('memberships').insert({
            party_id: partyId,
            user_id: userId,
        });

        if (membershipError) {
            return NextResponse.json({ error: membershipError.message }, { status: 500 });
        }

        created.push({ id: userId, display_name: displayName, email });
    }

    return NextResponse.json({
        createdCount: created.length,
        people: created,
    });
}
