import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

interface Props {
    params: Promise<{ id: string }>;
}

// GET /api/parties/[id]/milestone-escalations
export async function GET(_request: NextRequest, { params }: Props) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    const [{ data: rules, error: rulesError }, { data: actions, error: actionsError }] = await Promise.all([
        supabase
            .from('milestone_escalation_rules')
            .select('*')
            .eq('party_id', partyId)
            .order('threshold', { ascending: true }),
        supabase
            .from('milestone_escalation_actions')
            .select('*')
            .eq('party_id', partyId)
            .order('triggered_at', { ascending: false }),
    ]);

    if (rulesError || actionsError) {
        return NextResponse.json(
            { error: rulesError?.message || actionsError?.message || 'Failed to fetch milestone escalations' },
            { status: 500 }
        );
    }

    return NextResponse.json({
        rules: rules || [],
        actions: actions || [],
    });
}

// POST /api/parties/[id]/milestone-escalations
// Upsert a milestone escalation rule (leader only)
export async function POST(request: NextRequest, { params }: Props) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(request, name)
    );
    if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const effectiveUserId = userContext.effectiveUserId;

    const { data: leaderId } = await supabase.rpc('get_party_leader', { p_party_id: partyId });
    if (leaderId !== effectiveUserId) {
        return NextResponse.json({ error: 'Only the party leader can configure milestone escalation rules' }, { status: 403 });
    }

    let body: {
        threshold?: number;
        action_type?: 'media_outreach' | 'formal_letter' | 'higher_authority';
        action_title?: string;
        action_body?: string;
        is_enabled?: boolean;
    };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const threshold = Number(body.threshold || 0);
    const actionType = body.action_type;
    const actionTitle = (body.action_title || '').trim();
    const allowedThresholds = new Set([100, 500, 1000]);
    const allowedActions = new Set(['media_outreach', 'formal_letter', 'higher_authority']);

    if (!allowedThresholds.has(threshold) || !actionType || !allowedActions.has(actionType) || !actionTitle) {
        return NextResponse.json(
            { error: 'threshold (100/500/1000), action_type and action_title are required' },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from('milestone_escalation_rules')
        .upsert({
            party_id: partyId,
            threshold,
            action_type: actionType,
            action_title: actionTitle,
            action_body: (body.action_body || '').trim() || null,
            is_enabled: body.is_enabled ?? true,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'party_id,threshold,action_type' })
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
