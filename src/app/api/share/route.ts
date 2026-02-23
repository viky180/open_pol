import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type SharePlatform = 'whatsapp' | 'x' | 'copy';

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null) as null | {
            platform?: SharePlatform;
            partyId?: string;
            source?: string;
        };

        const platform = body?.platform;
        if (!platform || !['whatsapp', 'x', 'copy'].includes(platform)) {
            return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
        }

        const partyId = body?.partyId ?? null;
        const source = body?.source ?? null;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Best-effort insert. If table doesn't exist yet, we still return 204.
        const { error } = await supabase
            .from('share_events')
            .insert({
                platform,
                party_id: partyId,
                source,
                user_id: user?.id ?? null,
            });

        if (error) {
            // Don't break UX. This endpoint is optional telemetry.
            return new NextResponse(null, { status: 204 });
        }

        return new NextResponse(null, { status: 204 });
    } catch {
        return new NextResponse(null, { status: 204 });
    }
}
