'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type Scope = 'india' | 'state' | 'district';

type TrendRow = {
  partyId: string;
  issueText: string;
  memberChange: number;
  memberChangePct: number;
  currentMembers: number;
};

type DiscussedRow = {
  partyId: string;
  issueText: string;
  discussionCount: number;
  currentMembers: number;
};

type DashboardPayload = {
  trending: TrendRow[];
  fastestGrowing: TrendRow[];
  mostDiscussed: DiscussedRow[];
  selectedScope?: Scope;
};

type PanelView = 'momentum' | 'growth' | 'discussion';

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.max(0, value));
}

function getMomentumScore(rows: TrendRow[]) {
  if (!rows.length) return 72;
  const avgPct = rows.reduce((sum, row) => sum + Math.max(0, row.memberChangePct), 0) / rows.length;
  return Math.min(95, Math.max(52, Math.round(60 + avgPct * 1.2)));
}

function getDefaultView(payload: DashboardPayload): PanelView {
  if (payload.trending.length > 0) return 'momentum';
  if (payload.fastestGrowing.length > 0) return 'growth';
  return 'discussion';
}

function TrendCard({
  item,
  rank,
  label,
  meta,
}: {
  item: { partyId: string; issueText: string; currentMembers: number };
  rank?: number;
  label: string;
  meta: string;
}) {
  return (
    <Link href={`/party/${item.partyId}`} className="card block px-4 py-4 transition hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        {typeof rank === 'number' && (
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-xs font-semibold text-accent" style={{ fontFamily: 'var(--font-mono)' }}>
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-base text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
            {item.issueText}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
            {label}
          </p>
          <p className="mt-2 text-sm text-text-secondary">{meta}</p>
        </div>
      </div>
    </Link>
  );
}

