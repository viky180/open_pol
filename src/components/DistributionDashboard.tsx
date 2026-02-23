'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    LOCATION_SCOPE_LEVELS,
    getLocationScopeConfig,
    type LocationScope,
} from '@/types/database';

type ScopeFilters = {
    state_name?: string;
    district_name?: string;
    block_name?: string;
    panchayat_name?: string;
    village_name?: string;
};

type CompareOption = {
    key: string;
    label: string;
    groupCount: number;
    memberCount: number;
    filters: ScopeFilters;
};

type UnitDistribution = {
    key: string;
    label: string;
    filters: ScopeFilters;
    groupCount: number;
    memberCount: number;
    categoryDistribution: Array<{
        categoryId: string | null;
        categoryName: string;
        groupCount: number;
        memberCount: number;
        groupSharePct: number;
        memberSharePct: number;
    }>;
};

type MatrixColumn = {
    categoryId: string | null;
    categoryName: string;
};

type DistributionResponse = {
    scope: LocationScope;
    scopeConfig: { label: string; icon: string };
    parentFilters: ScopeFilters;
    breadcrumbs: Array<{ scope: LocationScope; label: string; filters: ScopeFilters }>;
    nextLevel: ({ scope: LocationScope; label: string; icon: string } | null);
    compareOptions: CompareOption[];
    selectedCompareKeys: string[];
    units: UnitDistribution[];
    categories: MatrixColumn[];
    groupCategoryMatrix: {
        columns: MatrixColumn[];
        rows: Array<{
            groupId: string;
            groupName: string;
            unitKey: string;
            unitLabel: string;
            memberCount: number;
            primaryCategoryName: string;
            cells: Array<{
                categoryId: string | null;
                categoryName: string;
                value: number | null;
                display: string;
            }>;
            alliance: {
                allianceId: string | null;
                allianceName: string | null;
                combinedMemberCount: number | null;
                alliedCategories: string[];
            };
        }>;
    };
    meta: {
        totalGroups: number;
        totalMembers: number;
        compareCount: number;
    };
};

type ViewTab = 'issuesAcrossGroups' | 'groupsAcrossIssues';

function toParams(scope: LocationScope, filters: ScopeFilters, compareKeys: string[]) {
    const sp = new URLSearchParams();
    sp.set('scope', scope);
    if (filters.state_name) sp.set('state_name', filters.state_name);
    if (filters.district_name) sp.set('district_name', filters.district_name);
    if (filters.block_name) sp.set('block_name', filters.block_name);
    if (filters.panchayat_name) sp.set('panchayat_name', filters.panchayat_name);
    if (filters.village_name) sp.set('village_name', filters.village_name);
    if (compareKeys.length > 0) sp.set('compare', compareKeys.join(','));
    return sp;
}

function countActiveFilters(filters: ScopeFilters): number {
    return Object.values(filters).filter(Boolean).length;
}

