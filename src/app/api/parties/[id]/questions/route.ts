import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

interface Props {
    params: Promise<{ id: string }>;
}

// GET /api/parties/[id]/questions - Get party questions
export async function GET(request: NextRequest, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: questions, error } = await supabase
        .from('questions')
        .select(`
      *,
      profiles:asked_by (display_name),
      answers (
        *,
        profiles:answered_by (display_name)
      )
    `)
        .eq('party_id', id)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(questions);
}

// POST /api/parties/[id]/questions - Ask a question
export async function POST(request: NextRequest, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(request, name)
    );

    const body = await request.json();
    const { question_text } = body;

    if (!question_text) {
        return NextResponse.json({ error: 'Question text is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('questions')
        .insert({
            party_id: id,
            asked_by: userContext?.effectiveUserId || null,
            question_text
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
