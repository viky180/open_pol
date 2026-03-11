'use client';

import Link from 'next/link';

type MomentumItem = {
  id: string;
  title: string;
  memberCount: number;
  memberChange: number;
  memberChangePct: number;
  href: string;
};

function formatDelta(memberChange: number, memberChangePct: number) {
  if (memberChange > 0) {
    return `+${memberChange.toLocaleString('en-IN')} members this week (${memberChangePct}%)`;
  }

  if (memberChange < 0) {
    return `${memberChange.toLocaleString('en-IN')} members this week`;
  }

  return 'No member change recorded this week';
}

export function UrgentIssuesCard({
  items,
  scopeLabel,
}: {
  items: MomentumItem[];
  scopeLabel: string;
}) {
  if (items.length === 0) {
    return (
      <section className="card-glass p-5 sm:p-6">
        <div className="editorial-section-head">
          <span className="editorial-section-head__label">Rising near you</span>
          <span className="editorial-section-head__rule" />
        </div>

        <div className="empty-state px-5 py-8">
          <p className="text-base font-semibold text-text-primary">Nothing is moving yet in {scopeLabel}</p>
          <p className="max-w-md text-sm text-text-muted">
            As more members join, post, and ask questions, this area will highlight the groups gaining support fastest in your current scope.
          </p>
          <Link href="/discover" className="btn btn-primary mt-2">
            Explore groups
          </Link>
        </div>
      </section>
    );
  }

  const [featuredItem, ...otherItems] = items;

  return (
    <section className="card-glass p-5 sm:p-6">
      <div className="editorial-section-head">
        <span className="editorial-section-head__label">Rising near you</span>
        <span className="editorial-section-head__count">{scopeLabel}</span>
        <span className="editorial-section-head__rule" />
      </div>

      <div className="space-y-4">
        <article className="card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge border-accent/20 bg-accent/10 text-accent">Strongest local signal</span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
              {scopeLabel}
            </span>
          </div>

          <p className="mt-4 line-clamp-3 text-2xl text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
            {featuredItem.title}
          </p>
          <p className="mt-3 text-sm text-text-secondary">
            {featuredItem.memberCount.toLocaleString('en-IN')} members are already in. {formatDelta(featuredItem.memberChange, featuredItem.memberChangePct)}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="editorial-subcard py-3">
              <div className="text-lg text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                {featuredItem.memberCount.toLocaleString('en-IN')}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                Total support
              </div>
            </div>
            <div className="editorial-subcard py-3">
              <div className="text-lg text-accent" style={{ fontFamily: 'var(--font-display)' }}>
                {featuredItem.memberChangePct}%
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                Weekly growth
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href={featuredItem.href} className="btn btn-primary flex-1">
              Open group
            </Link>
            <Link href="/discover" className="btn btn-secondary flex-1">
              Compare options
            </Link>
          </div>
        </article>

        {otherItems.length > 0 && (
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
              Also moving nearby
            </div>
            {otherItems.map((item) => (
              <article key={item.id} className="rounded-2xl border border-border-primary bg-bg-card px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-base text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">{formatDelta(item.memberChange, item.memberChangePct)}</p>
                  </div>
                  <Link href={item.href} className="badge transition hover:border-accent/30 hover:text-accent">
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
