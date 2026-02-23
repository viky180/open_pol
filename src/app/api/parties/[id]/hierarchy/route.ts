import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculatePartyLevel } from '@/types/database';
import type { LocationScope } from '@/types/database';

type HierarchyNode = {
    party_id: string;
    issue_text: string;
    node_type: 'community' | 'sub_community' | 'group';
    location_scope: LocationScope;
    member_count: number;
    aggregated_member_count: number;
    level: 1 | 2 | 3 | 4;
    is_current: boolean;
    children: HierarchyNode[];
};

type AncestorNode = {
    party_id: string;
    issue_text: string;
    node_type: 'community' | 'sub_community' | 'group';
    location_scope: LocationScope;
};

type FlatHierarchyRow = {
    id: string;
    issue_text: string;
    node_type: 'community' | 'sub_community' | 'group' | null;
    parent_party_id: string | null;
    direct_member_count: number | null;
    aggregated_member_count: number | null;
    location_scope: LocationScope | null;
};

// GET /api/parties/[id]/hierarchy - Get full hierarchy tree
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    // Single round-trip RPC (avoids N+1 queries from recursive JS/route logic)
    const { data, error } = await supabase.rpc('get_party_hierarchy_data', {
        p_party_id: id,
    });

    if (error || !data) {
        return NextResponse.json(
            { error: error?.message || 'Failed to load hierarchy' },
            { status: 500 }
        );
    }

    const rootPartyId = data.root_party_id as string;
    const rows = (data.nodes || []) as FlatHierarchyRow[];
    const ancestors = (data.ancestors || []) as AncestorNode[];

    const hierarchy = buildHierarchyTreeFromFlat(rows, rootPartyId, id);

    return NextResponse.json(
        {
            hierarchy,
            ancestors,
            root_party_id: rootPartyId,
            current_party_id: id,
        },
        {
            // Always return fresh hierarchy so newly-created/moved child groups
            // appear immediately in the UI.
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        }
    );
}

function buildHierarchyTreeFromFlat(
    rows: FlatHierarchyRow[],
    rootPartyId: string,
    currentPartyId: string
): HierarchyNode | null {
    if (!rows || rows.length === 0) return null;

    const map = new Map<string, HierarchyNode>();

    for (const row of rows) {
        const directCount = row.direct_member_count || 0;
        const aggregatedCount = row.aggregated_member_count || 0;
        map.set(row.id, {
            party_id: row.id,
            issue_text: row.issue_text,
            node_type: (row.node_type || 'community') as 'community' | 'sub_community' | 'group',
            location_scope: (row.location_scope || 'district') as LocationScope,
            member_count: directCount,
            aggregated_member_count: aggregatedCount,
            level: calculatePartyLevel(aggregatedCount),
            is_current: row.id === currentPartyId,
            children: [],
        });
    }

    // Attach children.
    for (const row of rows) {
        if (!row.parent_party_id) continue;
        const parent = map.get(row.parent_party_id);
        const node = map.get(row.id);
        if (parent && node) {
            parent.children.push(node);
        }
    }

    return map.get(rootPartyId) || null;
}
