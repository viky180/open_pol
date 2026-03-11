import { createClient } from '@/lib/supabase/server';
import { getOnboardingStatus } from '@/lib/onboarding';
import Link from 'next/link';
import { LandingHero } from '@/components/LandingHero';
import { LandingValueSection } from '@/components/LandingValueSection';
import { GroupPreview } from '@/components/GroupPreview';
import { GET as getHomeDashboard } from '@/app/api/home-dashboard/route';
import { MyGroupsCard } from '@/components/MyGroupsCard';
import { TrendingPanel } from '@/components/TrendingPanel';
import { UrgentIssuesCard } from '@/components/UrgentIssuesCard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type DashboardGroup = {
  id: string;
  name: string;
  memberCount: number;
  category: string;
  joinedAt: string;
  lastActivityAt: string;
  lastActivityPreview: string;
};

type DashboardActionItem = {
  id: string;
  type: 'trust_expiring' | 'nomination_open';
  label: string;
  urgency: 'high' | 'medium' | 'low';
  linkUrl: string;
  meta?: Record<string, unknown>;
};

type DashboardTrendItem = {
  partyId: string;
  issueText: string;
  memberChange: number;
  memberChangePct: number;
  currentMembers: number;
};

type DashboardDiscussionItem = {
  partyId: string;
  issueText: string;
  discussionCount: number;
  currentMembers: number;
};

type DashboardData = {
  myGroups: DashboardGroup[];
  actionItems: DashboardActionItem[];
  representation: {
    partyId: string;
    partyName: string;
    leaderName: string | null;
    trustExpiresInDays: number | null;
  } | null;
  trending: DashboardTrendItem[];
  fastestGrowing: DashboardTrendItem[];
  mostDiscussed: DashboardDiscussionItem[];
  userState: string | null;
  userDistrict: string | null;
  selectedScope?: 'india' | 'state' | 'district';
};

type LocationRow = {
  location_scope: string | null;
  location_label: string | null;
  state_name: string | null;
  district_name: string | null;
  block_name: string | null;
  panchayat_name: string | null;
  village_name: string | null;
  pincodes: string[] | null;
};

const DEFAULT_DASHBOARD: DashboardData = {
  myGroups: [],
  actionItems: [],
  representation: null,
  trending: [],
  fastestGrowing: [],
  mostDiscussed: [],
  userState: null,
  userDistrict: null,
};

function getFirstName(user: { user_metadata?: Record<string, unknown>; email?: string } | null): string {
  const metadata = user?.user_metadata;
  const fullName =
    (typeof metadata?.full_name === 'string' && metadata.full_name) ||
    (typeof metadata?.name === 'string' && metadata.name) ||
    (typeof metadata?.display_name === 'string' && metadata.display_name) ||
    user?.email?.split('@')[0] ||
    '';

  return fullName.split(' ')[0] || 'there';
}

function getTotalLocations(locationData: LocationRow[] | null): number {
  const allLocations = new Set<string>();

  (locationData || []).forEach((party) => {
    const scope = party.location_scope || 'district';
    const label =
      party.location_label || party.village_name || party.panchayat_name || party.block_name || party.district_name || party.state_name || null;

    if (label) {
      allLocations.add(`${scope}:${label}`);
      return;
    }

    (party.pincodes || []).forEach((pin) => allLocations.add(`pincode:${pin}`));
  });

  return allLocations.size;
}

function toGroupPreviewItems(
  featuredGroups:
    | Array<{
      id: string;
      issue_text: string | null;
      member_count: number | null;
      categories: { name: string } | Array<{ name: string }> | null;
    }>
    | null,
) {
  return (featuredGroups || []).map((group) => {
    const category = Array.isArray(group.categories) ? group.categories[0] : group.categories;

    return {
      id: group.id,
      name: group.issue_text || 'Unnamed Group',
      memberCount: group.member_count || 0,
      category: category?.name || 'General',
    };
  });
}

function getScopeLabel(dashboard: DashboardData): string {
  if (dashboard.selectedScope === 'district') return dashboard.userDistrict || 'District';
  if (dashboard.selectedScope === 'state') return dashboard.userState || 'State';
  return 'India';
}

