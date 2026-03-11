'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import type { Party } from '@/types/database';
import { getLocationScopeConfig, getLocationScopeRank, getPartyLocationLabel } from '@/types/database';

type PartyWithMemberCount = Party & { member_count?: number };

type GroupHierarchyActionsProps = {
    party: Party;
    currentParentParty: Party | null;
    canManageHierarchy: boolean;
    isAdmin: boolean;
    availableParties: PartyWithMemberCount[];
    currentMemberCount?: number;
    onHierarchyChange: () => void;
    parentLastActive?: string | null;
    parentHasLeader?: boolean;
};

function getNodeTypeIcon(nodeType: string | undefined) {
    switch (nodeType) {
        case 'community': return '🌐';
        case 'sub_community': return '📁';
        default: return '👥';
    }
}

export function GroupHierarchyActions({
    party,
    currentParentParty,
    canManageHierarchy,
    isAdmin,
    availableParties,
    onHierarchyChange,
    parentLastActive,
    parentHasLeader,
}: GroupHierarchyActionsProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedParent, setSelectedParent] = useState<PartyWithMemberCount | null>(null);
    const [showMakeIndependentConfirm, setShowMakeIndependentConfirm] = useState(false);
    const [showMovementMenu, setShowMovementMenu] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const movementMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!showMovementMenu) return;

        const handleOutsideClick = (event: MouseEvent) => {
            if (!movementMenuRef.current?.contains(event.target as Node)) {
                setShowMovementMenu(false);
                setShowMakeIndependentConfirm(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [showMovementMenu]);

    const postMoveWithTimeout = async (parentPartyId: string | null) => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 15000);

        try {
            const res = await fetch(`/api/parties/${party.id}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_party_id: parentPartyId }),
                signal: controller.signal,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to move group');
            }

            return res;
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            throw err;
        } finally {
            window.clearTimeout(timeout);
        }
    };

    const filteredParties = useMemo(() => {
        // Only show parents with equal or broader location scope
        const currentRank = getLocationScopeRank(party.location_scope || 'district');
        const scopeFiltered = availableParties.filter(p => {
            const parentRank = getLocationScopeRank(p.location_scope || 'district');
            return parentRank <= currentRank;
        });
        if (!searchQuery.trim()) return scopeFiltered;
        const q = searchQuery.toLowerCase();
        return scopeFiltered.filter(p =>
            p.issue_text.toLowerCase().includes(q) ||
            p.pincodes?.some(pin => pin.includes(q))
        );
    }, [availableParties, searchQuery, party.location_scope]);

    if (!user) return null;

    const handleMove = async (targetPartyId: string) => {
        if (isLoading) return;
        setIsLoading(true);
        setError(null);

        try {
            await postMoveWithTimeout(targetPartyId);

            setShowPicker(false);
            setSelectedParent(null);
            setSearchQuery('');
            onHierarchyChange();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to move group');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMakeIndependent = async () => {
        if (isLoading) return;
        setIsLoading(true);
        setError(null);

        try {
            await postMoveWithTimeout(null);

            setShowMakeIndependentConfirm(false);
            setShowMovementMenu(false);
            onHierarchyChange();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to make group independent');
        } finally {
            setIsLoading(false);
        }
    };

    const openMovementPicker = () => {
        if (isLoading) return;
        setShowMakeIndependentConfirm(false);
        setShowMovementMenu(false);
        setShowPicker(true);
    };

    const closePicker = () => {
        if (isLoading) return;
        setShowPicker(false);
        setSelectedParent(null);
        setSearchQuery('');
        setError(null);
    };

    const handleDelete = async () => {
        if (!isAdmin || isLoading) return;
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/parties/${party.id}`, {
                method: 'DELETE',
            });

            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload?.error || 'Failed to delete group');
            }

            setShowDeleteConfirm(false);
            router.push('/discover');
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete group');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* --- Current Status + Actions --- */}
            <div className="rounded-xl border border-border-primary bg-bg-card p-4 space-y-3">
                <div className="rounded-lg border border-border-primary bg-bg-tertiary/40 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Group connections</p>
                    <p className="text-sm text-text-secondary mt-1">
                        Connect to a larger movement or stay independent. Your group identity stays the same.
                    </p>
                </div>

                {/* Current parent info */}
                {currentParentParty ? (
                    <div className="flex items-center gap-3 text-sm">
                        <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-base shrink-0">
                            📁
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-muted">Main movement</p>
                            <Link
                                href={`/party/${currentParentParty.id}`}
                                className="block font-medium text-text-primary truncate hover:text-primary hover:underline"
                            >
                                {currentParentParty.issue_text}
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 text-sm">
                        <span className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-base shrink-0">
                            📂
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-muted">Independent group</p>
                            <p className="text-sm text-text-secondary">Connect to a bigger movement any time.</p>
                        </div>
                        <span className="badge text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary">
                            {getLocationScopeConfig(party.location_scope || 'district').icon} {getLocationScopeConfig(party.location_scope || 'district').label}
                        </span>
                    </div>
                )}

                {/* Optional nudge */}
                {currentParentParty && (() => {
                    const daysSince = parentLastActive
                        ? Math.floor((Date.now() - new Date(parentLastActive).getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                    const showNudge = (daysSince !== null && daysSince > 14) || parentHasLeader === false;
                    if (!showNudge) return null;
                    return (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                            <p className="text-sm font-medium text-amber-700">Suggestion</p>
                            {daysSince !== null && daysSince > 14 && (
                                <p className="text-xs text-amber-700">The main movement hasn&apos;t been active in {daysSince} days.</p>
                            )}
                            {parentHasLeader === false && (
                                <p className="text-xs text-amber-700">The main movement has no elected leader.</p>
                            )}
                            <p className="text-xs text-text-muted">If this main movement is inactive, you can leave and stay independent.</p>
                        </div>
                    );
                })()}

                {/* Action buttons */}
                {canManageHierarchy ? (
                    <div className="flex flex-wrap gap-2">
                        <div ref={movementMenuRef} className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMovementMenu((prev) => !prev);
                                    setShowMakeIndependentConfirm(false);
                                }}
                                disabled={isLoading}
                                aria-haspopup="menu"
                                aria-expanded={showMovementMenu}
                                className="btn btn-primary btn-sm"
                            >
                                Movement Settings
                            </button>

                            {showMovementMenu && (
                                <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-border-primary bg-bg-primary p-2 shadow-lg">
                                    <button
                                        type="button"
                                        onClick={openMovementPicker}
                                        disabled={isLoading}
                                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary"
                                    >
                                        {currentParentParty ? 'Switch movement' : 'Join a movement'}
                                    </button>

                                    {currentParentParty && (
                                        showMakeIndependentConfirm ? (
                                            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                                                <p className="text-xs text-text-secondary">Make this group independent?</p>
                                                <div className="mt-2 flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={handleMakeIndependent}
                                                        disabled={isLoading}
                                                        className="text-xs font-medium text-red-500 hover:text-red-600"
                                                    >
                                                        {isLoading ? '...' : 'Yes'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowMakeIndependentConfirm(false)}
                                                        className="text-xs font-medium text-text-muted hover:text-text-primary"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setShowMakeIndependentConfirm(true)}
                                                disabled={isLoading}
                                                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary"
                                            >
                                                Make Independent
                                            </button>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        {isAdmin && (
                            <>
                                {showDeleteConfirm ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
                                        <span className="text-xs text-text-secondary">Delete this group and all child groups?</span>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={isLoading}
                                            className="text-xs font-medium text-red-500 hover:text-red-600"
                                        >
                                            {isLoading ? '...' : '🗑️ Yes'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="text-xs font-medium text-text-muted hover:text-text-primary"
                                        >
                                            ✗ No
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={isLoading}
                                        className="btn btn-secondary btn-sm flex items-center gap-1.5 text-red-500 border-red-500/30 hover:bg-red-500/10"
                                    >
                                        🗑️ Delete group
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-text-muted">
                        Only the group leader or an admin can change community settings.
                    </p>
                )}

                {/* Error display */}
                {error && !showPicker && (
                    <p className="text-xs text-red-500">{error}</p>
                )}
            </div>

            {/* --- Parent Picker Modal --- */}
            {showPicker && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={closePicker}
                    />
                    <div className="relative w-full max-w-md bg-bg-primary border border-border-primary rounded-2xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="p-5 pb-3 border-b border-border-primary">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-text-primary">
                                    📂 Join a movement
                                </h3>
                                <button
                                    type="button"
                                    onClick={closePicker}
                                    disabled={isLoading}
                                    className="w-8 h-8 rounded-lg hover:bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            <p className="text-sm text-text-secondary mb-3">
                                Pick a movement to join. You can switch any time without losing members.
                            </p>
                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search movements..."
                                    className="w-full px-4 py-2.5 pl-10 rounded-xl bg-bg-tertiary border border-border-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                    autoFocus
                                />
                                <svg
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[50vh] overflow-y-auto p-3 space-y-2">
                            {filteredParties.length === 0 ? (
                                <div className="text-center py-8 text-sm text-text-muted">
                                    {searchQuery ? 'No movements match your search' : 'No movements available'}
                                </div>
                            ) : (
                                filteredParties.map((p) => {
                                    const isSelected = selectedParent?.id === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setSelectedParent(isSelected ? null : p)}
                                            disabled={isLoading}
                                            className={`w-full text-left p-3 rounded-xl border transition-all ${isSelected
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                : 'border-border-primary hover:border-primary/40 hover:bg-bg-tertiary/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="w-9 h-9 rounded-lg bg-bg-tertiary flex items-center justify-center text-lg shrink-0">
                                                    {getNodeTypeIcon(p.node_type)}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-text-primary line-clamp-2">
                                                        {p.issue_text}
                                                    </p>
                                                    <p className="text-xs text-text-muted mt-0.5">
                                                        {p.member_count ?? 0} members
                                                        {` • 📍 ${getPartyLocationLabel(p)}`}
                                                        {` • ${getLocationScopeConfig(p.location_scope || 'district').icon} ${getLocationScopeConfig(p.location_scope || 'district').label}`}
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs shrink-0">
                                                        ✓
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Confirm bar */}
                        {selectedParent && (
                            <div className="border-t border-border-primary p-4 bg-bg-tertiary/30">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-text-secondary">
                                            Join <strong className="text-text-primary">{selectedParent.issue_text.slice(0, 40)}{selectedParent.issue_text.length > 40 ? '...' : ''}</strong>?
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedParent(null)}
                                            disabled={isLoading}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMove(selectedParent.id)}
                                            disabled={isLoading}
                                            className="btn btn-primary btn-sm"
                                        >
                                            {isLoading ? 'Joining...' : 'Join'}
                                        </button>
                                    </div>
                                </div>
                                {error && (
                                    <p className="text-xs text-red-500 mt-2">{error}</p>
                                )}
                            </div>
                        )}

                        {/* Footer when nothing selected */}
                        {!selectedParent && (
                            <div className="border-t border-border-primary p-4">
                                <button
                                    type="button"
                                    onClick={closePicker}
                                    disabled={isLoading}
                                    className="btn btn-secondary w-full"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
