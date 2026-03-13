import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/issues — list issues with national group count
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const q = searchParams.get('q') || '';
    const categoryId = searchParams.get('category_id') || '';
    const idsParam = searchParams.get('ids') || '';
    const ids = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : [];

    let query = supabase
        .from('issues')
        .select('*, parties!issue_id(count)', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

    if (ids.length > 0) {
        query = query.in('id', ids);
    }

    if (q) {
        query = query.ilike('issue_text', `%${q}%`);
    }

    if (categoryId) {
        query = query.eq('category_id', categoryId);
    }

    const { data, error, count } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the count from the nested relation
    const issues = (data || []).map((row: Record<string, unknown>) => {
        const partiesData = row.parties as { count: number }[] | null;
        const national_group_count =
            Array.isArray(partiesData) && partiesData.length > 0
                ? (partiesData[0].count ?? 0)
                : 0;
        const { parties: _parties, ...rest } = row;
        void _parties;
        return { ...rest, national_group_count };
    });

    return NextResponse.json({ issues, total: count ?? 0 });
}

// POST /api/issues — create a new issue
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { issue_text, category_id } = body;

    if (!issue_text || typeof issue_text !== 'string' || issue_text.trim().length === 0) {
        return NextResponse.json({ error: 'issue_text is required' }, { status: 400 });
    }
    if (issue_text.trim().length > 280) {
        return NextResponse.json({ error: 'issue_text must be 280 characters or less' }, { status: 400 });
    }

    const { data: issue, error } = await supabase
        .from('issues')
        .insert({
            issue_text: issue_text.trim(),
            category_id: category_id || null,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { error: foundingGroupError } = await supabase
        .from('parties')
        .insert({
            issue_text: 'Founding group',
            pincodes: [],
            category_id: issue.category_id || null,
            created_by: user.id,
            issue_id: issue.id,
            node_type: 'community',
            location_scope: 'national',
            location_label: 'India',
            is_founding_group: true,
        });

    if (foundingGroupError) {
        return NextResponse.json({ error: foundingGroupError.message }, { status: 500 });
    }

    return NextResponse.json(issue, { status: 201 });
}
