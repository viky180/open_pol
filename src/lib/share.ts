export type SharePlatform = 'whatsapp' | 'x' | 'copy';

export type ShareContext = {
    /** Absolute URL to share */
    url: string;
    /** Short human-readable title (e.g., issue text) */
    title: string;
    /** Optional: additional hint like location/pincodes */
    subtitle?: string;
};

/**
 * Generates platform-specific share text. We intentionally keep it short:
 * - WhatsApp forwards should feel actionable
 * - X copy should feel like public accountability
 */
export function buildShareText(ctx: ShareContext) {
    const title = ctx.title?.trim() || 'Open Politics';

    const whatsapp = [
        `Join this issue group: ${title}`,
        ctx.subtitle ? `(${ctx.subtitle})` : null,
        'Takes ~30 seconds. Leave anytime.',
    ].filter(Boolean).join(' ');

    const x = [
        title,
        'I’m joining a local group to track this publicly.',
    ].join('\n');

    return { whatsapp, x };
}

export function buildWhatsAppShareUrl(ctx: ShareContext): string {
    const { whatsapp } = buildShareText(ctx);
    // WhatsApp uses a single text field that can include URL.
    const text = `${whatsapp} ${ctx.url}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildXShareUrl(ctx: ShareContext): string {
    const { x } = buildShareText(ctx);
    return `https://x.com/intent/tweet?text=${encodeURIComponent(x)}&url=${encodeURIComponent(ctx.url)}`;
}

/**
 * Best-effort helper to compute the current origin on the client.
 * (Server components should pass absolute URLs where possible.)
 */
export function getClientOrigin(): string {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
}

export function buildPartyShareUrl(partyId: string, origin?: string): string {
    const base = origin ?? getClientOrigin();
    return base ? `${base}/party/${partyId}` : `/party/${partyId}`;
}

export async function trackShareEvent(params: {
    platform: SharePlatform;
    partyId?: string;
    source?: string;
}) {
    try {
        await fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
    } catch {
        // Non-blocking. We never break sharing.
    }
}
