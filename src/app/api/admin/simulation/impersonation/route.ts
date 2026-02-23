import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminUserId } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { ADMIN_IMPERSONATION_COOKIE } from '@/lib/effectiveUser';

// GET /api/admin/simulation/impersonation
export async function GET(request: NextRequest) {
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

    const actingAsId = request.cookies.get(ADMIN_IMPERSONATION_COOKIE)?.value || null;
    let actingAs: { id: string; display_name: string } | null = null;

    if (actingAsId) {
        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
            .from('profiles')
            .select('id, display_name')
            .eq('id', actingAsId)
            .maybeSingle();
        if (profile) {
            actingAs = {
                id: profile.id,
                display_name: profile.display_name || 'Anonymous',
            };
        }
    }

    return NextResponse.json({
        adminUserId: user.id,
        actingAs,
    });
}

// POST /api/admin/simulation/impersonation
// Body: { userId: string }
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

    let body: { userId?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const userId = (body.userId || '').trim();
    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: profile, error } = await adminClient
        .from('profiles')
        .select('id, display_name')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!profile) {
        return NextResponse.json({ error: 'Impersonation target not found' }, { status: 404 });
    }

    const response = NextResponse.json({
        success: true,
        actingAs: { id: profile.id, display_name: profile.display_name || 'Anonymous' },
    });
    response.cookies.set(ADMIN_IMPERSONATION_COOKIE, profile.id, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 8,
    });
    return response;
}

// DELETE /api/admin/simulation/impersonation
export async function DELETE() {
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

    const response = NextResponse.json({ success: true, actingAs: null });
    response.cookies.delete(ADMIN_IMPERSONATION_COOKIE);
    return response;
}
