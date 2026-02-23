import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Generate a short, readable invite code
function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// GET: Get user's invitations (sent and received)
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sent'; // 'sent' or 'accepted'

    if (type === 'sent') {
        const { data, error } = await supabase
            .from('invitations')
            .select(`
                id, party_id, invite_code, accepted_by, accepted_at, created_at, expires_at,
                parties!inner(issue_text),
                accepted_profile:profiles!invitations_accepted_by_fkey(display_name)
            `)
            .eq('inviter_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const invitations = (data || []).map((inv) => {
            const party = Array.isArray(inv.parties) ? inv.parties[0] : inv.parties;
            const acceptedProfile = Array.isArray(inv.accepted_profile) ? inv.accepted_profile[0] : inv.accepted_profile;
            return {
                id: inv.id,
                partyId: inv.party_id,
                partyName: party?.issue_text ?? 'Unknown',
                inviteCode: inv.invite_code,
                acceptedBy: inv.accepted_by,
                acceptedByName: acceptedProfile?.display_name ?? null,
                acceptedAt: inv.accepted_at,
                createdAt: inv.created_at,
                expiresAt: inv.expires_at,
                isExpired: inv.expires_at ? new Date(inv.expires_at) < new Date() : false,
            };
        });

        return NextResponse.json({ invitations });
    }

    // Type === 'accepted' - invitations where this user accepted
    const { data, error } = await supabase
        .from('invitations')
        .select(`
            id, party_id, inviter_id, invite_code, accepted_at, created_at,
            parties!inner(issue_text),
            inviter:profiles!invitations_inviter_id_fkey(display_name)
        `)
        .eq('accepted_by', user.id)
        .order('accepted_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const invitations = (data || []).map((inv) => {
        const party = Array.isArray(inv.parties) ? inv.parties[0] : inv.parties;
        const inviter = Array.isArray(inv.inviter) ? inv.inviter[0] : inv.inviter;
        return {
            id: inv.id,
            partyId: inv.party_id,
            partyName: party?.issue_text ?? 'Unknown',
            inviterId: inv.inviter_id,
            inviterName: inviter?.display_name ?? null,
            acceptedAt: inv.accepted_at,
        };
    });

    return NextResponse.json({ invitations });
}

// POST: Create a new invitation
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { partyId } = body;

    if (!partyId) {
        return NextResponse.json({ error: 'Party ID is required' }, { status: 400 });
    }

    // Verify user is a member of the party
    const { data: membership } = await supabase
        .from('memberships')
        .select('id')
        .eq('party_id', partyId)
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle();

    if (!membership) {
        return NextResponse.json({ error: 'You must be a member of the party to invite others' }, { status: 403 });
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
        const { data: existing } = await supabase
            .from('invitations')
            .select('id')
            .eq('invite_code', inviteCode)
            .maybeSingle();

        if (!existing) break;
        inviteCode = generateInviteCode();
        attempts++;
    }

    // Create invitation
    const { data: invitation, error } = await supabase
        .from('invitations')
        .insert({
            party_id: partyId,
            inviter_id: user.id,
            invite_code: inviteCode,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        invitation: {
            id: invitation.id,
            inviteCode: invitation.invite_code,
            expiresAt: invitation.expires_at,
        }
    });
}

// PUT: Accept an invitation
export async function PUT(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { inviteCode } = body;

    if (!inviteCode) {
        return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const normalizedInviteCode = inviteCode.toUpperCase();
    const nowIso = new Date().toISOString();

    // Atomically claim invitation to prevent race conditions.
    const { data: claimedInvitation, error: claimError } = await supabase
        .from('invitations')
        .update({
            accepted_by: user.id,
            accepted_at: nowIso,
        })
        .eq('invite_code', normalizedInviteCode)
        .is('accepted_by', null)
        .gt('expires_at', nowIso)
        .neq('inviter_id', user.id)
        .select('id, party_id')
        .maybeSingle();

    if (claimError) {
        return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    // If claim failed, resolve the reason for a user-friendly response.
    if (!claimedInvitation) {
        const { data: invitation, error: findError } = await supabase
            .from('invitations')
            .select('inviter_id, accepted_by, expires_at')
            .eq('invite_code', normalizedInviteCode)
            .maybeSingle();

        if (findError || !invitation) {
            return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
        }

        if (invitation.inviter_id === user.id) {
            return NextResponse.json({ error: 'You cannot accept your own invitation' }, { status: 400 });
        }

        if (invitation.accepted_by) {
            return NextResponse.json({ error: 'This invitation has already been used' }, { status: 400 });
        }

        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 });
        }

        return NextResponse.json({ error: 'Unable to accept invitation' }, { status: 400 });
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
        .from('memberships')
        .select('id')
        .eq('party_id', claimedInvitation.party_id)
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle();

    if (existingMembership) {
        return NextResponse.json({
            message: 'You are already a member of this party',
            alreadyMember: true,
            partyId: claimedInvitation.party_id,
        });
    }

    // Join the party and mark invitation as accepted
    const { error: joinError } = await supabase
        .from('memberships')
        .insert({
            party_id: claimedInvitation.party_id,
            user_id: user.id,
        });

    if (joinError) {
        if (joinError.code === '23505') {
            return NextResponse.json({
                message: 'You are already a member of this party',
                alreadyMember: true,
                partyId: claimedInvitation.party_id,
            });
        }
        return NextResponse.json({ error: 'Failed to join party' }, { status: 500 });
    }

    return NextResponse.json({
        message: 'Successfully joined the party!',
        partyId: claimedInvitation.party_id,
    });
}
