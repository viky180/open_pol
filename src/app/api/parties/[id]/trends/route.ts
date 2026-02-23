import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/parties/[id]/trends — Trend history for a specific party
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[period] || 30;

    const supabase = await createClient();

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all snapshots for this party within the period
    const { data: snapshots, error } = await supabase
        .from('party_snapshots')
        .select('member_count, supporter_count, like_count, recorded_at')
        .eq('party_id', id)
        .gte('recorded_at', cutoff)
        .order('recorded_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const history = snapshots || [];

    // Compute change
    let member_change_pct = 0;
    let supporter_change_pct = 0;
    let like_change_pct = 0;

    if (history.length >= 2) {
        const first = history[0];
        const last = history[history.length - 1];

        member_change_pct = first.member_count > 0
            ? Math.round(((last.member_count - first.member_count) / first.member_count) * 1000) / 10
            : (last.member_count > 0 ? 100 : 0);

        supporter_change_pct = first.supporter_count > 0
            ? Math.round(((last.supporter_count - first.supporter_count) / first.supporter_count) * 1000) / 10
            : (last.supporter_count > 0 ? 100 : 0);

        like_change_pct = first.like_count > 0
            ? Math.round(((last.like_count - first.like_count) / first.like_count) * 1000) / 10
            : (last.like_count > 0 ? 100 : 0);
    }

    return NextResponse.json({
        party_id: id,
        period,
        days,
        history: history.map(s => ({
            date: s.recorded_at,
            member_count: s.member_count,
            supporter_count: s.supporter_count,
            like_count: s.like_count,
        })),
        summary: {
            member_change_pct,
            supporter_change_pct,
            like_change_pct,
            current_members: history.length > 0 ? history[history.length - 1].member_count : 0,
            data_points: history.length,
        },
    });
}
