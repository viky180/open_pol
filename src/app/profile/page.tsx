import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MeActionsCard } from '@/components/MeActionsCard';

type Party = {
    id: string;
    issue_text: string;
    pincodes: string[];
} | null;

type TrustVote = {
    expires_at: string | null;
    profiles: { display_name: string | null } | null;
} | null;

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/auth');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

    const { data: activeMembership } = await supabase
        .from('memberships')
        .select('joined_at, party:parties(id, issue_text, pincodes)')
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle() as { data: { joined_at: string; party: Party } | null };

    const { data: trustVote } = activeMembership?.party
        ? await supabase
            .from('trust_votes')
            .select('expires_at, profiles!trust_votes_to_user_id_fkey(display_name)')
            .eq('party_id', activeMembership.party.id)
            .eq('from_user_id', user.id)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle() as unknown as { data: TrustVote }
        : { data: null };

    const displayName = profile?.display_name || user.user_metadata?.full_name || user.email;

    const trustedLeaderName = trustVote?.profiles?.display_name || null;
    const trustExpiry = trustVote?.expires_at ? new Date(trustVote.expires_at).toLocaleDateString() : null;

    return (
        <div className="container mx-auto px-4 py-8 sm:py-10 max-w-3xl">
            <div className="card-glass animate-fade-in">
                <div className="flex flex-col gap-2 mb-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Me</p>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
                        {displayName}
                    </h1>
                    <p className="text-sm text-text-muted">{user.email}</p>
                </div>

                <div className="card mb-4">
                    <h2 className="text-sm font-semibold text-text-secondary mb-4">Membership card</h2>
                    {activeMembership?.party ? (
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Current group</div>
                                <Link
                                    href={`/party/${activeMembership.party.id}`}
                                    className="text-base font-semibold text-primary-light block mt-1"
                                >
                                    {activeMembership.party.issue_text}
                                </Link>
                                <p className="text-xs text-text-muted mt-2">
                                    Joined {new Date(activeMembership.joined_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Trusted leader</div>
                                <div className="text-base font-semibold text-text-primary mt-1">
                                    {trustedLeaderName || 'Not selected'}
                                </div>
                                <p className="text-xs text-text-muted mt-2">
                                    Trust can be changed or withdrawn anytime.
                                </p>
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Trust expiry</div>
                                <div className="text-base font-semibold text-text-primary mt-1">
                                    {trustExpiry || 'No expiry set'}
                                </div>
                                <p className="text-xs text-text-muted mt-2">
                                    Expired trust never locks you in.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <p className="text-sm text-text-muted">
                                You are not in a group yet.
                            </p>
                            <Link href="/discover" className="text-sm text-primary hover:underline">
                                Browse groups →
                            </Link>
                        </div>
                    )}

                    {activeMembership?.party && (
                        <div className="mt-4 pt-4 border-t border-border-primary text-xs text-text-muted">
                            Transparency: leadership votes, Q&A, and actions are public on the group page.
                        </div>
                    )}
                </div>

                {activeMembership?.party && (
                    <MeActionsCard
                        partyId={activeMembership.party.id}
                        partyName={activeMembership.party.issue_text}
                    />
                )}
            </div>
        </div>
    );
}