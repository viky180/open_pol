import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getLocationScopeConfig } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AlliancesListPage() {
    const supabase = await createClient();

    // Fetch all active alliances
    const { data: alliances } = await supabase
        .from('alliances')
        .select('*')
        .is('disbanded_at', null)
        .order('created_at', { ascending: false });

    if (!alliances || alliances.length === 0) {
        return (
            <div className="min-h-screen">
                <div className="border-b border-border-primary bg-bg-secondary">
                    <div className="container mx-auto px-4 py-6 max-w-3xl">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                                Alliances
                            </h1>
                            <Link href="/alliance/create" className="btn btn-primary btn-sm">
                                + New Alliance
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="container mx-auto px-4 py-16 max-w-3xl">
                    <div className="empty-state">
                        <div className="empty-state-icon">🤝</div>
                        <p className="text-sm font-medium text-text-primary">No alliances yet</p>
                        <p className="text-sm text-text-muted">
                            Be the first to create an alliance and unite groups for greater impact.
                        </p>
                        <Link href="/alliance/create" className="btn btn-primary btn-sm mt-4">
                            Create Alliance
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const allianceIds = alliances.map(a => a.id);

    // Fetch all active alliance members with party data
    const { data: allianceMembers } = await supabase
        .from('alliance_members')
        .select(`
            alliance_id,
            party_id,
            parties:party_id (id, issue_text, location_scope, location_label, member_count)
        `)
        .in('alliance_id', allianceIds)
        .is('left_at', null);

    // Group members by alliance
    const membersByAlliance = new Map<string, Array<{
        party_id: string;
        party: { id: string; issue_text: string; location_scope: string; location_label: string | null; member_count: number } | null;
    }>>();

    (allianceMembers || []).forEach(m => {
        const bucket = membersByAlliance.get(m.alliance_id) || [];
        bucket.push({
            party_id: m.party_id,
            party: m.parties as unknown as { id: string; issue_text: string; location_scope: string; location_label: string | null; member_count: number } | null,
        });
        membersByAlliance.set(m.alliance_id, bucket);
    });

    return (
        <div className="min-h-screen">
            <div className="border-b border-border-primary bg-bg-secondary">
                <div className="container mx-auto px-4 py-6 max-w-3xl">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                            Alliances
                        </h1>
                        <Link href="/alliance/create" className="btn btn-primary btn-sm">
                            + New Alliance
                        </Link>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                        Groups united under shared goals, treated as one for comparison at each location.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-3xl">
                <div className="space-y-4">
                    {alliances.map(alliance => {
                        const members = membersByAlliance.get(alliance.id) || [];
                        const combinedMemberCount = members.reduce((sum, m) => {
                            return sum + (m.party?.member_count || 0);
                        }, 0);
                        const groupCount = members.length;

                        // Collect unique scopes
                        const scopes = new Set<string>();
                        members.forEach(m => {
                            if (m.party?.location_scope) scopes.add(m.party.location_scope);
                        });

                        return (
                            <Link
                                key={alliance.id}
                                href={`/alliance/${alliance.id}`}
                                className="block card hover:border-primary/40 transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-base font-semibold text-text-primary">
                                            🤝 {alliance.name}
                                        </h2>
                                        {alliance.description && (
                                            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                                                {alliance.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                                            <span>{groupCount} group{groupCount !== 1 ? 's' : ''}</span>
                                            {Array.from(scopes).map(s => {
                                                const sc = getLocationScopeConfig(s);
                                                return <span key={s}>{sc.icon} {sc.label}</span>;
                                            })}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-lg font-bold text-primary">{combinedMemberCount}</p>
                                        <p className="text-[10px] text-text-muted uppercase tracking-wide">combined</p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
