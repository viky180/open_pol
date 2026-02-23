import { createClient } from '@/lib/supabase/server';
import { sendAdvocacyEmail } from '@/lib/email/resend';
import { NextRequest, NextResponse } from 'next/server';
import { calculatePartyLevel } from '@/types/database';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

interface Props {
    params: Promise<{ id: string }>;
}

// GET /api/parties/[id]/advocacy-emails - List advocacy emails for a party
export async function GET(request: NextRequest, { params }: Props) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    // Get emails with sender info
    const { data: emails, error } = await supabase
        .from('advocacy_emails')
        .select(`
            *,
            profiles!sent_by (display_name)
        `)
        .eq('party_id', partyId)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to include sender_name
    const emailsWithSender = emails?.map(email => ({
        ...email,
        sender_name: email.profiles?.display_name || 'Unknown',
        profiles: undefined
    })) || [];

    return NextResponse.json(emailsWithSender);
}

// POST /api/parties/[id]/advocacy-emails - Send a new advocacy email (leaders only)
export async function POST(request: NextRequest, { params }: Props) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const userContext = await getEffectiveUserContext(
        supabase,
        (name) => getCookieValueFromRequestLike(request, name)
    );
    if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const effectiveUserId = userContext.effectiveUserId;

    // Get party details and verify leadership
    const { data: party, error: partyError } = await supabase
        .from('parties')
        .select('id, issue_text')
        .eq('id', partyId)
        .single();

    if (partyError || !party) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    // Get current leader
    const { data: leaderId } = await supabase.rpc('get_party_leader', { p_party_id: partyId });

    if (leaderId !== effectiveUserId) {
        return NextResponse.json(
            { error: 'Only the party leader can send advocacy emails' },
            { status: 403 }
        );
    }

    // Get party level for rate limiting
    const { data: memberCount } = await supabase.rpc('get_party_member_count', { p_party_id: partyId });
    const level = calculatePartyLevel(memberCount || 0);

    // Check weekly email limit based on level
    const { data: weeklyCount } = await supabase.rpc('get_party_weekly_email_count', { p_party_id: partyId });
    const weeklyLimit = level; // Level 1 = 1/week, Level 2 = 2/week, etc.

    if ((weeklyCount || 0) >= weeklyLimit) {
        return NextResponse.json(
            {
                error: `Weekly email limit reached. Level ${level} parties can send ${weeklyLimit} email(s) per week.`,
                weeklyCount,
                weeklyLimit,
                level
            },
            { status: 429 }
        );
    }

    // Parse request body
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { recipient_email, recipient_name, recipient_designation, subject, email_body } = body;

    // Validate required fields
    if (!recipient_email || !subject || !email_body) {
        return NextResponse.json(
            { error: 'Missing required fields: recipient_email, subject, email_body' },
            { status: 400 }
        );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient_email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate lengths
    if (subject.length > 200) {
        return NextResponse.json({ error: 'Subject must be 200 characters or less' }, { status: 400 });
    }
    if (email_body.length > 5000) {
        return NextResponse.json({ error: 'Email body must be 5000 characters or less' }, { status: 400 });
    }

    // Get sender profile
    const { data: senderProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', effectiveUserId)
        .single();

    const senderName = senderProfile?.display_name || 'Party Leader';

    // Create email record first (as draft)
    const { data: emailRecord, error: insertError } = await supabase
        .from('advocacy_emails')
        .insert({
            party_id: partyId,
            sent_by: effectiveUserId,
            recipient_email,
            recipient_name: recipient_name || null,
            recipient_designation: recipient_designation || null,
            subject,
            body: email_body
        })
        .select()
        .single();

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Send email via Resend
    const sendResult = await sendAdvocacyEmail({
        to: recipient_email,
        recipientName: recipient_name,
        subject,
        body: email_body,
        partyName: party.issue_text,
        senderName
    });

    // Update email record with result
    if (sendResult.success) {
        await supabase
            .from('advocacy_emails')
            .update({
                status: 'sent',
                sent_at: new Date().toISOString()
            })
            .eq('id', emailRecord.id);

        return NextResponse.json({
            ...emailRecord,
            status: 'sent',
            sent_at: new Date().toISOString(),
            message: 'Email sent successfully'
        }, { status: 201 });
    } else {
        await supabase
            .from('advocacy_emails')
            .update({
                status: 'failed',
                error_message: sendResult.error
            })
            .eq('id', emailRecord.id);

        return NextResponse.json({
            ...emailRecord,
            status: 'failed',
            error: sendResult.error,
            message: 'Email delivery failed but record saved'
        }, { status: 500 });
    }
}
