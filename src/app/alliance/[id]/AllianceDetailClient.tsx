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
        day: 'numeric', month: 'short', year: 'numeric',
    });

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="border-b border-border-primary bg-bg-secondary">
                <div className="container mx-auto px-4 py-6 max-w-3xl">
                    <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                        <Link href="/alliances" className="hover:text-text-secondary transition-colors">Alliances</Link>
                        <span>/</span>
                        <span className="text-text-secondary">{alliance.name}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                        🤝 {alliance.name}
                    </h1>
                    {alliance.description && (
                        <p className="text-sm text-text-secondary mt-2">{alliance.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                        <span>Created {createdDate}</span>
                        {alliance.creatorName && <span>by {alliance.creatorName}</span>}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
                {/* Combined Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="stat-card">
                        <div className="stat-value text-primary">{alliance.combinedMemberCount}</div>
                        <div className="stat-label">Combined Members</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value text-accent">{alliance.groupCount}</div>
                        <div className="stat-label">Groups</div>
                    </div>
                </div>

                {/* Join / Leave Actions */}
                {currentUserId && !userPartyInAlliance && userEligiblePartyId && (
                    <div className="card">
                        <h3 className="text-sm font-semibold text-text-primary mb-2">Join this Alliance</h3>
                        <p className="text-xs text-text-secondary mb-3">
                            Add your group to this alliance. Your group&apos;s members will be counted together.
                        </p>
                        <button
                            onClick={handleJoin}
                            disabled={joinLoading}
                            className="btn btn-primary btn-sm"
                        >
                            {joinLoading ? 'Joining...' : 'Join Alliance'}
                        </button>
                    </div>
                )}

                {currentUserId && userPartyInAlliance && (
                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-success">✓ Your group is in this alliance</h3>
                            </div>
                            <button
                                onClick={handleLeave}
                                disabled={leaveLoading}
                                className="btn btn-danger btn-sm"
                            >
                                {leaveLoading ? 'Leaving...' : 'Leave'}
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="text-sm text-danger">{error}</div>
                )}

                {/* Member Groups */}
                <div>
                    <h2 className="text-lg font-semibold text-text-primary mb-4">Member Groups</h2>
                    <div className="space-y-3">
                        {alliance.members.map(member => {
                            const scopeConfig = getLocationScopeConfig(member.party.location_scope || 'district');
                            return (
                                <Link
                                    key={member.id}
                                    href={`/party/${member.party_id}`}
                                    className="block card hover:border-primary/40 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-text-primary truncate">
                                                {member.party.issue_text}
                                            </p>
                                            <p className="text-xs text-text-muted mt-1">
                                                {scopeConfig.icon} {scopeConfig.label}
                                                {member.party.location_label && ` · ${member.party.location_label}`}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-semibold text-primary">{member.memberCount}</p>
                                            <p className="text-[10px] text-text-muted uppercase tracking-wide">members</p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Location Breakdown */}
                {alliance.locationBreakdown.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-text-primary mb-4">Presence by Location</h2>
                        <div className="space-y-2">
                            {alliance.locationBreakdown.map((entry, i) => {
                                const scopeConfig = getLocationScopeConfig(entry.scope);
                                return (
                                    <div key={i} className="rounded-xl border border-border-primary bg-bg-card p-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-text-primary">
                                                {scopeConfig.icon} {entry.location}
                                            </span>
                                            <span className="text-sm font-semibold text-primary">
                                                {entry.memberCount} members
                                            </span>
                                        </div>
                                        <p className="text-xs text-text-muted">
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
