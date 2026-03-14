import { createClient } from '@/lib/supabase/server';
import { getDiscoverPageData } from '@/lib/discover/getDiscoverPageData';
import { DiscoverExploreClient } from '@/components/DiscoverExploreClient';

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
        activeView,
        categories,
        groupItems,
        allianceItems,
        issueItems,
        safeOffset,
        limit,
        hasMore,
        query,
        selectedCategory,
        selectedScope,
        activeMembershipPartyId,
        activeMemberships,
    } = await getDiscoverPageData(supabase, resolvedSearchParams);

    return (
        <DiscoverExploreClient
            activeView={activeView}
            categories={categories}
            initialGroups={groupItems}
            alliances={allianceItems}
            issueItems={issueItems}
            hasMore={hasMore}
            initialOffset={safeOffset}
            limit={limit}
            initialQuery={query}
            initialSelectedCategory={selectedCategory}
            initialSelectedScope={selectedScope}
            activeMembershipPartyId={activeMembershipPartyId}
            activeMemberships={activeMemberships}
        />
    );
}