function getMomentumItems(dashboard: DashboardData) {
  return [...dashboard.trending, ...dashboard.fastestGrowing]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.partyId === item.partyId) === index)
    .slice(0, 4)
    .map((item) => ({
      id: item.partyId,
      title: item.issueText,
      memberCount: item.currentMembers,
      memberChange: item.memberChange,
      memberChangePct: item.memberChangePct,
      href: `/party/${item.partyId}`,
    }));
}

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = !user;
  const firstName = getFirstName(user);
  const onboardingStatus = user ? await getOnboardingStatus({
    getProfile: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, pincode')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    getActiveMembershipCount: async () => {
      const { count } = await supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('left_at', null);
      return count;
    },
  }) : null;

  const [{ count: totalGroups }, { count: totalMembers }, { data: locationData }] = await Promise.all([
    supabase.from('parties').select('*', { count: 'exact', head: true }),
    supabase.from('memberships').select('*', { count: 'exact', head: true }).is('left_at', null),
    supabase
      .from('parties')
      .select('location_scope, location_label, state_name, district_name, block_name, panchayat_name, village_name, pincodes'),
  ]);

  const totalLocations = getTotalLocations((locationData as LocationRow[] | null) || null);

  if (isGuest) {
    const { data: featuredGroups } = await supabase
      .from('parties_with_member_counts')
      .select('id, issue_text, member_count, category_id, categories(name)')
      .order('member_count', { ascending: false })
      .limit(4);

    const groupPreviewItems = toGroupPreviewItems(featuredGroups);

    return (
      <div className="min-h-screen">
        <LandingHero totalGroups={totalGroups || 0} totalMembers={totalMembers || 0} totalLocations={totalLocations} />
        <LandingValueSection />
        <GroupPreview groups={groupPreviewItems} />
      </div>
    );
  }

  const dashboardRes = await getHomeDashboard();

  let dashboard: DashboardData = { ...DEFAULT_DASHBOARD };

  if (dashboardRes.ok) {
    const json = await dashboardRes.json();
    dashboard = {
      ...dashboard,
      ...json,
    };
  }

  const compactMembers = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(
    totalMembers || 0,
  );
  const momentumItems = getMomentumItems(dashboard);
  const scopeLabel = getScopeLabel(dashboard);
  const topTrend = dashboard.trending[0];
  const topDiscussion = dashboard.mostDiscussed[0];
  const nextActionCount = dashboard.actionItems.length;
  const shouldResumeOnboarding = Boolean(onboardingStatus?.shouldCompleteOnboarding);
  const topAction = dashboard.actionItems[0] || null;
  const primaryGroup = dashboard.representation?.partyId
    ? dashboard.myGroups.find((group) => group.id === dashboard.representation?.partyId) || dashboard.myGroups[0] || null
    : dashboard.myGroups[0] || null;
  const heroSupportText = shouldResumeOnboarding
    ? onboardingStatus?.nextStep === 'profile'
      ? 'Finish your setup in one place so people can recognize you and you can find the right cause-based group faster.'
      : 'You are one step away from activation. Choose a cause, join your first group, and start building local momentum.'
    : primaryGroup && topTrend
      ? `${primaryGroup.name} is active, and ${topTrend.issueText} is currently the strongest support signal in ${scopeLabel}.`
      : primaryGroup
        ? `You are active in ${dashboard.myGroups.length} group${dashboard.myGroups.length === 1 ? '' : 's'}. Catch up on what changed and where support is moving.`
        : `Scan what is gaining support in ${scopeLabel}, compare options, or start the first group that fits your issue.`;
  const primaryCta = shouldResumeOnboarding
    ? {
      href: '/welcome?next=/',
      label: onboardingStatus?.nextStep === 'profile' ? 'Complete your setup' : 'Choose your first group',
    }
    : topAction
      ? { href: topAction.linkUrl, label: 'Resolve next action' }
      : primaryGroup
        ? { href: `/party/${primaryGroup.id}`, label: 'Continue with your group' }
        : { href: '/discover', label: 'Find your first group' };
  const secondaryCta = shouldResumeOnboarding
    ? { href: '/discover', label: 'Browse groups first' }
    : primaryGroup
      ? topTrend
        ? { href: `/party/${topTrend.partyId}`, label: 'See what is rising nearby' }
        : { href: '/discover', label: 'Compare nearby groups' }
      : { href: '/party/create', label: 'Start a new group' };

  return (
    <div className="min-h-screen">
      <section className="editorial-page editorial-page--wide py-6 sm:py-8">
        <div className="editorial-hero">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="editorial-hero__eyebrow">Your home</p>
              <h1 className="editorial-hero__title text-3xl sm:text-5xl">Welcome back, {firstName}</h1>
              <p className="editorial-hero__body">{heroSupportText}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch xl:flex-row">
              <Link href={primaryCta.href} className="btn btn-primary min-w-[220px] justify-center">
                {primaryCta.label}
              </Link>
              <Link href={secondaryCta.href} className="btn btn-secondary min-w-[220px] justify-center border-white/15 bg-white/8 text-white hover:bg-white/14 hover:text-white">
                {secondaryCta.label}
              </Link>
            </div>
          </div>

        </div>
      </section>

      <div className="editorial-page editorial-page--wide space-y-8 py-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <MyGroupsCard
              groups={dashboard.myGroups}
              representation={dashboard.representation}
              actionCount={nextActionCount}
              onboardingStatus={onboardingStatus}
            />
          </div>
          <div className="space-y-6 xl:col-span-5">
            <div className="editorial-subcard">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                    Current reach
                  </p>
                  <p className="mt-2 text-base text-text-primary">
                    <span className="font-semibold">{totalGroups || 0}</span> groups are live across{' '}
                    <span className="font-semibold">{(totalLocations || 0).toLocaleString('en-IN')}</span> locations.
                  </p>
                </div>
                <span className="badge border-accent/20 bg-accent/10 text-accent">This week</span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">
                {topTrend
                  ? `${topTrend.issueText} added ${topTrend.memberChange.toLocaleString('en-IN')} members in the last 7 days.`
                  : `Track what is gaining support around you and compare how fast groups are growing.`}
              </p>
            </div>
          </div>
        </div>

        <div className="editorial-section-head">
          <span className="editorial-section-head__label">Rising near you</span>
          <span className="editorial-section-head__count">{scopeLabel}</span>
          <span className="editorial-section-head__rule" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <UrgentIssuesCard items={momentumItems} scopeLabel={scopeLabel} />
          </div>
          <div className="xl:col-span-8">
            <TrendingPanel
              trending={dashboard.trending}
              fastestGrowing={dashboard.fastestGrowing}
              mostDiscussed={dashboard.mostDiscussed}
              userState={dashboard.userState}
              userDistrict={dashboard.userDistrict}
              selectedScope={dashboard.selectedScope}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="editorial-subcard text-sm text-text-secondary">
            {topTrend ? (
              <>
                <span className="font-semibold text-text-primary">{topTrend.issueText}</span> added{' '}
                <span className="font-semibold text-text-primary">{topTrend.memberChange.toLocaleString('en-IN')}</span> members this week.
              </>
            ) : (
              <>No growth signal recorded yet in your current scope.</>
            )}
          </div>
          <div className="editorial-subcard text-sm text-text-secondary">
            {topDiscussion ? (
              <>
                <span className="font-semibold text-text-primary">{topDiscussion.issueText}</span> sparked{' '}
                <span className="font-semibold text-text-primary">{topDiscussion.discussionCount}</span> recent conversations.
              </>
            ) : (
              <>Total active members visible right now: <span className="font-semibold text-text-primary">{compactMembers}</span></>
            )}
          </div>
          <div className="editorial-subcard text-sm text-text-secondary">
            {primaryGroup ? (
              <>
                Your main group is <span className="font-semibold text-text-primary">{primaryGroup.name}</span>.{' '}
                {nextActionCount > 0
                  ? `${nextActionCount} pending action${nextActionCount === 1 ? '' : 's'} are waiting.`
                  : 'No urgent action is blocking your next step.'}
              </>
            ) : (
              <>
                Compare nearby groups, track live momentum, or <span className="font-semibold text-text-primary">start your own issue group</span> to organize locally.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
