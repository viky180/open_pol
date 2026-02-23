'use client';

import type { Party } from '@/types/database';
import { trackShareEvent } from '@/lib/share';
import { GroupHierarchyActions } from '@/components/GroupHierarchyActions';
import { getProgressTarget, getProgressHint, type PrimaryAction } from './PartyDetailShared';
import { PartyMembershipActions } from './PartyDetailChrome';

interface PartySidebarProps {
    party: Party;
    totalBackers: number;
    directMemberCount: number;
    supporterGroupMemberCount: number;
    lastActiveLabel: string;
    primaryAction: PrimaryAction;
    createChildGroupHref: string;
    createForkHref?: string | null;
    hasMembershipElsewhere: boolean;
    singleMembershipHint: string;
    whatsappShareUrl: string;
    xShareUrl: string;
    handleNativeShare: () => void;
    shareToast: string | null;
    showShareActions: boolean;
    currentParentParty: Party | null;
    canManageHierarchy: boolean;
    isAdmin: boolean;
    availableForHierarchy: Party[];
    onHierarchyChange: () => void;
    membershipCardLoading: boolean;
}

export function PartySidebar({
    party,
    totalBackers,
    directMemberCount,
    supporterGroupMemberCount,
    lastActiveLabel,
    primaryAction,
    createChildGroupHref,
    createForkHref,
    hasMembershipElsewhere,
    singleMembershipHint,
    whatsappShareUrl,
    xShareUrl,
    handleNativeShare,
    shareToast,
    showShareActions,
    currentParentParty,
    canManageHierarchy,
    isAdmin,
    availableForHierarchy,
    onHierarchyChange,
    membershipCardLoading,
}: PartySidebarProps) {
    return (
        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
            <div className="sticky-sidebar">
                <div className="brand-panel p-6">
                    {membershipCardLoading && (
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-primary bg-bg-tertiary px-3 py-1 text-xs text-text-muted">
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-text-muted/60 border-t-transparent" />
                            Updating membership...
                        </div>
                    )}

                    <div className="mb-6">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Support snapshot</p>
                        <div className="text-4xl font-bold text-text-primary mt-1" style={{ fontFamily: 'var(--font-display)' }}>
                            {totalBackers}
                        </div>
                        <div className="text-text-muted mt-1">{totalBackers === 1 ? 'person' : 'people'} backing this issue</div>

                        {supporterGroupMemberCount > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                                <span>{directMemberCount} direct</span>
                                <span className="h-1 w-1 rounded-full bg-border-secondary" />
                                <span>{supporterGroupMemberCount} from sub-groups</span>
                            </div>
                        )}

                        <div className="mt-4">
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar-fill progress-bar-animated"
                                    style={{ width: `${Math.min((totalBackers / getProgressTarget(totalBackers)) * 100, 100)}%` }}
                                />
                            </div>
                            <div className="text-xs text-text-muted mt-2">{getProgressHint(totalBackers)}</div>
                        </div>

                        <div className="mt-4 text-sm text-text-secondary">{lastActiveLabel}</div>
                    </div>

                    <PartyMembershipActions
                        primaryAction={primaryAction}
                        createChildGroupHref={createChildGroupHref}
                        parentScope={party.location_scope || null}
                        createForkHref={createForkHref}
                        hasMembershipElsewhere={hasMembershipElsewhere}
                        singleMembershipHint={singleMembershipHint}
                        mode="sidebar"
                    />

                    {showShareActions && (
                        <div className="border-t border-border-primary pt-4">
                            <div className="text-xs font-medium text-text-muted uppercase tracking-[0.14em] mb-3">Share this issue</div>
                            <div className="grid grid-cols-3 gap-2">
                                <a
                                    href={whatsappShareUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-secondary btn-sm justify-center"
                                    onClick={() => trackShareEvent({ platform: 'whatsapp', partyId: party.id, source: 'sidebar' })}
                                >
                                    WhatsApp
                                </a>
                                <a
                                    href={xShareUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-secondary btn-sm justify-center"
                                    onClick={() => trackShareEvent({ platform: 'x', partyId: party.id, source: 'sidebar' })}
                                >
                                    X
                                </a>
                                <button type="button" onClick={handleNativeShare} className="btn btn-secondary btn-sm justify-center">
                                    Copy
                                </button>
                            </div>
                            {shareToast && <div className="text-xs text-success text-center mt-2">{shareToast}</div>}
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-border-primary">
                        <GroupHierarchyActions
                            party={party}
                            currentParentParty={currentParentParty}
                            canManageHierarchy={canManageHierarchy}
                            isAdmin={isAdmin}
                            availableParties={availableForHierarchy}
                            onHierarchyChange={onHierarchyChange}
                        />
                    </div>
                </div>
            </div>
        </aside>
    );
}
