import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDiscoverPageData } from '@/lib/discover/getDiscoverPageData';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || undefined;
    const category = searchParams.get('category') || undefined;
    const offset = searchParams.get('offset') || undefined;
    const limit = searchParams.get('limit') || undefined;

    const supabase = await createClient();
    const data = await getDiscoverPageData(supabase, {
        q,
        category,
        offset,
        limit,
    });

    return NextResponse.json(
        {
            groupItems: data.groupItems,
            hasMore: data.hasMore,
            nextOffset: data.safeOffset + data.limit,
        },
        {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
            },
        },
    );
}