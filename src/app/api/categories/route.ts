import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminUserId } from '@/lib/admin';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// GET /api/categories - List all categories
export async function GET() {
    const supabase = await createServerClient();

    const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(categories || []);
}

// POST /api/categories - Create a category (admin only)
export async function POST(request: NextRequest) {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminUserId(user.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
        return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json(
            { error: 'Server is missing Supabase service role configuration' },
            { status: 500 }
        );
    }

    // Use service role for category creation so RLS does not block admin-only inserts.
    // Authorization is enforced above via isAdminUserId(user.id).
    const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey);

    const { data: category, error } = await supabaseAdmin
        .from('categories')
        .insert({ name, slug })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(category, { status: 201 });
}