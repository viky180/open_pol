/**
 * Send Notification API Route
 * POST: Send push notification to user(s) or party members
 * 
 * This is an internal API - in production, add proper authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminUserId } from '@/lib/admin';
import { getCookieValueFromRequestLike, getEffectiveUserContext } from '@/lib/effectiveUser';

// Force dynamic rendering to avoid static analysis of web-push
export const dynamic = 'force-dynamic';

// Lazy import server functions to avoid build-time issues
async function getNotificationFunctions() {
    const { sendNotificationToUser, sendNotificationToPartyMembers, sendBroadcastNotification } = await import('@/lib/push/server');
    return { sendNotificationToUser, sendNotificationToPartyMembers, sendBroadcastNotification };
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current user for authorization
        const userContext = await getEffectiveUserContext(
            supabase,
            (name) => getCookieValueFromRequestLike(request, name)
        );
        if (!userContext) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const realUser = userContext.realUser;
        const effectiveUserId = userContext.effectiveUserId;

        const body = await request.json();
        const { type, userId, partyId, title, body: notificationBody, url } = body;

        if (!type || !['user', 'party', 'broadcast', 'self'].includes(type)) {
            return NextResponse.json(
                { error: 'Invalid notification type. Use: user, party, broadcast, or self' },
                { status: 400 }
            );
        }

        if (!title || !notificationBody) {
            return NextResponse.json(
                { error: 'Title and body are required' },
                { status: 400 }
            );
        }

        if (typeof title !== 'string' || typeof notificationBody !== 'string') {
            return NextResponse.json(
                { error: 'Title and body must be strings' },
                { status: 400 }
            );
        }

        if (title.length > 120 || notificationBody.length > 500) {
            return NextResponse.json(
                { error: 'Title/body exceed allowed length' },
                { status: 400 }
            );
        }

        const safeUrl = typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')
            ? url
            : '/';

        const payload = {
            title,
            body: notificationBody,
            url: safeUrl,
            icon: '/favicon.ico'
        };

        let sentCount = 0;

        // Lazy load notification functions
        const { sendNotificationToUser, sendNotificationToPartyMembers, sendBroadcastNotification } = await getNotificationFunctions();

        switch (type) {
            case 'user':
                // Restrict direct user-targeted notifications to admins.
                if (!isAdminUserId(realUser.id)) {
                    return NextResponse.json(
                        { error: 'Only admins can send direct user notifications' },
                        { status: 403 }
                    );
                }
                if (!userId) {
                    return NextResponse.json(
                        { error: 'userId required for user notification' },
                        { status: 400 }
                    );
                }
                sentCount = await sendNotificationToUser(userId, payload);
                break;

            case 'party':
                if (!partyId) {
                    return NextResponse.json(
                        { error: 'partyId required for party notification' },
                        { status: 400 }
                    );
                }
                // Verify user is party leader before allowing party-wide notifications
                const { data: party } = await supabase
                    .rpc('get_party_leader', { p_party_id: partyId });

                if (party !== effectiveUserId) {
                    return NextResponse.json(
                        { error: 'Only party leader can send party notifications' },
                        { status: 403 }
                    );
                }
                sentCount = await sendNotificationToPartyMembers(partyId, payload);
                break;

            case 'broadcast':
                // Allow broadcast only for admins.
                if (!isAdminUserId(realUser.id)) {
                    return NextResponse.json(
                        { error: 'Only admins can send broadcast notifications' },
                        { status: 403 }
                    );
                }
                sentCount = await sendBroadcastNotification(payload);
                break;

            case 'self':
                // Send to the current user (for testing)
                sentCount = await sendNotificationToUser(effectiveUserId, payload);
                break;

            default:
                return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            sentCount,
            message: `Notification sent to ${sentCount} device(s)`
        });
    } catch (error) {
        console.error('Send notification error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
