import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MeActionsCard } from '@/components/MeActionsCard';
import { UpdateLocationButton } from '@/components/UpdateLocationButton';

type Party = {
  id: string;
  issue_text: string;
  pincodes: string[];
} | null;

type TrustVote = {
  expires_at: string | null;
  profiles: { display_name: string | null } | null;
} | null;

type UserProfile = {
  display_name: string | null;
  country: string | null;
  state: string | null;
  area_type: string | null;
  city: string | null;
  corporation: string | null;
  ward: string | null;
  locality: string | null;
  district: string | null;
  block: string | null;
  panchayat: string | null;
  village: string | null;
};

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, country, state, area_type, city, corporation, ward, locality, district, block, panchayat, village')
    .eq('id', user.id)
    .maybeSingle() as { data: UserProfile | null };

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
  const locationParts = [
    profile?.state ? `State: ${profile.state}` : null,
    profile?.district ? `District: ${profile.district}` : null,
    profile?.city ? `City: ${profile.city}` : null,
    profile?.village ? `Village: ${profile.village}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="editorial-page editorial-page--narrow py-6 sm:py-8">
      <section className="editorial-hero">
        <p className="editorial-hero__eyebrow">Profile</p>
        <h1 className="editorial-hero__title text-3xl sm:text-5xl">{displayName}</h1>
        <p className="editorial-hero__body">{user.email}</p>
      </section>

      <div className="mt-6 space-y-4">
        <div className="card-glass p-5">
          <div className="editorial-section-head">
            <span className="editorial-section-head__label">Your current membership</span>
            <span className="editorial-section-head__rule" />
          </div>

          {activeMembership?.party ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="editorial-subcard">
                <div className="text-[11px] uppercase tracking-[0.18em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                  Current group
                </div>
                <Link href={`/group/${activeMembership.party.id}`} className="editorial-link mt-2 block text-base font-semibold">
                  {activeMembership.party.issue_text}
                </Link>
                <p className="mt-3 text-xs text-text-muted">Joined {new Date(activeMembership.joined_at).toLocaleDateString()}</p>
              </div>

              <div className="editorial-subcard">
                <div className="text-[11px] uppercase tracking-[0.18em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                  Representative you support
                </div>
                <div className="mt-2 text-base font-semibold text-text-primary">{trustedLeaderName || 'Not selected'}</div>
                <p className="mt-3 text-xs text-text-muted">You can change or withdraw this support any time.</p>
              </div>

              <div className="editorial-subcard">
                <div className="text-[11px] uppercase tracking-[0.18em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                  Renewal status
                </div>
                <div className="mt-2 text-base font-semibold text-text-primary">{trustedLeaderName ? 'Active' : 'No active support'}</div>
                <p className="mt-3 text-xs text-text-muted">The app will ask you to reconfirm this support every 6 months.</p>
              </div>
            </div>
          ) : (
            <div className="card">
              <p className="text-sm text-text-muted">You are not in a group yet.</p>
              <Link href="/discover" className="btn btn-primary mt-4">
                Browse groups
              </Link>
            </div>
          )}
        </div>

        {activeMembership?.party && (
          <MeActionsCard
            partyId={activeMembership.party.id}
            partyName={activeMembership.party.issue_text}
          />
        )}

        <div className="card-glass p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="editorial-section-head mb-0">
              <span className="editorial-section-head__label">Profile location</span>
              <span className="editorial-section-head__rule" />
            </div>
            <UpdateLocationButton />
          </div>
          <div className="mt-4">
            {locationParts.length > 0 ? (
              <div className="grid gap-2 text-sm text-text-primary">
                {locationParts.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No location saved yet.</p>
            )}
            <p className="mt-3 text-xs text-text-muted">Area type: {profile?.area_type || 'not set'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
