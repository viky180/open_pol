'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserParty {
    id: string;
    issue_text: string;
    location_scope: string | null;
    location_label: string | null;
    already_in_alliance: boolean;
}

export default function CreateAlliancePage() {
    const router = useRouter();
    const supabase = createClient();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedPartyId, setSelectedPartyId] = useState('');
    const [userParties, setUserParties] = useState<UserParty[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fetchingParties, setFetchingParties] = useState(true);

    useEffect(() => {
        async function fetchUserParties() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth?returnTo=/alliance/create');
                return;
            }

            // Get parties where user is creator or leader
            const { data: memberships } = await supabase
                .from('memberships')
                .select('party_id')
                .eq('user_id', user.id)
                .is('left_at', null);

            if (!memberships || memberships.length === 0) {
                setFetchingParties(false);
                return;
            }

            const partyIds = memberships.map(m => m.party_id);

            const { data: parties } = await supabase
                .from('parties')
                .select('id, issue_text, location_scope, location_label, created_by')
                .in('id', partyIds);

            // Check which parties are already in an alliance
            const { data: allianceMembers } = await supabase
                .from('alliance_members')
                .select('party_id')
                .in('party_id', partyIds)
                .is('left_at', null);

            const inAllianceSet = new Set((allianceMembers || []).map(m => m.party_id));

            const eligibleParties = (parties || []).map(p => ({
                id: p.id,
                issue_text: p.issue_text,
                location_scope: p.location_scope,
                location_label: p.location_label,
                already_in_alliance: inAllianceSet.has(p.id),
            }));

            setUserParties(eligibleParties);
            setFetchingParties(false);
        }

        fetchUserParties();
    }, [supabase, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Alliance name is required');
            return;
        }
        if (!selectedPartyId) {
            setError('Select a group to register in this alliance');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/alliances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    party_id: selectedPartyId,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create alliance');
            }

            const alliance = await response.json();
            router.push(`/alliance/${alliance.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create alliance');
        } finally {
            setLoading(false);
        }
    };

    const availableParties = userParties.filter(p => !p.already_in_alliance);

    return (
        <div className="min-h-screen">
            <div className="border-b border-border-primary bg-bg-secondary">
                <div className="container mx-auto px-4 py-6 max-w-xl">
                    <h1 className="text-xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                        Create Alliance
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">
                        Unite groups under one banner. Combined strength for greater impact.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="form-group">
                        <label className="label" htmlFor="alliance-name">Alliance Name *</label>
                        <input
                            id="alliance-name"
                            className="input"
                            type="text"
                            placeholder="e.g. Clean Water Coalition"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            maxLength={100}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label" htmlFor="alliance-desc">Description</label>
                        <textarea
                            id="alliance-desc"
                            className="input textarea"
                            placeholder="What is this alliance about? What do the groups aim to achieve together?"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            maxLength={500}
                        />
                        <p className="form-hint">{description.length}/500</p>
                    </div>

                    <div className="form-group">
                        <label className="label">Register your group *</label>
                        <p className="form-hint mb-2">
                            Select the group you lead that will be the founding member of this alliance.
                        </p>
                        {fetchingParties ? (
                            <div className="text-sm text-text-muted">Loading your groups...</div>
                        ) : availableParties.length === 0 ? (
                            <div className="empty-state py-6">
                                <div className="empty-state-icon">🏳️</div>
                                <p className="text-sm text-text-muted">
                                    {userParties.length === 0
                                        ? 'You are not a member of any group yet.'
                                        : 'All your groups are already in an alliance.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {availableParties.map(party => (
                                    <label
                                        key={party.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedPartyId === party.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border-primary bg-bg-card hover:bg-bg-hover'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="party"
                                            value={party.id}
                                            checked={selectedPartyId === party.id}
                                            onChange={() => setSelectedPartyId(party.id)}
                                            className="accent-primary"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-text-primary">{party.issue_text}</p>
                                            {party.location_label && (
                                                <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {party.location_label}
                                                </p>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="form-error text-sm">{error}</div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        disabled={loading || !name.trim() || !selectedPartyId}
                    >
                        {loading ? 'Creating...' : 'Create Alliance'}
                    </button>
                </form>
            </div>
        </div>
    );
}
