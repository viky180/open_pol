import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/funding/[campaignId]/donate - List donations for a campaign
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ campaignId: string }> }
) {
    const { campaignId } = await params;
    const supabase = await createClient();

    const { data: donations, error } = await supabase
        .from('funding_donations')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching donations:', error);
        return NextResponse.json({ error: 'Failed to fetch donations' }, { status: 500 });
    }

    // Process donations to respect anonymity
    const processedDonations = (donations || []).map(d => ({
        ...d,
        display_donor_name: d.is_anonymous ? 'Anonymous' : d.donor_name,
        // Hide donor_id for anonymous donations in response
        donor_id: d.is_anonymous ? null : d.donor_id,
    }));

    return NextResponse.json({ donations: processedDonations });
}

// POST /api/funding/[campaignId]/donate - Record a donation
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ campaignId: string }> }
) {
    const { campaignId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check campaign exists and is active
    const { data: campaign, error: campaignError } = await supabase
        .from('funding_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

    if (campaignError || !campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'active') {
        return NextResponse.json({ error: 'Campaign is not accepting donations' }, { status: 400 });
    }

    // Check if campaign has ended
    if (new Date(campaign.ends_at) < new Date()) {
        return NextResponse.json({ error: 'Campaign has ended' }, { status: 400 });
    }

    // Parse request
    const body = await request.json();
    const { amount, donor_name, donor_message, upi_transaction_id, is_anonymous } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    if (!donor_name) {
        return NextResponse.json({ error: 'Donor name is required' }, { status: 400 });
    }

    // Get user profile for name
    const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

    // Create donation record
    const { data: donation, error: insertError } = await supabase
        .from('funding_donations')
        .insert({
            campaign_id: campaignId,
            donor_id: user.id,
            amount: Math.round(amount),
            donor_name: donor_name || profile?.display_name || 'Anonymous',
            donor_message: donor_message || null,
            upi_transaction_id: upi_transaction_id || null,
            is_anonymous: is_anonymous || false,
        })
        .select()
        .single();

    if (insertError) {
        console.error('Error recording donation:', insertError);
        return NextResponse.json({ error: 'Failed to record donation' }, { status: 500 });
    }

    return NextResponse.json({ donation }, { status: 201 });
}

// PATCH /api/funding/[campaignId]/donate - Verify a donation (leader only)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ campaignId: string }> }
) {
    const { campaignId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get campaign and check if user is leader
    const { data: campaign } = await supabase
        .from('funding_campaigns')
        .select('party_id')
        .eq('id', campaignId)
        .single();

    if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const { data: leaderData } = await supabase
        .rpc('get_party_leader', { p_party_id: campaign.party_id });

    if (leaderData !== user.id) {
        return NextResponse.json(
            { error: 'Only the group leader can verify donations' },
            { status: 403 }
        );
    }

    // Parse request
    const body = await request.json();
    const { donation_id, is_verified } = body;

    if (!donation_id) {
        return NextResponse.json({ error: 'donation_id is required' }, { status: 400 });
    }

    // Update donation verification status
    const { data: donation, error: updateError } = await supabase
        .from('funding_donations')
        .update({
            is_verified: is_verified,
            verified_at: is_verified ? new Date().toISOString() : null,
            verified_by: is_verified ? user.id : null,
        })
        .eq('id', donation_id)
        .eq('campaign_id', campaignId)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating donation:', updateError);
        return NextResponse.json({ error: 'Failed to update donation' }, { status: 500 });
    }

    return NextResponse.json({ donation });
}
