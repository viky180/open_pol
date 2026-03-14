'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getLocationScopeConfig } from '@/types/database';

interface AllianceMemberParty {
  id: string;
  issue_text: string;
  location_scope: string;
  location_label: string | null;
  state_name: string | null;
  district_name: string | null;
  block_name: string | null;
  panchayat_name: string | null;
  village_name: string | null;
  category_id: string | null;
  created_by: string | null;
}

interface AllianceMemberData {
  id: string;
  alliance_id: string;
  party_id: string;
  joined_at: string;
  left_at: string | null;
  party: AllianceMemberParty;
  memberCount: number;
}

interface LocationBreakdownEntry {
  scope: string;
  location: string;
  memberCount: number;
  groups: string[];
}

interface AllianceData {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  disbanded_at: string | null;
  created_by: string | null;
  creatorName: string | null;
  members: AllianceMemberData[];
  combinedMemberCount: number;
  groupCount: number;
  locationBreakdown: LocationBreakdownEntry[];
}

interface AllianceDetailClientProps {
  alliance: AllianceData;
  currentUserId: string | null;
  userEligiblePartyId: string | null;
  userPartyInAlliance: boolean;
}

export function AllianceDetailClient({
  alliance,
  currentUserId,
  userEligiblePartyId,
  userPartyInAlliance,
}: AllianceDetailClientProps) {
  const router = useRouter();
  const [joinLoading, setJoinLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!currentUserId) {
      router.push(`/auth?returnTo=/alliance/${alliance.id}`);
      return;
    }
    if (!userEligiblePartyId) return;

    setJoinLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/alliances/${alliance.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ party_id: userEligiblePartyId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join alliance');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!currentUserId || !userEligiblePartyId) return;

    setLeaveLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/alliances/${alliance.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ party_id: userEligiblePartyId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to leave alliance');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave');
    } finally {
      setLeaveLoading(false);
    }
  };

  const createdDate = new Date(alliance.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="editorial-page editorial-page--narrow py-6 sm:py-8">
      <section className="editorial-hero">
        <p className="editorial-hero__eyebrow">Alliance detail</p>
        <div className="text-xs text-white/55">
          <Link href="/alliances" className="hover:text-white">Alliances</Link> / {alliance.name}
        </div>
        <h1 className="editorial-hero__title text-3xl sm:text-5xl">{alliance.name}</h1>
        {alliance.description && <p className="editorial-hero__body">{alliance.description}</p>}
        <div className="editorial-metrics">
          <div className="editorial-metric">
            <div className="editorial-metric__value">{alliance.combinedMemberCount}</div>
            <div className="editorial-metric__label">Combined members</div>
          </div>
          <div className="editorial-metric">
            <div className="editorial-metric__value">{alliance.groupCount}</div>
            <div className="editorial-metric__label">Groups</div>
          </div>
          <div className="editorial-metric">
            <div className="editorial-metric__value">{createdDate}</div>
            <div className="editorial-metric__label">Created</div>
          </div>
          <div className="editorial-metric">
            <div className="editorial-metric__value">{alliance.creatorName || 'Open'}</div>
            <div className="editorial-metric__label">Initiated by</div>
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-6">
        {currentUserId && !userPartyInAlliance && userEligiblePartyId && (
          <div className="card">
            <div className="editorial-section-head">
              <span className="editorial-section-head__label">Join this alliance</span>
              <span className="editorial-section-head__rule" />
            </div>
            <p className="text-sm text-text-secondary">Add your group to this alliance. Your group&apos;s members will be counted together with the coalition.</p>
            <button onClick={handleJoin} disabled={joinLoading} className="btn btn-primary mt-4">
              {joinLoading ? 'Joining...' : 'Join alliance'}
            </button>
          </div>
        )}

        {currentUserId && userPartyInAlliance && (
          <div className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                  Coalition status
                </p>
                <h3 className="mt-2 text-lg text-success" style={{ fontFamily: 'var(--font-display)' }}>
                  Your group is in this alliance
                </h3>
              </div>
              <button onClick={handleLeave} disabled={leaveLoading} className="btn btn-danger btn-sm">
                {leaveLoading ? 'Leaving...' : 'Leave'}
              </button>
            </div>
          </div>
        )}

        {error && <div className="text-sm text-danger">{error}</div>}

        <div className="card-glass p-5">
          <div className="editorial-section-head">
            <span className="editorial-section-head__label">Member groups</span>
            <span className="editorial-section-head__count">{alliance.members.length}</span>
            <span className="editorial-section-head__rule" />
          </div>
          <div className="space-y-3">
            {alliance.members.map((member) => {
              const scopeConfig = getLocationScopeConfig(member.party.location_scope || 'district');
              return (
                <Link key={member.id} href={`/group/${member.party_id}`} className="card block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                        {member.party.issue_text}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                        {scopeConfig.label}{member.party.location_label ? ` · ${member.party.location_label}` : ''}
                      </p>
                    </div>
                    <div className="editorial-subcard min-w-[110px] py-3 text-right">
                      <div className="text-xl text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                        {member.memberCount}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                        Members
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {alliance.locationBreakdown.length > 0 && (
          <div className="card-glass p-5">
            <div className="editorial-section-head">
              <span className="editorial-section-head__label">Presence by location</span>
              <span className="editorial-section-head__rule" />
            </div>
            <div className="space-y-3">
              {alliance.locationBreakdown.map((entry, i) => {
                const scopeConfig = getLocationScopeConfig(entry.scope);
                return (
                  <div key={i} className="editorial-subcard">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-text-primary">{entry.location}</span>
                      <span className="badge border-accent/20 bg-accent/10 text-accent">{entry.memberCount} members</span>
                    </div>
                    <p className="mt-2 text-xs text-text-muted">
                      {scopeConfig.label} · {entry.groups.length} group{entry.groups.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
