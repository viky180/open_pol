import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminUserId } from '@/lib/admin';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';
import { createAdminClient } from '@/lib/supabase/admin';

interface Props {
    params: Promise<{ id: string }>;
}

function normalizeHttpImageUrl(value: unknown, fieldName: string): { value: string | null; error: string | null } {
    if (value === null || value === undefined) {
        return { value: null, error: null };
    }

    if (typeof value !== 'string') {
        return { value: null, error: `${fieldName} must be a string or null` };
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return { value: null, error: null };
    }

    try {
        const parsed = new URL(trimmed);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return { value: null, error: `${fieldName} must be a valid http/https URL` };
        }
        return { value: trimmed, error: null };
    } catch {
        return { value: null, error: `${fieldName} must be a valid URL` };
    }
}

function normalizePartyIconSvg(value: unknown): { value: string | null; error: string | null } {
    if (value === null || value === undefined) {
        return { value: null, error: null };
    }

    if (typeof value !== 'string') {
        return { value: null, error: 'icon_svg must be a string or null' };
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return { value: null, error: null };
    }

    if (trimmed.length > 20_000) {
        return { value: null, error: 'icon_svg is too large (max 20KB)' };
    }

    if (!/^<svg[\s\S]*<\/svg>$/i.test(trimmed)) {
        return { value: null, error: 'icon_svg must be a valid SVG snippet starting with <svg> and ending with </svg>' };
    }

    const forbiddenPatterns = [
        /<script[\s>]/i,
        /on\w+\s*=/i,
        /<foreignObject[\s>]/i,
        /\b(?:href|xlink:href)\s*=\s*["']\s*https?:/i,
        /url\(\s*["']?\s*https?:/i,
    ];

    if (forbiddenPatterns.some((pattern) => pattern.test(trimmed))) {
        return { value: null, error: 'icon_svg contains unsupported or unsafe SVG content' };
    }

    return { value: trimmed, error: null };
}

// GET /api/parties/[id] - Get party details
export async function GET(request: NextRequest, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: party, error } = await supabase
        .from('parties')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    // Get member count
    const { count: memberCount } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', id)
        .is('left_at', null);

    // Calculate level
    const count = memberCount || 0;
    let level: 1 | 2 | 3 | 4;
    if (count <= 10) level = 1;
    else if (count <= 100) level = 2;
    else if (count <= 1000) level = 3;
    else level = 4;

    // Get leader
    const { data: votes } = await supabase
        .from('trust_votes')
        .select('to_user_id')
        .eq('party_id', id)
        .gt('expires_at', new Date().toISOString());

    const voteCounts: Record<string, number> = {};
    votes?.forEach(v => {
        voteCounts[v.to_user_id] = (voteCounts[v.to_user_id] || 0) + 1;
    });

    let leaderId: string | null = null;
    let maxVotes = 0;
    Object.entries(voteCounts).forEach(([userId, cnt]) => {
        if (cnt > maxVotes) {
            maxVotes = cnt;
            leaderId = userId;
        }
    });

    // Get Q&A metrics
    const { count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', id);

    const { data: answeredQuestions } = await supabase
        .from('questions')
        .select('id, answers(id)')
        .eq('party_id', id);

    const unansweredCount = (answeredQuestions || []).filter(
        q => !q.answers || q.answers.length === 0
    ).length;

    return NextResponse.json({
        ...party,
        member_count: count,
        level,
        leader_id: leaderId,
        qa_metrics: {
            total_questions: totalQuestions || 0,
            unanswered_questions: unansweredCount
        }
    });
}

// DELETE /api/parties/[id] - Admin-only cascading delete of a group/community and its subtree
export async function DELETE(request: NextRequest, { params }: Props) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(request, name)
    );

    if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminUserId(userContext.realUser.id)) {
        return NextResponse.json(
            { error: 'Only admins can delete groups, sub-communities, or communities' },
            { status: 403 }
        );
    }

    const supabaseAdmin = createAdminClient();

    const { data: party, error: partyError } = await supabaseAdmin
        .from('parties')
        .select('id')
        .eq('id', partyId)
        .maybeSingle();

    if (partyError) {
        return NextResponse.json({ error: partyError.message }, { status: 500 });
    }

    if (!party) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const seen = new Set<string>();
    const toVisit: string[] = [partyId];

    while (toVisit.length > 0) {
        const batch = toVisit.splice(0, 100);
        batch.forEach((id) => seen.add(id));

        const { data: children, error: childrenError } = await supabaseAdmin
            .from('parties')
            .select('id')
            .in('parent_party_id', batch);

        if (childrenError) {
            return NextResponse.json({ error: childrenError.message }, { status: 500 });
        }

        for (const child of children || []) {
            if (!child.id || seen.has(child.id)) continue;
            toVisit.push(child.id);
        }
    }

    const idsToDelete = Array.from(seen);

    const { error: deleteError } = await supabaseAdmin
        .from('parties')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        deleted_party_ids: idsToDelete,
        deleted_count: idsToDelete.length,
    });
}

// PATCH /api/parties/[id] - Admin-only patch support (title image, icon svg)
export async function PATCH(request: NextRequest, { params }: Props) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(request, name)
    );

    if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminUserId(userContext.realUser.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const payload = (body && typeof body === 'object')
        ? body as { title_image_url?: unknown; icon_svg?: unknown; icon_image_url?: unknown }
        : null;
    const normalizedTitleImage = normalizeHttpImageUrl(payload?.title_image_url, 'title_image_url');
    const normalizedIconSvg = normalizePartyIconSvg(payload?.icon_svg);
    const normalizedIconImageUrl = normalizeHttpImageUrl(payload?.icon_image_url, 'icon_image_url');

    if (normalizedTitleImage.error) {
        return NextResponse.json({ error: normalizedTitleImage.error }, { status: 400 });
    }

    if (normalizedIconSvg.error) {
        return NextResponse.json({ error: normalizedIconSvg.error }, { status: 400 });
    }

    if (normalizedIconImageUrl.error) {
        return NextResponse.json({ error: normalizedIconImageUrl.error }, { status: 400 });
    }

    const updates: { title_image_url?: string | null; icon_svg?: string | null; icon_image_url?: string | null } = {};

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'title_image_url')) {
        updates.title_image_url = normalizedTitleImage.value;
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'icon_svg')) {
        updates.icon_svg = normalizedIconSvg.value;
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'icon_image_url')) {
        updates.icon_image_url = normalizedIconImageUrl.value;
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No supported fields provided for update' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: updatedParty, error } = await supabaseAdmin
        .from('parties')
        .update(updates)
        .eq('id', partyId)
        .select('*')
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updatedParty) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    return NextResponse.json(updatedParty);
}