export function TrendingPanel({
  trending,
  fastestGrowing,
  mostDiscussed,
  userState,
  userDistrict,
  selectedScope,
}: {
  trending: TrendRow[];
  fastestGrowing: TrendRow[];
  mostDiscussed: DiscussedRow[];
  userState: string | null;
  userDistrict: string | null;
  selectedScope?: Scope;
}) {
  const initialScope: Scope = selectedScope || (userState ? 'state' : 'india');
  const [scope, setScope] = useState<Scope>(initialScope);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DashboardPayload>({
    trending,
    fastestGrowing,
    mostDiscussed,
    selectedScope: initialScope,
  });
  const [activeView, setActiveView] = useState<PanelView>(getDefaultView({
    trending,
    fastestGrowing,
    mostDiscussed,
    selectedScope: initialScope,
  }));

  const chips = useMemo(() => ([
    { key: 'india' as const, label: 'India' },
    { key: 'state' as const, label: userState ? `State: ${userState}` : 'My State', disabled: !userState },
    { key: 'district' as const, label: userDistrict ? `District: ${userDistrict}` : 'My District', disabled: !userDistrict },
  ]), [userDistrict, userState]);

  const moodScore = useMemo(() => getMomentumScore(data.trending), [data.trending]);
  const topConcern = data.trending[0]?.issueText || 'No group yet';
  const scopeDescriptor = scope === 'district' ? (userDistrict || 'your district') : scope === 'state' ? (userState || 'your state') : 'India';
  const topGrowth = data.fastestGrowing[0];
  const topDiscussion = data.mostDiscussed[0];

  const panelViews = useMemo(() => ([
    { id: 'momentum' as const, label: 'Most momentum', count: data.trending.length },
    { id: 'growth' as const, label: 'Fastest growing', count: data.fastestGrowing.length },
    { id: 'discussion' as const, label: 'Most discussed', count: data.mostDiscussed.length },
  ]), [data.fastestGrowing.length, data.mostDiscussed.length, data.trending.length]);

  const activeCards = useMemo(() => {
    if (activeView === 'growth') {
      return data.fastestGrowing.map((item) => ({
        partyId: item.partyId,
        issueText: item.issueText,
        currentMembers: item.currentMembers,
        label: 'Fastest growth',
        meta: `${formatCompact(item.currentMembers)} members · ${item.memberChangePct}% growth in last 7 days`,
      }));
    }

    if (activeView === 'discussion') {
      return data.mostDiscussed.map((item) => ({
        partyId: item.partyId,
        issueText: item.issueText,
        currentMembers: item.currentMembers,
        label: 'Most discussion',
        meta: `${formatCompact(item.currentMembers)} members · ${item.discussionCount} posts and questions in last 7 days`,
      }));
    }

    return data.trending.map((item) => ({
      partyId: item.partyId,
      issueText: item.issueText,
      currentMembers: item.currentMembers,
      label: 'Most momentum',
      meta: `${formatCompact(item.currentMembers)} members · +${formatCompact(item.memberChange)} this week`,
    }));
  }, [activeView, data.fastestGrowing, data.mostDiscussed, data.trending]);

  const handleScopeChange = async (nextScope: Scope) => {
    if (nextScope === scope) return;
    setScope(nextScope);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/home-dashboard?scope=${nextScope}`);
      const json = (await res.json()) as DashboardPayload;
      const nextPayload = {
        trending: json.trending || [],
        fastestGrowing: json.fastestGrowing || [],
        mostDiscussed: json.mostDiscussed || [],
        selectedScope: json.selectedScope || nextScope,
      };
      setData(nextPayload);
      setActiveView((currentView) => {
        if (currentView === 'momentum' && nextPayload.trending.length > 0) return currentView;
        if (currentView === 'growth' && nextPayload.fastestGrowing.length > 0) return currentView;
        if (currentView === 'discussion' && nextPayload.mostDiscussed.length > 0) return currentView;
        return getDefaultView(nextPayload);
      });
      if (json.selectedScope && json.selectedScope !== nextScope) {
        setScope(json.selectedScope);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="card-glass space-y-6 p-5 sm:p-6">
      <div className="editorial-section-head">
        <span className="editorial-section-head__label">What is moving</span>
        <Link href="/trends" className="text-xs text-accent" style={{ fontFamily: 'var(--font-mono)' }}>
          Full view
        </Link>
        <span className="editorial-section-head__rule" />
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            disabled={chip.disabled || isLoading}
            onClick={() => handleScopeChange(chip.key)}
            className={`editorial-chip ${chip.key === scope ? 'editorial-chip--active' : ''} ${chip.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="editorial-hero px-5 py-5 sm:px-6 sm:py-6">
        <p className="editorial-hero__eyebrow">This week in {scopeDescriptor}</p>
        <h2 className="mt-2 text-3xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
          {moodScore}% rising momentum
        </h2>
        <p className="mt-2 text-sm text-white/72">
          {topConcern} is gaining the strongest support in this scope right now.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
            <div className="text-lg text-[var(--iux-ochre2)]" style={{ fontFamily: 'var(--font-display)' }}>
              {data.trending.length}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/48" style={{ fontFamily: 'var(--font-mono)' }}>
              Groups tracked
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
            <div className="text-lg text-[var(--iux-ochre2)]" style={{ fontFamily: 'var(--font-display)' }}>
              {topGrowth ? `${topGrowth.memberChangePct}%` : '—'}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/48" style={{ fontFamily: 'var(--font-mono)' }}>
              Fastest growth
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
            <div className="text-lg text-[var(--iux-ochre2)]" style={{ fontFamily: 'var(--font-display)' }}>
              {topDiscussion ? topDiscussion.discussionCount : 0}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/48" style={{ fontFamily: 'var(--font-mono)' }}>
              Discussions in top issue
            </div>
          </div>
        </div>
      </div>

      <div className="issue-segment-bar">
        {panelViews.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => setActiveView(view.id)}
            className={`issue-segment-button ${activeView === view.id ? 'issue-segment-button--active' : ''}`}
          >
            {view.label} <span className="ml-1 opacity-70">{view.count}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <div className="space-y-3">
          {activeCards.length > 0 ? (
            activeCards.slice(0, 5).map((item, index) => (
              <TrendCard
                key={`${activeView}-${item.partyId}`}
                item={item}
                rank={index + 1}
                label={item.label}
                meta={item.meta}
              />
            ))
          ) : (
            <div className="empty-state py-10">
              <p className="text-base font-semibold text-text-primary">No live signals in this view yet</p>
              <p className="max-w-md text-sm text-text-muted">
                Try another scope or switch views to compare where support and discussion are emerging.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="editorial-subcard">
            <div className="text-[11px] uppercase tracking-[0.18em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
              Quick read
            </div>
            <p className="mt-2 text-base font-semibold text-text-primary">
              {topGrowth ? topGrowth.issueText : topDiscussion ? topDiscussion.issueText : 'Not enough data yet'}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {topGrowth
                ? `Fastest growth right now: ${topGrowth.memberChangePct}% over the last 7 days.`
                : topDiscussion
                  ? `Most conversation right now: ${topDiscussion.discussionCount} posts and questions over the last 7 days.`
                  : 'As more groups gain members and discussion, this panel will highlight the clearest signal.'}
            </p>
          </div>

          <div className="editorial-subcard">
            <div className="text-[11px] uppercase tracking-[0.18em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
              Update cadence
            </div>
            <p className="mt-2 text-base font-semibold text-text-primary">Signals are based on the last 7 days</p>
            <p className="mt-2 text-sm text-text-secondary">
              Member growth, support shifts, and discussion activity are recalculated for the current scope so you can scan momentum quickly.
            </p>
          </div>

          <Link href="/discover" className="btn btn-secondary w-full justify-center">
            Compare groups in this scope
          </Link>
        </div>
      </div>
    </section>
  );
}
