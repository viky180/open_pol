import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { calculatePartyLevel } from '@/types/database';

export type GraphNode = {
    id: string;
    label: string;
    level: 1 | 2 | 3 | 4;
    memberCount: number;
};

export type GraphLink = {
    source: string;
    target: string;
    type: 'support' | 'hierarchy';
    supportType?: 'explicit' | 'implicit';
};

export type NetworkGraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
};

// GET /api/network-graph - Fetch all parties and their connections
export async function GET() {
    const supabase = await createClient();

    // Fetch all parties
    const { data: parties, error: partiesError } = await supabase
        .from('parties')
        .select('*');

    if (partiesError) {
        return NextResponse.json({ error: partiesError.message }, { status: 500 });
    }

    // Fetch member counts for all parties
    const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('party_id')
        .is('left_at', null);

    if (membershipsError) {
        return NextResponse.json({ error: membershipsError.message }, { status: 500 });
    }

    // Count members per party
    const memberCounts = new Map<string, number>();
    (memberships || []).forEach(m => {
        memberCounts.set(m.party_id, (memberCounts.get(m.party_id) || 0) + 1);
    });



    // Fetch party supports (not expired)
    const { data: supports, error: supportsError } = await supabase
        .from('party_supports')
        .select('from_party_id, to_party_id, support_type')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (supportsError) {
        return NextResponse.json({ error: supportsError.message }, { status: 500 });
    }

    // Fetch hierarchy links from tree model
    const { data: hierarchyRows, error: hierarchyError } = await supabase
        .from('parties')
        .select('id, parent_party_id')
        .not('parent_party_id', 'is', null);

    if (hierarchyError) {
        return NextResponse.json({ error: hierarchyError.message }, { status: 500 });
    }

    // Build nodes
    const nodes: GraphNode[] = (parties || []).map(party => {
        const memberCount = memberCounts.get(party.id) || 0;
        const issueText = typeof party.issue_text === 'string' && party.issue_text.trim().length > 0
            ? party.issue_text
            : 'Untitled party';
        return {
            id: party.id,
            label: issueText.length > 50
                ? issueText.slice(0, 50) + '...'
                : issueText,
            level: calculatePartyLevel(memberCount),
            memberCount,
        };
    });

    const links: GraphLink[] = [];



    // Build support links
    (supports || []).forEach(s => {
        links.push({
            source: s.from_party_id,
            target: s.to_party_id,
            type: 'support',
            supportType: s.support_type as 'explicit' | 'implicit',
        });
    });

    // Build hierarchy links
    (hierarchyRows || []).forEach(m => {
        if (!m.parent_party_id) return;
        links.push({
            source: m.parent_party_id,
            target: m.id,
            type: 'hierarchy',
        });
    });

    const data: NetworkGraphData = { nodes, links };
    return NextResponse.json(data);
}
