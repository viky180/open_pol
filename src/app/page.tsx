import { createClient } from '@/lib/supabase/server';
import { HomeFeedClient } from '@/components/HomeFeedClient';
import { LandingHero } from '@/components/LandingHero';
import { GroupPreview } from '@/components/GroupPreview';
import { GET as getHomeFeed } from '@/app/api/home-feed/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = !user;

  const [{ count: totalGroups }, { count: totalMembers }, { data: locationData }] = await Promise.all([
    supabase.from('parties').select('*', { count: 'exact', head: true }),
    supabase.from('memberships').select('*', { count: 'exact', head: true }).is('left_at', null),
    supabase
      .from('parties')
      .select('location_scope, location_label, state_name, district_name, block_name, panchayat_name, village_name, pincodes'),
  ]);

  const allLocations = new Set<string>();
  (locationData || []).forEach((p) => {
    const scope = p.location_scope || 'district';
    const label =
      p.location_label || p.village_name || p.panchayat_name || p.block_name || p.district_name || p.state_name || null;

    if (label) {
      allLocations.add(`${scope}:${label}`);
      return;
    }

    (p.pincodes || []).forEach((pin: string) => allLocations.add(`pincode:${pin}`));
  });
  const totalLocations = allLocations.size;

  // === GUEST VIEW — compact landing ===
  if (isGuest) {
    const { data: featuredGroups } = await supabase
      .from('parties_with_member_counts')
      .select('id, issue_text, member_count, category_id, categories(name)')
      .order('member_count', { ascending: false })
      .limit(4);

    const groupPreviewItems = (featuredGroups || []).map((g) => {
      const category = Array.isArray(g.categories) ? g.categories[0] : g.categories;
      return {
        id: g.id,
        name: g.issue_text || 'Unnamed Group',
        memberCount: g.member_count || 0,
        category: category?.name || 'General',
      };
    });

    return (
      <div className="min-h-screen">
        <LandingHero totalGroups={totalGroups || 0} totalMembers={totalMembers || 0} totalLocations={totalLocations} />
        <GroupPreview groups={groupPreviewItems} />
      </div>
    );
  }

  // === LOGGED-IN VIEW — compact greeting + feed ===
  const feedRes = await getHomeFeed();

  let representation = null;
  let feedItems: Array<{
    id: string;
    type:
    | 'question'
    | 'action_email'
    | 'action_escalation'
    | 'milestone'
    | 'merge'
    | 'post'
    | 'new_member'
    | 'invitation_accepted'
    | 'trust_milestone'
    | 'new_party';
    partyId: string;
    partyName: string;
    scope: 'member' | 'location' | 'category' | 'global';
    title: string;
    preview: string;
    timestamp: string;
    linkUrl: string;
    meta?: Record<string, unknown>;
  }> = [];

  if (feedRes.ok) {
    const json = await feedRes.json();
    representation = json.representation || null;
    feedItems = json.feedItems || [];
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-border-primary bg-bg-secondary">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <h1 className="text-xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>Welcome back</h1>
          <p className="text-sm text-text-secondary mt-1">
            {totalGroups} groups · {totalMembers?.toLocaleString()} members · {totalLocations} locations
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <HomeFeedClient representation={representation} feedItems={feedItems} initialIsAuthenticated={!isGuest} />
      </div>
    </div>
  );
}
