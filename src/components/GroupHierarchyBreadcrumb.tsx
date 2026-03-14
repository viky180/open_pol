'use client';

import Link from 'next/link';
import { getLocationScopeConfig } from '@/types/database';

type AncestorNode = {
    id: string;
    location_scope: string | null;
    state_name: string | null;
    district_name: string | null;
    village_name: string | null;
    location_label: string | null;
    issue_text: string;
};

interface GroupHierarchyBreadcrumbProps {
    currentPartyId: string;
    currentScope: string | null;
    ancestors: AncestorNode[];
}

function getScopeLocationName(node: AncestorNode): string {
    if (node.location_label) return node.location_label;
    if (node.location_scope === 'village' && node.village_name) return node.village_name;
    if (node.location_scope === 'district' && node.district_name) return node.district_name;
    if (node.location_scope === 'state' && node.state_name) return node.state_name;
    return getLocationScopeConfig(node.location_scope || 'national').label;
}

export function GroupHierarchyBreadcrumb({
    currentPartyId,
    currentScope,
    ancestors,
}: GroupHierarchyBreadcrumbProps) {
    if (ancestors.length === 0) return null;

    // Build ordered chain: ancestors sorted from highest scope (national) to lowest
    const scopeRank: Record<string, number> = {
        national: 1, state: 2, district: 3, block: 4, panchayat: 5, village: 6,
    };
    const sortedAncestors = [...ancestors].sort(
        (a, b) => (scopeRank[a.location_scope || ''] ?? 99) - (scopeRank[b.location_scope || ''] ?? 99)
    );

    return (
        <nav
            aria-label="Group hierarchy"
            className="mb-4 overflow-x-auto rounded-2xl border border-border-primary bg-bg-secondary/60 px-4 py-3"
        >
            <ol className="flex flex-nowrap items-center gap-1 text-xs text-text-muted whitespace-nowrap">
                {sortedAncestors.map((ancestor, idx) => {
                    const scopeConfig = getLocationScopeConfig(ancestor.location_scope || 'national');
                    const locationName = getScopeLocationName(ancestor);
                    const isCurrent = ancestor.id === currentPartyId;

                    return (
                        <li key={ancestor.id} className="flex items-center gap-1">
                            {idx > 0 && (
                                <span className="text-text-muted/50" aria-hidden="true">→</span>
                            )}
                            {isCurrent ? (
                                <span
                                    className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-medium text-primary"
                                    aria-current="page"
                                >
                                    <span aria-hidden="true">{scopeConfig.icon}</span>
                                    {locationName}
                                </span>
                            ) : (
                                <Link
                                    href={`/group/${ancestor.id}`}
                                    className="inline-flex items-center gap-1 rounded-full border border-border-primary bg-bg-primary px-2 py-0.5 transition hover:border-accent/30 hover:text-accent"
                                >
                                    <span aria-hidden="true">{scopeConfig.icon}</span>
                                    {locationName}
                                </Link>
                            )}
                        </li>
                    );
                })}

                {/* Show current node if it wasn't included in ancestors */}
                {!sortedAncestors.find(a => a.id === currentPartyId) && (
                    <li className="flex items-center gap-1">
                        {sortedAncestors.length > 0 && (
                            <span className="text-text-muted/50" aria-hidden="true">→</span>
                        )}
                        <span
                            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-medium text-primary"
                            aria-current="page"
                        >
                            <span aria-hidden="true">{getLocationScopeConfig(currentScope || 'district').icon}</span>
                            {getLocationScopeConfig(currentScope || 'district').label}
                        </span>
                    </li>
                )}
            </ol>
        </nav>
    );
}
