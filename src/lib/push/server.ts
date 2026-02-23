/**
 * Push Notification Server Library
 * Handles sending notifications via web-push
 * 
 * NOTE: This module uses dynamic imports to prevent web-push 
 * from being bundled in client-side code
 */

import { createClient } from '@supabase/supabase-js';

// Supabase admin client for server-side operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface PushSubscriptionData {
    endpoint: string;
    p256dh: string;
    auth: string;
}

interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    url?: string;
    actions?: Array<{ action: string; title: string }>;
}

/**
 * Get configured web-push module (lazy loaded)
 */
async function getWebPush() {
    const webpush = await import('web-push');

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@openpolitics.in';

    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        webpush.default.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    }

    return webpush.default;
}

/**
 * Send a push notification to a specific subscription
 */
export async function sendNotification(
    subscription: PushSubscriptionData,
    payload: NotificationPayload
): Promise<boolean> {
    try {
        const webpush = await getWebPush();

        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth
                }
            },
            JSON.stringify(payload)
        );
        return true;
    } catch (error: unknown) {
        // Handle expired/invalid subscriptions
        const webPushError = error as { statusCode?: number };
        if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
            // Subscription expired, remove from database
            await supabaseAdmin
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', subscription.endpoint);
        }
        console.error('Push notification failed:', error);
        return false;
    }
}

/**
 * Send notification to a specific user (all their devices)
 */
export async function sendNotificationToUser(
    userId: string,
    payload: NotificationPayload
): Promise<number> {
    const { data: subscriptions, error } = await supabaseAdmin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId);

    if (error || !subscriptions) {
        console.error('Error fetching subscriptions:', error);
        return 0;
    }

    let successCount = 0;
    for (const sub of subscriptions) {
        const success = await sendNotification(sub, payload);
        if (success) successCount++;
    }

    return successCount;
}

/**
 * Send notification to all members of a party
 */
export async function sendNotificationToPartyMembers(
    partyId: string,
    payload: NotificationPayload
): Promise<number> {
    // Get all active members of the party
    const { data: memberships, error: memberError } = await supabaseAdmin
        .from('memberships')
        .select('user_id')
        .eq('party_id', partyId)
        .is('left_at', null);

    if (memberError || !memberships) {
        console.error('Error fetching party members:', memberError);
        return 0;
    }

    const userIds = memberships.map(m => m.user_id);

    // Get all subscriptions for these users
    const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .in('user_id', userIds);

    if (subError || !subscriptions) {
        console.error('Error fetching subscriptions:', subError);
        return 0;
    }

    let successCount = 0;
    for (const sub of subscriptions) {
        const success = await sendNotification(sub, payload);
        if (success) successCount++;
    }

    return successCount;
}

/**
 * Send notification to all users in the system
 * Use sparingly - for critical announcements only
 */
export async function sendBroadcastNotification(
    payload: NotificationPayload
): Promise<number> {
    const { data: subscriptions, error } = await supabaseAdmin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth');

    if (error || !subscriptions) {
        console.error('Error fetching subscriptions:', error);
        return 0;
    }

    let successCount = 0;
    for (const sub of subscriptions) {
        const success = await sendNotification(sub, payload);
        if (success) successCount++;
    }

    return successCount;
}
