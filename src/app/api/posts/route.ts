import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

export const dynamic = 'force-dynamic';

// POST /api/posts
// Body: { partyId: string, content: string }
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(req, name)
    );

    if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const effectiveUserId = userContext.effectiveUserId;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { partyId, content } = body as { partyId?: string; content?: string };

    if (!partyId || typeof partyId !== 'string') {
        return NextResponse.json({ error: 'partyId is required' }, { status: 400 });
    }
    if (!content || typeof content !== 'string') {
        return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const trimmed = content.trim();
    if (trimmed.length < 1) {
        return NextResponse.json({ error: 'content cannot be empty' }, { status: 400 });
    }
    if (trimmed.length > 2000) {
        return NextResponse.json({ error: 'content too long (max 2000 chars)' }, { status: 400 });
    }

    // Require membership in the party to post.
    const { data: membership } = await supabase
        .from('memberships')
        .select('id')
        .eq('party_id', partyId)
        .eq('user_id', effectiveUserId)
        .is('left_at', null)
        .maybeSingle();

    if (!membership) {
        return NextResponse.json({ error: 'You must be a member to post' }, { status: 403 });
    }

    const { data, error } = await supabase
        .from('party_posts')
        .insert({ party_id: partyId, created_by: effectiveUserId, content: trimmed })
        .select('id, party_id, created_by, content, created_at')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data }, { status: 201 });
}
