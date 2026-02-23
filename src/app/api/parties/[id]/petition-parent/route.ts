import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface Props {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/parties/[id]/petition-parent
 * List petitions sent FROM this party to its parent, or sent TO this party from children.
 */
export async function GET(_req: Request, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch petitions where this party is either the sender or receiver
    const { data, error } = await supabase
        .from('parent_petitions')
        .select('*')
        .or(`from_party_id.eq.${id},to_party_id.eq.${id}`)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
}

/**
 * POST /api/parties/[id]/petition-parent
 * Create a new petition from this party to its parent.
 * Only the leader of this party can create petitions.
 */
export async function POST(req: Request, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify this party exists and has a parent
    const { data: party, error: partyError } = await supabase
        .from('parties')
        .select('id, parent_party_id')
        .eq('id', id)
        .single();

    if (partyError || !party) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    if (!party.parent_party_id) {
        return NextResponse.json({ error: 'This group has no parent to petition' }, { status: 400 });
    }

    // Verify the user is the leader of this party (most trust votes)
    const { data: trustVotes } = await supabase
        .from('trust_votes')
        .select('to_user_id')
        .eq('party_id', id)
        .gt('expires_at', new Date().toISOString());

    const voteCounts: Record<string, number> = {};
    (trustVotes || []).forEach((v) => {
        voteCounts[v.to_user_id] = (voteCounts[v.to_user_id] || 0) + 1;
    });

    let leaderId: string | null = null;
    let maxVotes = 0;
    Object.entries(voteCounts).forEach(([userId, count]) => {
        if (count > maxVotes) {
            maxVotes = count;
            leaderId = userId;
        }
    });

    if (leaderId !== user.id) {
        return NextResponse.json({ error: 'Only the group leader can petition the parent' }, { status: 403 });
    }

    // Parse body
    const body = await req.json();
    const petitionText = (body.petition_text || '').trim();
    if (!petitionText || petitionText.length < 10 || petitionText.length > 2000) {
        return NextResponse.json({ error: 'Petition text must be 10-2000 characters' }, { status: 400 });
    }

    // Insert
    const { data: petition, error: insertError } = await supabase
        .from('parent_petitions')
        .insert({
            from_party_id: id,
            to_party_id: party.parent_party_id,
            petition_text: petitionText,
            created_by: user.id,
        })
        .select()
        .single();

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(petition, { status: 201 });
}

/**
 * PATCH /api/parties/[id]/petition-parent
 * Update a petition status (acknowledge/address). Only parent group leader can do this.
 * Body: { petition_id: string, status: 'acknowledged' | 'addressed' }
 */
export async function PATCH(req: Request, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { petition_id, status } = body;

    if (!petition_id || !['acknowledged', 'addressed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify user is leader of this party (which should be the parent / to_party)
    const { data: trustVotes } = await supabase
        .from('trust_votes')
        .select('to_user_id')
        .eq('party_id', id)
        .gt('expires_at', new Date().toISOString());

    const voteCounts: Record<string, number> = {};
    (trustVotes || []).forEach((v) => {
        voteCounts[v.to_user_id] = (voteCounts[v.to_user_id] || 0) + 1;
    });

    let leaderId: string | null = null;
    let maxVotes = 0;
    Object.entries(voteCounts).forEach(([userId, count]) => {
        if (count > maxVotes) {
            maxVotes = count;
            leaderId = userId;
        }
    });

    if (leaderId !== user.id) {
        return NextResponse.json({ error: 'Only the parent group leader can update petition status' }, { status: 403 });
    }

    // Update
    const { data: petition, error: updateError } = await supabase
        .from('parent_petitions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', petition_id)
        .eq('to_party_id', id)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(petition);
}
