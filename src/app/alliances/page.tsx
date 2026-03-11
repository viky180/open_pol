import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getLocationScopeConfig } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AlliancesListPage() {
  const supabase = await createClient();

  const { data: alliances } = await supabase
    .from('alliances')
    .select('*')
    .is('disbanded_at', null)
    .order('created_at', { ascending: false });

  if (!alliances || alliances.length === 0) {
    return (
      <div className="editorial-page editorial-page--narrow py-6">
        <section className="editorial-hero">
          <p className="editorial-hero__eyebrow">Cross-group coordination</p>
          <h1 className="editorial-hero__title text-3xl sm:text-5xl">Alliances</h1>
          <p className="editorial-hero__body">When separate groups need common leverage, alliances let them combine strength without erasing differences.</p>
        </section>
        <div className="empty-state mt-6">
          <p className="text-sm font-medium text-text-primary">No alliances yet</p>
          <p className="text-sm text-text-muted">Be the first to create an alliance and unite groups for greater impact.</p>
          <Link href="/alliance/create" className="btn btn-primary mt-4">
            Create alliance
          </Link>
        </div>
      </div>
    );
  }

  const allianceIds = alliances.map((a) => a.id);
  const { data: allianceMembers } = await supabase
    .from('alliance_members')
    .select(`
      alliance_id,
      party_id,
      parties:party_id (id, issue_text, location_scope, location_label, member_count)
    `)
    .in('alliance_id', allianceIds)
    .is('left_at', null);

  const membersByAlliance = new Map<string, Array<{
    party_id: string;
    party: { id: string; issue_text: string; location_scope: string; location_label: string | null; member_count: number } | null;
  }>>();

  (allianceMembers || []).forEach((m) => {
    const bucket = membersByAlliance.get(m.alliance_id) || [];
    bucket.push({
      party_id: m.party_id,
      party: m.parties as unknown as { id: string; issue_text: string; location_scope: string; location_label: string | null; member_count: number } | null,
    });
    membersByAlliance.set(m.alliance_id, bucket);
  });

  return (
    <div className="editorial-page editorial-page--wide py-6">
      <section className="editorial-hero">
        <p className="editorial-hero__eyebrow">Cross-group coordination</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="editorial-hero__title text-3xl sm:text-5xl">Alliances</h1>
            <p className="editorial-hero__body">Groups can combine strength at a location without merging into one permanent hierarchy.</p>
          </div>
          <Link href="/alliance/create" className="btn btn-primary">
            New alliance
          </Link>
        </div>
      </section>

      <div className="mt-6 space-y-4">
        {alliances.map((alliance) => {
          const members = membersByAlliance.get(alliance.id) || [];
          const combinedMemberCount = members.reduce((sum, m) => sum + (m.party?.member_count || 0), 0);
          const groupCount = members.length;
          const scopes = new Set<string>();
          members.forEach((m) => {
            if (m.party?.location_scope) scopes.add(m.party.location_scope);
          });

          return (
            <Link key={alliance.id} href={`/alliance/${alliance.id}`} className="card block p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="badge border-primary/20 bg-primary/10 text-primary">Alliance</div>
                  <h2 className="mt-3 text-2xl text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                    {alliance.name}
                  </h2>
                  {alliance.description && (
                    <p className="mt-2 max-w-2xl text-sm text-text-secondary">{alliance.description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="editorial-chip">{groupCount} groups</span>
                    {Array.from(scopes).map((scope) => {
                      const sc = getLocationScopeConfig(scope);
                      return (
                        <span key={scope} className="editorial-chip">
                          {sc.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="grid min-w-[220px] grid-cols-2 gap-3">
                  <div className="editorial-subcard">
                    <div className="text-2xl text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                      {combinedMemberCount.toLocaleString('en-IN')}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                      Combined members
                    </div>
                  </div>
                  <div className="editorial-subcard">
                    <div className="text-2xl text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                      {groupCount}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                      Groups
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
