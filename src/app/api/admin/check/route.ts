import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdminUserId } from '@/lib/admin';

// GET /api/admin/check - Verify admin access
export async function GET() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminUserId(user.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ isAdmin: true });
}