export function DistributionDashboard() {
    const [scope, setScope] = useState<LocationScope>('state');
    const [filters, setFilters] = useState<ScopeFilters>({});
    const [compareKeys, setCompareKeys] = useState<string[]>([]);
    const [tab, setTab] = useState<ViewTab>('issuesAcrossGroups');
    const [data, setData] = useState<DistributionResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const queryKey = useMemo(
        () => `${scope}|${JSON.stringify(filters)}|${compareKeys.join(',')}`,
        [scope, filters, compareKeys]
    );

    useEffect(() => {
        let active = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = toParams(scope, filters, compareKeys);
                const response = await fetch(`/api/analytics/distribution?${params.toString()}`);
                const payload = await response.json();
                if (!response.ok) {
                    throw new Error(payload?.error || 'Failed to load distribution data');
                }
                if (!active) return;
                setData(payload as DistributionResponse);

                const requested = compareKeys.join(',');
                const resolved = (payload.selectedCompareKeys || []).join(',');
                if (requested !== resolved) {
                    setCompareKeys(payload.selectedCompareKeys || []);
                }
            } catch (err) {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Failed to load distribution data');
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [queryKey, scope, filters, compareKeys]);

    const handleScopeChange = (nextScope: LocationScope) => {
        setScope(nextScope);
        setCompareKeys([]);

        const nextRank = LOCATION_SCOPE_LEVELS.find((s) => s.value === nextScope)?.rank || 99;
        const trimmed: ScopeFilters = {};
        if (nextRank >= 2 && filters.state_name) trimmed.state_name = filters.state_name;
        if (nextRank >= 3 && filters.district_name) trimmed.district_name = filters.district_name;
        if (nextRank >= 4 && filters.block_name) trimmed.block_name = filters.block_name;
        if (nextRank >= 5 && filters.panchayat_name) trimmed.panchayat_name = filters.panchayat_name;
        if (nextRank >= 6 && filters.village_name) trimmed.village_name = filters.village_name;
        setFilters(trimmed);
    };

    const toggleCompare = (key: string) => {
        setCompareKeys((current) => {
            if (current.includes(key)) return current.filter((k) => k !== key);
            if (current.length >= 6) return current;
            return [...current, key];
        });
    };

    const drillDown = (option: CompareOption) => {
        if (!data?.nextLevel) return;
        setScope(data.nextLevel.scope);
        setFilters(option.filters || {});
        setCompareKeys([]);
    };

    return (
        <section className="brand-panel p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-text-primary">Issue ↔ Group Distribution by Location</h2>
                    <p className="text-sm text-text-secondary mt-1">
                        Compare across levels, drill down/up, and view alliance-backed cross-category spread.
                    </p>
                </div>
                <div className="text-xs text-text-muted">
                    {data ? `${data.meta.totalGroups} groups · ${data.meta.totalMembers.toLocaleString()} members` : 'Loading...'}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs uppercase tracking-[0.16em] text-text-muted">Scope</label>
                <select
                    value={scope}
                    onChange={(e) => handleScopeChange(e.target.value as LocationScope)}
                    className="input max-w-[240px]"
                >
                    {LOCATION_SCOPE_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                            {level.icon} {level.label}
                        </option>
                    ))}
                </select>
                {countActiveFilters(filters) > 0 && (
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                            setFilters({});
                            setCompareKeys([]);
                        }}
                    >
                        Clear drill filters
                    </button>
                )}
            </div>

            {data?.breadcrumbs?.length ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {data.breadcrumbs.map((crumb, index) => {
                        const scopeConfig = getLocationScopeConfig(crumb.scope);
                        return (
                            <div key={`${crumb.scope}-${index}`} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="px-2.5 py-1 rounded-md border border-border-primary bg-bg-secondary text-text-secondary hover:text-text-primary"
                                    onClick={() => {
                                        setScope(crumb.scope);
                                        setFilters(crumb.filters || {});
                                        setCompareKeys([]);
                                    }}
                                >
                                    {scopeConfig.icon} {crumb.label}
                                </button>
                                {index < data.breadcrumbs.length - 1 && <span className="text-text-muted">→</span>}
                            </div>
                        );
                    })}
                </div>
            ) : null}

            {loading && (
                <div className="space-y-2">
                    <div className="h-12 rounded-lg bg-bg-tertiary animate-pulse" />
                    <div className="h-40 rounded-lg bg-bg-tertiary animate-pulse" />
                </div>
            )}

            {error && (
                <div className="text-sm text-danger">
                    Failed to load distribution analytics: {error}
                </div>
            )}

            {!loading && !error && data && (
                <>
                    <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-text-muted mb-2">
                            Compare units at this level (max 6)
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {data.compareOptions.length === 0 ? (
                                <span className="text-sm text-text-muted">No units found for this filter.</span>
                            ) : (
                                data.compareOptions.map((option) => {
                                    const active = data.selectedCompareKeys.includes(option.key);
                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => toggleCompare(option.key)}
                                            className={`px-3 py-2 rounded-lg border text-xs text-left transition-colors ${active
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border-primary bg-bg-secondary text-text-secondary hover:text-text-primary'
                                                }`}
                                            title={`${option.groupCount} groups · ${option.memberCount} members`}
                                        >
                                            <div className="font-medium">{option.label}</div>
                                            <div className="text-[11px] opacity-80">{option.groupCount} groups · {option.memberCount} members</div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {data.nextLevel && (
                        <div className="rounded-lg border border-border-primary bg-bg-secondary p-3">
                            <div className="text-xs text-text-muted mb-2">
                                Drill down available: {data.nextLevel.icon} {data.nextLevel.label}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {data.compareOptions
                                    .filter((o) => data.selectedCompareKeys.includes(o.key))
                                    .map((option) => (
                                        <button
                                            key={`drill-${option.key}`}
                                            type="button"
                                            onClick={() => drillDown(option)}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            Drill into {option.label}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setTab('issuesAcrossGroups')}
                            className={`btn btn-sm ${tab === 'issuesAcrossGroups' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            Issues across Groups
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('groupsAcrossIssues')}
                            className={`btn btn-sm ${tab === 'groupsAcrossIssues' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            Groups across Issues
                        </button>
                    </div>

                    {tab === 'issuesAcrossGroups' ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {data.units.map((unit) => (
                                <div key={unit.key} className="rounded-xl border border-border-primary bg-bg-card p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="font-medium text-text-primary">{unit.label}</h3>
                                            <p className="text-xs text-text-muted">{unit.groupCount} groups · {unit.memberCount} members</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {unit.categoryDistribution.map((entry) => (
                                            <div key={`${unit.key}-${entry.categoryName}`} className="rounded-lg border border-border-primary bg-bg-secondary p-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm text-text-primary">{entry.categoryName}</span>
                                                    <span className="text-xs text-text-muted">{entry.groupCount} groups · {entry.memberCount} members</span>
                                                </div>
                                                <div className="text-[11px] text-text-muted mt-1">
                                                    Group share: {entry.groupSharePct}% · Member share: {entry.memberSharePct}%
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-border-primary bg-bg-card">
                            <table className="min-w-[840px] w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border-primary bg-bg-secondary">
                                        <th className="text-left px-3 py-2.5">Group</th>
                                        <th className="text-left px-3 py-2.5">Unit</th>
                                        <th className="text-right px-3 py-2.5">Members</th>
                                        {data.groupCategoryMatrix.columns.map((column) => (
                                            <th key={column.categoryName} className="text-center px-3 py-2.5 whitespace-nowrap">
                                                {column.categoryName}
                                            </th>
                                        ))}
                                        <th className="text-left px-3 py-2.5">Alliance spread</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.groupCategoryMatrix.rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={5 + data.groupCategoryMatrix.columns.length} className="px-3 py-4 text-text-muted">
                                                No groups available for this selection.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.groupCategoryMatrix.rows.map((row) => (
                                            <tr key={row.groupId} className="border-b border-border-primary/70">
                                                <td className="px-3 py-2.5">
                                                    <div className="font-medium text-text-primary line-clamp-1">{row.groupName}</div>
                                                    <div className="text-[11px] text-text-muted">Primary: {row.primaryCategoryName}</div>
                                                </td>
                                                <td className="px-3 py-2.5 text-text-secondary">{row.unitLabel}</td>
                                                <td className="px-3 py-2.5 text-right text-text-primary">{row.memberCount}</td>
                                                {row.cells.map((cell) => (
                                                    <td key={`${row.groupId}-${cell.categoryName}`} className="px-3 py-2.5 text-center">
                                                        <span className={cell.display === 'NA' ? 'text-text-muted' : 'text-primary font-medium'}>
                                                            {cell.display}
                                                        </span>
                                                    </td>
                                                ))}
                                                <td className="px-3 py-2.5">
                                                    {row.alliance.allianceId ? (
                                                        <div className="text-xs text-text-secondary">
                                                            <div>
                                                                {row.alliance.allianceName || 'Alliance'}
                                                                {row.alliance.combinedMemberCount ? ` · ${row.alliance.combinedMemberCount} combined` : ''}
                                                            </div>
                                                            {row.alliance.alliedCategories.length > 0 ? (
                                                                <div className="text-[11px] text-text-muted mt-0.5">
                                                                    Also spans: {row.alliance.alliedCategories.join(', ')}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[11px] text-text-muted mt-0.5">No additional categories</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-text-muted">No alliance</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}