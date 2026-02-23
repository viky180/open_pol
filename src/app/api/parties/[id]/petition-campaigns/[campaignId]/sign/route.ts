import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendAdvocacyEmail } from '@/lib/email/resend';

interface Props {
    params: Promise<{ id: string; campaignId: string }>;
}

// POST /api/parties/[id]/petition-campaigns/[campaignId]/sign
export async function POST(_request: NextRequest, { params }: Props) {
    const { id: partyId, campaignId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [{ data: membership }, { data: campaign, error: campaignError }] = await Promise.all([
        supabase
            .from('memberships')
            .select('id')
            .eq('party_id', partyId)
            .eq('user_id', user.id)
            .is('left_at', null)
            .maybeSingle(),
        supabase
            .from('petition_campaigns')
            .select('*')
            .eq('id', campaignId)
            .eq('party_id', partyId)
            .single(),
    ]);

    if (!membership) {
        return NextResponse.json({ error: 'Must be a member to sign this petition' }, { status: 403 });
    }

    if (campaignError || !campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status === 'closed' || campaign.status === 'sent') {
        return NextResponse.json({ error: 'This petition is no longer accepting signatures' }, { status: 400 });
    }

    const now = new Date();
    if (new Date(campaign.starts_at) > now || new Date(campaign.ends_at) < now) {
        return NextResponse.json({ error: 'This petition is outside active signing window' }, { status: 400 });
    }

    const { error: signatureError } = await supabase
        .from('petition_signatures')
        .upsert(
            {
                campaign_id: campaignId,
                user_id: user.id,
                verification_method: 'account_membership',
                is_verified: true,
            },
            { onConflict: 'campaign_id,user_id', ignoreDuplicates: true }
        );

    if (signatureError) {
        return NextResponse.json({ error: signatureError.message }, { status: 500 });
    }

    const { count: verifiedCount, error: countError } = await supabase
        .from('petition_signatures')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('is_verified', true);

    if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const signatureCount = verifiedCount || 0;
    const thresholdReached = signatureCount >= campaign.target_signatures;

    if (thresholdReached && campaign.status === 'active') {
        const nextStatus = campaign.auto_send_enabled && campaign.authority_email ? 'sent' : 'threshold_met';
        const sentAt = nextStatus === 'sent' ? new Date().toISOString() : null;

        let sendError: string | null = null;
        if (nextStatus === 'sent' && campaign.authority_email) {
            const { data: party } = await supabase
                .from('parties')
                .select('issue_text')
                .eq('id', partyId)
                .single();

            const emailResult = await sendAdvocacyEmail({
                to: campaign.authority_email,
                recipientName: campaign.authority_name || undefined,
                subject: `Petition threshold reached: ${campaign.title}`,
                body: [
                    `A citizen petition has reached its signature threshold.`,
                    ``,
                    `Petition: ${campaign.title}`,
                    `Issue: ${party?.issue_text || 'Public issue'}`,
                    `Verified signatures: ${signatureCount}`,
                    `Target signatures: ${campaign.target_signatures}`,
                    ``,
                    campaign.description,
                ].join('\n'),
                partyName: party?.issue_text || campaign.title,
                senderName: 'Open Politics Collective Action System',
            });

            if (!emailResult.success) {
                sendError = emailResult.error || 'Email delivery failed';
            }
        }

        await supabase
            .from('petition_campaigns')
            .update({
                status: sendError ? 'threshold_met' : nextStatus,
                sent_at: sendError ? null : sentAt,
                updated_at: new Date().toISOString(),
            })
            .eq('id', campaignId);
    }

    return NextResponse.json({
        success: true,
        signature_count: signatureCount,
        target_signatures: campaign.target_signatures,
        threshold_reached: thresholdReached,
    });
}
