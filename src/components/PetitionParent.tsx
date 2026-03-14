'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Hourglass, Eye, CheckCircle, type LucideProps } from 'lucide-react';

interface Petition {
    id: string;
    from_party_id: string;
    to_party_id: string;
    petition_text: string;
    status: 'pending' | 'acknowledged' | 'addressed';
    created_by: string;
    created_at: string;
    updated_at: string;
}

interface PetitionParentProps {
    partyId: string;
    parentPartyId: string | null;
    parentPartyName: string | null;
    isLeader: boolean;
    /** True when viewing the main movement (to manage incoming petitions) */
    isParentView?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: React.ComponentType<LucideProps> }> = {
    pending: { label: 'Pending', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', Icon: Hourglass },
    acknowledged: { label: 'Acknowledged', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', Icon: Eye },
    addressed: { label: 'Addressed', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', Icon: CheckCircle },
};

export function PetitionParent({
    partyId,
    parentPartyId,
    parentPartyName,
    isLeader,
    isParentView = false,
}: PetitionParentProps) {
    const [petitions, setPetitions] = useState<Petition[]>([]);
    const [newPetition, setNewPetition] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const fetchPetitions = useCallback(async () => {
        try {
            const res = await fetch(`/api/parties/${partyId}/petition-parent`);
            if (res.ok) {
                const data = await res.json();
                setPetitions(data);
            }
        } catch {
            // silent fail
        } finally {
            setIsLoading(false);
        }
    }, [partyId]);

    useEffect(() => {
        fetchPetitions();
    }, [fetchPetitions]);

    const handleSubmit = async () => {
        if (!newPetition.trim() || newPetition.trim().length < 10) {
            setError('Petition must be at least 10 characters.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`/api/parties/${partyId}/petition-parent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ petition_text: newPetition.trim() }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Failed to submit petition');
                return;
            }
            setNewPetition('');
            setSuccessMsg('Petition sent to main movement');
            setTimeout(() => setSuccessMsg(null), 3000);
            fetchPetitions();
        } catch {
            setError('Network error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusUpdate = async (petitionId: string, status: 'acknowledged' | 'addressed') => {
        try {
            const res = await fetch(`/api/parties/${partyId}/petition-parent`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ petition_id: petitionId, status }),
            });
            if (res.ok) {
                fetchPetitions();
            }
        } catch {
            // silent fail
        }
    };

    // Don't render if there's no main movement and we're not viewing as main movement
    if (!parentPartyId && !isParentView) return null;

    const sentPetitions = petitions.filter(p => p.from_party_id === partyId);
    const receivedPetitions = petitions.filter(p => p.to_party_id === partyId);
    const displayPetitions = isParentView ? receivedPetitions : sentPetitions;

    return (
        <div className="rounded-xl border border-border-primary bg-bg-card p-4 space-y-4">
            <div>
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                    {isParentView ? 'Petitions from local chapters' : 'Petition the main movement'}
                </p>
                <p className="text-sm text-text-secondary mt-1">
                    {isParentView
                        ? 'Local chapters can send you demands. Acknowledge or address them to maintain coalition trust.'
                        : `Send structured demands to ${parentPartyName || 'the main movement'}. If they don\u2019t respond, consider walking away.`
                    }
                </p>
            </div>

            {/* Submit new petition (only for local chapter leaders) */}
            {!isParentView && isLeader && parentPartyId && (
                <div className="space-y-2">
                    <textarea
                        value={newPetition}
                        onChange={(e) => setNewPetition(e.target.value)}
                        placeholder="What should the main movement do for your members? (min 10 characters)"
                        className="w-full rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none"
                        rows={3}
                        maxLength={2000}
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted">{newPetition.length}/2000</span>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || newPetition.trim().length < 10}
                            className="btn btn-primary btn-sm"
                        >
                            {isSubmitting ? 'Sending...' : '📨 Send petition'}
                        </button>
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    {successMsg && <p className="text-xs text-success">{successMsg}</p>}
                </div>
            )}

            {/* Petitions list */}
            {isLoading ? (
                <div className="text-sm text-text-muted">Loading petitions...</div>
            ) : displayPetitions.length === 0 ? (
                <div className="rounded-lg border border-border-primary bg-bg-tertiary/30 p-3 text-center">
                    <p className="text-sm text-text-muted">
                        {isParentView ? 'No petitions received yet.' : 'No petitions sent yet.'}
                    </p>
                    {!isParentView && isLeader && (
                        <p className="text-xs text-text-muted mt-1">
                            Use petitions to make your group&apos;s demands visible to the broader coalition.
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {displayPetitions.map((petition) => {
                        const config = STATUS_CONFIG[petition.status];
                        return (
                            <div
                                key={petition.id}
                                className="rounded-lg border border-border-primary bg-bg-tertiary/30 p-3 space-y-2"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm text-text-primary flex-1">{petition.petition_text}</p>
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${config.color}`}>
                                        <config.Icon className="w-3 h-3" /> {config.label}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-text-muted">
                                        {new Date(petition.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </span>

                                    {/* Main movement leader can update status */}
                                    {isParentView && isLeader && petition.status !== 'addressed' && (
                                        <div className="flex gap-1">
                                            {petition.status === 'pending' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusUpdate(petition.id, 'acknowledged')}
                                                    className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
                                                >
                                                    <Eye className="w-3 h-3" /> Acknowledge
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleStatusUpdate(petition.id, 'addressed')}
                                                className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
                                            >
                                                <CheckCircle className="w-3 h-3" /> Mark addressed
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
