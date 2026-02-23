import { createClient } from '@/lib/supabase/server';
import { getDiscoverPageData } from '@/lib/discover/getDiscoverPageData';
import { CommunityGroupsList } from '@/components/CommunityGroupsList';
import Link from 'next/link';
import type { DiscoverGroupItem } from '@/types/discover';

export const revalidate = 30;

type DiscoverPageProps = {
    searchParams?: Promise<{
        q?: string;
        category?: string;
        offset?: string;
        limit?: string;
        view?: string;
    }>;
};

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
    const supabase = await createClient();
    const resolvedSearchParams = (await searchParams) || {};
    const {
        categories,
        groupItems,
        safeOffset,
        limit,
        hasMore,
    } = await getDiscoverPageData(supabase, resolvedSearchParams);

    return (
        <div className="min-h-screen">
            <div className="border-b border-border-primary bg-bg-secondary">
                <div className="container mx-auto px-4 py-6 max-w-3xl">
                    <div className="flex justify-end mb-3">
                        <Link
                            href="/party/create"
                            className="btn btn-primary btn-sm"
                        >
                            + New Group
                        </Link>
                    </div>
                    <h1 className="text-xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                        Groups
                    </h1>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-3xl">
                <CommunityGroupsList
                    groups={groupItems as DiscoverGroupItem[]}
                    categories={categories}
                    hasMore={hasMore}
                    initialOffset={safeOffset}
                    limit={limit}
                />
            </div>
        </div>
    );
}
