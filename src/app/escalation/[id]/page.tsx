import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { calculatePartyLevel } from '@/types/database';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EscalationPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch the source party
    const { data: sourceParty, error } = await supabase
        .from('parties')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !sourceParty) {
        notFound();
    }

    // Build escalation trail
    const trail: Array<{
        party: typeof sourceParty;
        memberCount: number;
        level: 1 | 2 | 3 | 4;
        escalatedAt: string | null;
    }> = [];

    // Add source party
    const { count: sourceCount } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', id)
        .is('left_at', null);

    trail.push({
        party: sourceParty,
        memberCount: sourceCount || 0,
        level: calculatePartyLevel(sourceCount || 0),
        escalatedAt: null
    });

    // Fetch all escalations from this party
    const { data: escalations } = await supabase
        .from('escalations')
        .select(`
      *,
      target_party:target_party_id (*)
    `)
        .eq('source_party_id', id)
        .order('created_at', { ascending: true });

    // Build the chain
    for (const esc of escalations || []) {
        const { count } = await supabase
            .from('memberships')
            .select('*', { count: 'exact', head: true })
            .eq('party_id', esc.target_party_id)
            .is('left_at', null);

        trail.push({
            party: esc.target_party,
            memberCount: count || 0,
            level: calculatePartyLevel(count || 0),
            escalatedAt: esc.created_at
        });
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            {/* Back link */}
            <Link
                href={`/party/${id}`}
                className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary mb-4"
            >
                ← Back to Party
            </Link>

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">
                    📈 Issue Escalation Trail
                </h1>
                <p className="text-sm text-text-secondary">
                    This issue has been escalated {trail.length - 1} time{trail.length - 1 !== 1 ? 's' : ''}.
                    Original party always remains visible.
                </p>
            </div>

            {/* Explanation */}
            <div className="card mb-6">
                <p className="text-sm text-text-secondary leading-relaxed">
                    <strong className="text-primary-light">How Escalation Works:</strong><br />
                    Smaller parties can link their issues to larger parties, routing pressure upward.
                    Issue history is immutable - there&apos;s no handoff, only linking. The original party
                    always stays visible and in control of their issue.
                </p>
            </div>

            {/* Escalation Trail */}
            <div className="escalation-trail">
                {trail.map((item, index) => (
                    <div key={item.party.id} className="escalation-node animate-fade-in">
                        {/* Level indicator on the left */}
                        <div className="absolute -left-12 top-2 w-8 text-[10px] text-text-muted text-right">
                            {index === 0 ? 'Origin' : `+${index}`}
                        </div>

                        {/* Timestamp */}
                        {item.escalatedAt && (
                            <div className="text-xs text-text-muted mb-2">
                                Escalated on {new Date(item.escalatedAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </div>
                        )}

                        {/* Party Info */}
                        <Link
                            href={`/party/${item.party.id}`}
                            className="block no-underline"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <span className={`badge badge-level-${item.level}`}>
                                    Level {item.level} • {item.memberCount} members
                                </span>
                                {index === 0 && (
                                    <span className="badge text-warning border-warning/40 bg-warning/10">
                                        Original
                                    </span>
                                )}
                            </div>

                            <p className="text-sm text-text-primary leading-relaxed mb-3">
                                {item.party.issue_text}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {(item.party.pincodes as string[]).slice(0, 3).map((pincode: string, idx: number) => (
                                    <span key={idx} className="pincode-tag">
                                        📍 {pincode}
                                    </span>
                                ))}
                                {item.party.pincodes.length > 3 && (
                                    <span className="pincode-tag">
                                        +{item.party.pincodes.length - 3}
                                    </span>
                                )}
                            </div>
                        </Link>

                        {/* Arrow to next */}
                        {index < trail.length - 1 && (
                            <div className="text-center text-text-muted text-xl mt-3">
                                ↓
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* No escalations yet */}
            {trail.length === 1 && (
                <div className="card mt-4 text-center">
                    <p className="text-sm text-text-muted">
                        This issue hasn&apos;t been escalated to any larger parties yet.
                    </p>
                    <p className="text-sm text-text-secondary mt-2">
                        Party leaders can escalate issues to get support from larger parties.
                    </p>
                </div>
            )}

            {/* Philosophy */}
            <div className="mt-8 rounded-xl bg-bg-tertiary px-4 py-3 text-center">
                <p className="text-xs text-text-muted">
                    🔗 No decision paralysis. Pressure routes upward while origin stays visible.
                </p>
            </div>
        </div>
    );
}
