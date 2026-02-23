import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type TrendPeriod = '7d' | '30d' | '90d';

const PERIOD_DAYS: Record<TrendPeriod, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
};

// GET /api/trends — Platform-wide trend data
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || '7d') as TrendPeriod;
    const days = PERIOD_DAYS[period] || 7;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    const supabase = await createClient();

    // Date boundaries
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const cutoffISO = cutoff.toISOString();

    // 1. Get the most recent snapshot per party (latest)
    const { data: latestSnapshots, error: latestErr } = await supabase
        .from('party_snapshots')
        .select('party_id, member_count, supporter_count, like_count, recorded_at')
        .order('recorded_at', { ascending: false });

    if (latestErr) {
        return NextResponse.json({ error: latestErr.message }, { status: 500 });
    }

    // 2. Get the oldest snapshot per party within the period (baseline)
    const { data: baselineSnapshots, error: baselineErr } = await supabase
        .from('party_snapshots')
        .select('party_id, member_count, supporter_count, like_count, recorded_at')
        .gte('recorded_at', cutoffISO)
        .order('recorded_at', { ascending: true });

    if (baselineErr) {
        return NextResponse.json({ error: baselineErr.message }, { status: 500 });
    }

    // Deduplicate: keep first (latest for desc, oldest for asc) per party_id
    const latestByParty = deduplicateByParty(latestSnapshots || []);
    const baselineByParty = deduplicateByParty(baselineSnapshots || []);

    // 3. Compute deltas
    type TrendItem = {
        party_id: string;
        current_members: number;
        previous_members: number;
        member_change: number;
        member_change_pct: number;
        current_supporters: number;
        current_likes: number;
    };

    const trends: TrendItem[] = [];

    for (const [partyId, latest] of latestByParty.entries()) {
        const baseline = baselineByParty.get(partyId);
        const prevMembers = baseline ? baseline.member_count : latest.member_count;
        const change = latest.member_count - prevMembers;
        const changePct = prevMembers > 0
            ? Math.round((change / prevMembers) * 1000) / 10
            : (change > 0 ? 100 : 0);

        trends.push({
            party_id: partyId,
            current_members: latest.member_count,
            previous_members: prevMembers,
            member_change: change,
            member_change_pct: changePct,
            current_supporters: latest.supporter_count,
            current_likes: latest.like_count,
        });
    }

    // 4. Sort to find top gainers and losers
    const sorted = [...trends].sort((a, b) => b.member_change_pct - a.member_change_pct);
    const gainers = sorted.filter(t => t.member_change > 0).slice(0, limit);
    const losers = sorted.filter(t => t.member_change < 0).reverse().slice(0, limit);

    // 5. Fetch party details for all referenced parties
    const allPartyIds = [...new Set([
        ...gainers.map(g => g.party_id),
        ...losers.map(l => l.party_id),
    ])];

    const { data: parties } = await supabase
        .from('parties')
        .select('id, issue_text, node_type, location_scope, category_id')
        .in('id', allPartyIds.length > 0 ? allPartyIds : ['00000000-0000-0000-0000-000000000000']);

    const partyMap = new Map((parties || []).map(p => [p.id, p]));

    const enrich = (items: TrendItem[]) =>
        items.map(t => ({
            ...t,
            issue_text: partyMap.get(t.party_id)?.issue_text || 'Unknown',
            node_type: partyMap.get(t.party_id)?.node_type || 'community',
            location_scope: partyMap.get(t.party_id)?.location_scope || 'district',
        }));

    // 6. Platform totals
    const totalMembers = trends.reduce((sum, t) => sum + t.current_members, 0);
    const prevTotalMembers = trends.reduce((sum, t) => sum + t.previous_members, 0);
    const overallChange = prevTotalMembers > 0
        ? Math.round(((totalMembers - prevTotalMembers) / prevTotalMembers) * 1000) / 10
        : 0;

    return NextResponse.json({
        period,
        days,
        platform: {
            total_groups: trends.length,
            total_members: totalMembers,
            previous_total_members: prevTotalMembers,
            overall_change_pct: overallChange,
        },
        gainers: enrich(gainers),
        losers: enrich(losers),
    });
}

type SnapshotRow = {
    party_id: string;
    member_count: number;
    supporter_count: number;
    like_count: number;
    recorded_at: string;
};

function deduplicateByParty(rows: SnapshotRow[]): Map<string, SnapshotRow> {
    const map = new Map<string, SnapshotRow>();
    for (const row of rows) {
        if (!map.has(row.party_id)) {
            map.set(row.party_id, row);
        }
    }
    return map;
}
