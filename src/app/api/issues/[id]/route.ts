import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/issues/[id] — get issue with its national groups sorted by member count
export async function GET(_request: NextRequest, { params }: RouteContext) {
    const supabase = await createClient();
    const { id } = await params;

    // Fetch the issue
    const { data: issue, error: issueError } = await supabase
        .from('issues')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (issueError) {
        return NextResponse.json({ error: issueError.message }, { status: 500 });
    }
    if (!issue) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // Fetch national groups linked to this issue, with member counts
    const { data: nationalGroups, error: groupsError } = await supabase
        .from('parties_with_member_counts')
        .select('*')
        .eq('issue_id', id)
        .eq('location_scope', 'national')
        .order('member_count', { ascending: false });

    if (groupsError) {
        return NextResponse.json({ error: groupsError.message }, { status: 500 });
    }

    return NextResponse.json({
        issue,
        nationalGroups: nationalGroups || [],
    });
}
