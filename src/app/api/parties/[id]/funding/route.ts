import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { FundingCampaignWithStats } from '@/types/database';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

// GET /api/parties/[id]/funding - List active funding campaigns for a party
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: partyId } = await params;
    const supabase = await createClient();

    // Fetch campaigns with aggregated stats
    const { data: campaigns, error } = await supabase
        .from('funding_campaigns')
        .select(`
            *,
            created_by_profile:profiles!funding_campaigns_created_by_fkey(display_name)
        `)
        .eq('party_id', partyId)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching funding campaigns:', error);
        return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    // Get raised amounts and donor counts for each campaign
    const campaignsWithStats: FundingCampaignWithStats[] = await Promise.all(
        (campaigns || []).map(async (campaign) => {
            const { data: raisedData } = await supabase
                .rpc('get_campaign_raised_amount', { p_campaign_id: campaign.id });

            const { data: donorData } = await supabase
                .rpc('get_campaign_donor_count', { p_campaign_id: campaign.id });

            return {
                ...campaign,
                raised_amount: raisedData || 0,
                donor_count: donorData || 0,
                creator_name: campaign.created_by_profile?.display_name || null,
            };
        })
    );

    return NextResponse.json({ campaigns: campaignsWithStats });
}

// POST /api/parties/[id]/funding - Create a new funding campaign (leader only)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if user is the leader of this party
    const { data: leaderData } = await supabase
        .rpc('get_party_leader', { p_party_id: partyId });

    if (leaderData !== effectiveUserId) {
        return NextResponse.json(
            { error: 'Only the group leader can create funding campaigns' },
            { status: 403 }
        );
    }

    // Parse request body
    const body = await request.json();
    const { title, description, goal_amount, upi_id, ends_at } = body;

    // Validate required fields
    if (!title || !description || !goal_amount || !upi_id || !ends_at) {
        return NextResponse.json(
            { error: 'Missing required fields: title, description, goal_amount, upi_id, ends_at' },
            { status: 400 }
        );
    }

    // Validate UPI ID format (basic check)
    const upiRegex = /^[\w.-]+@[\w]+$/;
    if (!upiRegex.test(upi_id)) {
        return NextResponse.json(
            { error: 'Invalid UPI ID format. Expected format: name@upi' },
            { status: 400 }
        );
    }

    // Create campaign
    const { data: campaign, error: insertError } = await supabase
        .from('funding_campaigns')
        .insert({
            party_id: partyId,
            created_by: effectiveUserId,
            title,
            description,
            goal_amount: Math.round(goal_amount),
            upi_id,
            ends_at: new Date(ends_at).toISOString(),
        })
        .select()
        .single();

    if (insertError) {
        console.error('Error creating funding campaign:', insertError);
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    return NextResponse.json({ campaign }, { status: 201 });
}
