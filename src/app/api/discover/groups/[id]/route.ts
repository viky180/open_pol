import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Party } from '@/types/database';
import type { HierarchyChild } from '@/types/discover';

type RpcNodeRow = {
    id: string;
    issue_text: string;
    node_type: 'community' | 'sub_community' | 'group' | null;
    parent_party_id: string | null;
    member_count?: number | null;
    direct_member_count?: number | null;
    aggregated_member_count?: number | null;
};

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: hierarchyRpcData, error: hierarchyError } = await supabase.rpc('get_party_hierarchy_data', {
        p_party_id: id,
    });

    if (hierarchyError) {
        return NextResponse.json({ error: hierarchyError.message }, { status: 500 });
    }

    const rows = ((hierarchyRpcData?.nodes || []) as RpcNodeRow[]);
    const rootPartyId = (hierarchyRpcData?.root_party_id as string | undefined) || id;
    const rowIds = rows.map((row) => row.id);

    const { data: fullPartyRows } = rowIds.length > 0
        ? await supabase
            .from('parties_with_member_counts')
            .select('*')
            .in('id', rowIds)
        : { data: [] as Party[] };

    const partyById = new Map<string, Party>();
    (fullPartyRows || []).forEach((party) => {
        partyById.set(party.id, party as Party);
    });

    const memberCountById = new Map<string, number>();
    rows.forEach((row) => {
        memberCountById.set(
            row.id,
            row.aggregated_member_count
            ?? row.member_count
            ?? row.direct_member_count
            ?? 0,
        );
    });

    const childrenByParentId = new Map<string, RpcNodeRow[]>();
    rows.forEach((row) => {
        if (!row.parent_party_id) return;
        const bucket = childrenByParentId.get(row.parent_party_id) || [];
        bucket.push(row);
        childrenByParentId.set(row.parent_party_id, bucket);
    });

    const buildChildren = (partyId: string): HierarchyChild[] => {
        const directChildren = childrenByParentId.get(partyId) || [];

        return directChildren.map((row) => {
            const fallbackParty: Party = {
                id: row.id,
                created_at: '',
                issue_text: row.issue_text,
                pincodes: [],
                created_by: null,
                updated_at: null,
                parent_party_id: row.parent_party_id,
                node_type: row.node_type || 'group',
            };

            const party = partyById.get(row.id) || fallbackParty;
            const nestedChildren = buildChildren(row.id);
            return {
                party,
                memberCount: memberCountById.get(row.id) || 0,
                ...(nestedChildren.length > 0 ? { children: nestedChildren } : {}),
            };
        });
    };

    const children = buildChildren(rootPartyId);

    return NextResponse.json(
        {
            children,
        },
        {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
            },
        },
    );
}
