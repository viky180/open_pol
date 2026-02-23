import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    getLocationScopeConfig,
    getLocationScopeRank,
    type LocationScope,
} from '@/types/database';

type ScopeFilters = {
    state_name?: string;
    district_name?: string;
    block_name?: string;
    panchayat_name?: string;
    village_name?: string;
};

type PartyRow = {
    id: string;
    issue_text: string;
    location_scope: string | null;
    state_name: string | null;
    district_name: string | null;
    block_name: string | null;
    panchayat_name: string | null;
    village_name: string | null;
    category_id: string | null;
    member_count: number | null;
};

type CategoryRow = {
    id: string;
    name: string;
};

type AllianceMembershipRow = {
    alliance_id: string;
    party_id: string;
};

type AllianceRow = {
    id: string;
    name: string | null;
};

type ScopeUnit = {
    key: string;
    label: string;
    filters: ScopeFilters;
};

const SCOPE_ORDER: LocationScope[] = ['national', 'state', 'district', 'block', 'panchayat', 'village'];
const UNCATEGORIZED_KEY = '__uncategorized__';

function parseScope(value: string | null): LocationScope {
    if (value && SCOPE_ORDER.includes(value as LocationScope)) {
        return value as LocationScope;
    }
    return 'state';
}

function clean(value: string | null): string | undefined {
    const v = (value || '').trim();
    return v.length > 0 ? v : undefined;
}

function buildFilters(searchParams: URLSearchParams): ScopeFilters {
    return {
        state_name: clean(searchParams.get('state_name')),
        district_name: clean(searchParams.get('district_name')),
        block_name: clean(searchParams.get('block_name')),
        panchayat_name: clean(searchParams.get('panchayat_name')),
        village_name: clean(searchParams.get('village_name')),
    };
}

function matchesParentFilters(party: PartyRow, filters: ScopeFilters): boolean {
    if (filters.state_name && party.state_name !== filters.state_name) return false;
    if (filters.district_name && party.district_name !== filters.district_name) return false;
    if (filters.block_name && party.block_name !== filters.block_name) return false;
    if (filters.panchayat_name && party.panchayat_name !== filters.panchayat_name) return false;
    if (filters.village_name && party.village_name !== filters.village_name) return false;
    return true;
}

function getCategoryKey(categoryId: string | null): string {
    return categoryId ?? UNCATEGORIZED_KEY;
}

function getCategoryName(categoryKey: string, categoryNameById: Map<string, string>): string {
    if (categoryKey === UNCATEGORIZED_KEY) return 'Uncategorized';
    return categoryNameById.get(categoryKey) || 'Uncategorized';
}

function getScopeUnit(party: PartyRow, scope: LocationScope): ScopeUnit | null {
    const state = party.state_name || undefined;
    const district = party.district_name || undefined;
    const block = party.block_name || undefined;
    const panchayat = party.panchayat_name || undefined;
    const village = party.village_name || undefined;

    if (scope === 'national') {
        return { key: 'india', label: 'India', filters: {} };
    }

    if (scope === 'state') {
        if (!state) return null;
        return {
            key: `state:${state}`,
            label: state,
            filters: { state_name: state },
        };
    }

    if (scope === 'district') {
        if (!state || !district) return null;
        return {
            key: `district:${state}::${district}`,
            label: `${district}, ${state}`,
            filters: { state_name: state, district_name: district },
        };
    }

    if (scope === 'block') {
        if (!state || !block) return null;
        return {
            key: `block:${state}::${district || ''}::${block}`,
            label: district ? `${block}, ${district}` : `${block}, ${state}`,
            filters: {
                state_name: state,
                district_name: district,
                block_name: block,
            },
        };
    }

    if (scope === 'panchayat') {
        if (!panchayat) return null;
        const pieces = [panchayat, district || block, state].filter(Boolean);
        return {
            key: `panchayat:${state || ''}::${district || ''}::${block || ''}::${panchayat}`,
            label: pieces.join(', '),
            filters: {
                state_name: state,
                district_name: district,
                block_name: block,
                panchayat_name: panchayat,
            },
        };
    }

    if (!village) return null;
    const pieces = [village, panchayat || district || block, state].filter(Boolean);
    return {
        key: `village:${state || ''}::${district || ''}::${block || ''}::${panchayat || ''}::${village}`,
        label: pieces.join(', '),
        filters: {
            state_name: state,
            district_name: district,
            block_name: block,
            panchayat_name: panchayat,
            village_name: village,
        },
    };
}

function pickFiltersUntil(scope: LocationScope, filters: ScopeFilters): ScopeFilters {
    if (scope === 'national') return {};
    if (scope === 'state') return { state_name: filters.state_name };
    if (scope === 'district') return { state_name: filters.state_name, district_name: filters.district_name };
    if (scope === 'block') {
        return {
            state_name: filters.state_name,
            district_name: filters.district_name,
            block_name: filters.block_name,
        };
    }
    if (scope === 'panchayat') {
        return {
            state_name: filters.state_name,
            district_name: filters.district_name,
            block_name: filters.block_name,
            panchayat_name: filters.panchayat_name,
        };
    }
    return {
        state_name: filters.state_name,
        district_name: filters.district_name,
        block_name: filters.block_name,
        panchayat_name: filters.panchayat_name,
        village_name: filters.village_name,
    };
}

function buildBreadcrumbs(scope: LocationScope, filters: ScopeFilters) {
    const crumbs: Array<{ scope: LocationScope; label: string; filters: ScopeFilters }> = [
        { scope: 'national', label: 'India', filters: {} },
    ];

    if (filters.state_name) {
        crumbs.push({
            scope: 'state',
            label: filters.state_name,
            filters: { state_name: filters.state_name },
        });
    }
    if (filters.district_name) {
        crumbs.push({
            scope: 'district',
            label: filters.district_name,
            filters: pickFiltersUntil('district', filters),
        });
    }
    if (filters.block_name) {
        crumbs.push({
            scope: 'block',
            label: filters.block_name,
            filters: pickFiltersUntil('block', filters),
        });
    }
    if (filters.panchayat_name) {
        crumbs.push({
            scope: 'panchayat',
            label: filters.panchayat_name,
            filters: pickFiltersUntil('panchayat', filters),
        });
    }
    if (filters.village_name) {
        crumbs.push({
            scope: 'village',
            label: filters.village_name,
            filters: pickFiltersUntil('village', filters),
        });
    }

    const hasScopeCrumb = crumbs.some((c) => c.scope === scope);
    if (!hasScopeCrumb) {
        const scopeConfig = getLocationScopeConfig(scope);
        crumbs.push({
            scope,
            label: `All ${scopeConfig.label}`,
            filters: pickFiltersUntil(SCOPE_ORDER[Math.max(0, SCOPE_ORDER.indexOf(scope) - 1)], filters),
        });
    }

    return crumbs;
}

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const scope = parseScope(searchParams.get('scope'));
    const parentFilters = buildFilters(searchParams);
    const requestedCompareKeys = (searchParams.get('compare') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const groupLimit = Math.min(Math.max(parseInt(searchParams.get('groupLimit') || '30', 10), 5), 120);

    const [
        partiesResult,
        categoriesResult,
        alliancesResult,
        allianceMembersResult,
    ] = await Promise.all([
        supabase
            .from('parties')
            .select('id, issue_text, location_scope, state_name, district_name, block_name, panchayat_name, village_name, category_id, member_count'),
        supabase
            .from('categories')
            .select('id, name')
            .order('name', { ascending: true }),
        supabase
            .from('alliances')
            .select('id, name')
            .is('disbanded_at', null),
        supabase
            .from('alliance_members')
            .select('alliance_id, party_id')
            .is('left_at', null),
    ]);

    if (partiesResult.error) {
        return NextResponse.json({ error: partiesResult.error.message }, { status: 500 });
    }
    if (categoriesResult.error) {
        return NextResponse.json({ error: categoriesResult.error.message }, { status: 500 });
    }
    if (alliancesResult.error) {
        return NextResponse.json({ error: alliancesResult.error.message }, { status: 500 });
    }
    if (allianceMembersResult.error) {
        return NextResponse.json({ error: allianceMembersResult.error.message }, { status: 500 });
    }

    const parties = (partiesResult.data || []) as PartyRow[];
    const categories = (categoriesResult.data || []) as CategoryRow[];
    const alliances = (alliancesResult.data || []) as AllianceRow[];
    const allianceMembershipRows = (allianceMembersResult.data || []) as AllianceMembershipRow[];

    const categoryNameById = new Map<string, string>();
    categories.forEach((c) => categoryNameById.set(c.id, c.name));

    const filteredByParent = parties.filter((p) => matchesParentFilters(p, parentFilters));

    type UnitAggregate = {
        key: string;
        label: string;
        filters: ScopeFilters;
        groupCount: number;
        memberCount: number;
        partyIds: string[];
    };

    const unitMap = new Map<string, UnitAggregate>();
    for (const party of filteredByParent) {
        const unit = getScopeUnit(party, scope);
        if (!unit) continue;

        const existing = unitMap.get(unit.key) || {
            key: unit.key,
            label: unit.label,
            filters: unit.filters,
            groupCount: 0,
            memberCount: 0,
            partyIds: [],
        };

        existing.groupCount += 1;
        existing.memberCount += party.member_count || 0;
        existing.partyIds.push(party.id);
        unitMap.set(unit.key, existing);
    }

    const compareOptions = Array.from(unitMap.values())
        .sort((a, b) => b.memberCount - a.memberCount)
        .map((u) => ({
            key: u.key,
            label: u.label,
            groupCount: u.groupCount,
            memberCount: u.memberCount,
            filters: u.filters,
        }));

    const validCompareSet = new Set(compareOptions.map((u) => u.key));
    const selectedCompareKeys = (requestedCompareKeys.length > 0
        ? requestedCompareKeys.filter((k) => validCompareSet.has(k))
        : compareOptions.slice(0, Math.min(compareOptions.length, scope === 'national' ? 1 : 6)).map((u) => u.key)
    );

    if (selectedCompareKeys.length === 0 && compareOptions.length > 0) {
        selectedCompareKeys.push(compareOptions[0].key);
    }

    const selectedUnits = selectedCompareKeys
        .map((key) => unitMap.get(key))
        .filter((u): u is UnitAggregate => !!u);

    const partyById = new Map<string, PartyRow>();
    parties.forEach((p) => partyById.set(p.id, p));

    const allianceNameById = new Map<string, string | null>();
    const partyToAllianceId = new Map<string, string>();

    alliances.forEach((a) => {
        allianceNameById.set(a.id, a.name || null);
    });

    allianceMembershipRows.forEach((row) => {
        partyToAllianceId.set(row.party_id, row.alliance_id);
    });

    const partiesInSelection: PartyRow[] = [];
    selectedUnits.forEach((unit) => {
        unit.partyIds.forEach((partyId) => {
            const party = partyById.get(partyId);
            if (party) partiesInSelection.push(party);
        });
    });

    const presentCategoryKeys = new Set<string>();
    partiesInSelection.forEach((p) => presentCategoryKeys.add(getCategoryKey(p.category_id)));

    const categoryTotals = new Map<string, number>();
    partiesInSelection.forEach((p) => {
        const key = getCategoryKey(p.category_id);
        categoryTotals.set(key, (categoryTotals.get(key) || 0) + (p.member_count || 0));
    });

    const matrixColumns = Array.from(presentCategoryKeys)
        .sort((a, b) => (categoryTotals.get(b) || 0) - (categoryTotals.get(a) || 0))
        .map((categoryKey) => ({
            categoryId: categoryKey === UNCATEGORIZED_KEY ? null : categoryKey,
            categoryKey,
            categoryName: getCategoryName(categoryKey, categoryNameById),
        }));

    if (matrixColumns.length === 0) {
        matrixColumns.push({
            categoryId: null,
            categoryKey: UNCATEGORIZED_KEY,
            categoryName: 'Uncategorized',
        });
    }

    const unitDistributions = selectedUnits.map((unit) => {
        const buckets = new Map<string, { groupCount: number; memberCount: number }>();
        let totalGroups = 0;
        let totalMembers = 0;

        unit.partyIds.forEach((partyId) => {
            const party = partyById.get(partyId);
            if (!party) return;
            totalGroups += 1;
            const mCount = party.member_count || 0;
            totalMembers += mCount;

            const key = getCategoryKey(party.category_id);
            const existing = buckets.get(key) || { groupCount: 0, memberCount: 0 };
            existing.groupCount += 1;
            existing.memberCount += mCount;
            buckets.set(key, existing);
        });

        const distribution = matrixColumns.map((c) => {
            const stats = buckets.get(c.categoryKey) || { groupCount: 0, memberCount: 0 };
            const groupSharePct = totalGroups > 0 ? Math.round((stats.groupCount / totalGroups) * 1000) / 10 : 0;
            const memberSharePct = totalMembers > 0 ? Math.round((stats.memberCount / totalMembers) * 1000) / 10 : 0;

            return {
                categoryId: c.categoryId,
                categoryName: c.categoryName,
                groupCount: stats.groupCount,
                memberCount: stats.memberCount,
                groupSharePct,
                memberSharePct,
            };
        }).sort((a, b) => b.memberCount - a.memberCount);

        return {
            key: unit.key,
            label: unit.label,
            filters: unit.filters,
            groupCount: totalGroups,
            memberCount: totalMembers,
            categoryDistribution: distribution,
        };
    });

    const unitInfoByKey = new Map(selectedUnits.map((u) => [u.key, u]));

    type MatrixEntity = {
        id: string;
        name: string;
        memberCount: number;
        unitKeys: Set<string>;
        unitLabels: Set<string>;
        categoryCounts: Map<string, number>;
        allianceId: string | null;
        allianceName: string | null;
    };

    const partyUnitMeta = new Map<string, { key: string; label: string }>();
    partiesInSelection.forEach((party) => {
        const unit = getScopeUnit(party, scope);
        const unitData = unit ? unitInfoByKey.get(unit.key) : null;
        partyUnitMeta.set(party.id, {
            key: unit?.key || 'unknown',
            label: unitData?.label || unit?.label || 'Unknown',
        });
    });

    const matrixEntityMap = new Map<string, MatrixEntity>();

    partiesInSelection.forEach((party) => {
        const allianceId = partyToAllianceId.get(party.id) || null;
        const categoryKey = getCategoryKey(party.category_id);
        const mCount = party.member_count || 0;
        const unitMeta = partyUnitMeta.get(party.id);

        const entityKey = allianceId ? `alliance:${allianceId}` : `party:${party.id}`;
        const entity = matrixEntityMap.get(entityKey) || {
            id: entityKey,
            name: allianceId ? (allianceNameById.get(allianceId) || 'Alliance') : party.issue_text,
            memberCount: 0,
            unitKeys: new Set<string>(),
            unitLabels: new Set<string>(),
            categoryCounts: new Map<string, number>(),
            allianceId,
            allianceName: allianceId ? (allianceNameById.get(allianceId) || null) : null,
        };

        entity.memberCount += mCount;
        entity.unitKeys.add(unitMeta?.key || 'unknown');
        entity.unitLabels.add(unitMeta?.label || 'Unknown');
        entity.categoryCounts.set(categoryKey, (entity.categoryCounts.get(categoryKey) || 0) + mCount);
        matrixEntityMap.set(entityKey, entity);
    });

    const matrixRows = Array.from(matrixEntityMap.values())
        .sort((a, b) => b.memberCount - a.memberCount)
        .slice(0, groupLimit)
        .map((entity) => {
            const categoryEntries = Array.from(entity.categoryCounts.entries())
                .sort((a, b) => b[1] - a[1]);

            const primaryCategoryKey = categoryEntries[0]?.[0] || UNCATEGORIZED_KEY;
            const primaryCategoryName = getCategoryName(primaryCategoryKey, categoryNameById);
            const alliedCategories = categoryEntries
                .map(([key]) => getCategoryName(key, categoryNameById))
                .filter((name) => name !== primaryCategoryName);

            const resolvedUnitKey = entity.unitKeys.size === 1
                ? Array.from(entity.unitKeys)[0]
                : 'multi';
            const resolvedUnitLabel = entity.unitLabels.size === 1
                ? Array.from(entity.unitLabels)[0]
                : 'Multiple units';

            return {
                groupId: entity.id,
                groupName: entity.name,
                unitKey: resolvedUnitKey,
                unitLabel: resolvedUnitLabel,
                memberCount: entity.memberCount,
                primaryCategoryId: primaryCategoryKey === UNCATEGORIZED_KEY ? null : primaryCategoryKey,
                primaryCategoryName,
                cells: matrixColumns.map((column) => {
                    const value = entity.categoryCounts.has(column.categoryKey)
                        ? (entity.categoryCounts.get(column.categoryKey) || 0)
                        : null;
                    return {
                        categoryId: column.categoryId,
                        categoryName: column.categoryName,
                        value,
                        display: value === null ? 'NA' : String(value),
                    };
                }),
                alliance: {
                    allianceId: entity.allianceId,
                    allianceName: entity.allianceName,
                    combinedMemberCount: entity.allianceId ? entity.memberCount : null,
                    alliedCategories,
                },
            };
        });

    const scopeIndex = SCOPE_ORDER.indexOf(scope);
    const nextScope = scopeIndex < SCOPE_ORDER.length - 1 ? SCOPE_ORDER[scopeIndex + 1] : null;

    const totalGroups = unitDistributions.reduce((sum, u) => sum + u.groupCount, 0);
    const totalMembers = unitDistributions.reduce((sum, u) => sum + u.memberCount, 0);

    return NextResponse.json({
        scope,
        scopeConfig: getLocationScopeConfig(scope),
        parentFilters,
        breadcrumbs: buildBreadcrumbs(scope, parentFilters),
        nextLevel: nextScope
            ? {
                scope: nextScope,
                ...getLocationScopeConfig(nextScope),
            }
            : null,
        compareOptions,
        selectedCompareKeys,
        units: unitDistributions,
        categories: matrixColumns.map((c) => ({
            categoryId: c.categoryId,
            categoryName: c.categoryName,
        })),
        groupCategoryMatrix: {
            columns: matrixColumns.map((c) => ({
                categoryId: c.categoryId,
                categoryName: c.categoryName,
            })),
            rows: matrixRows,
        },
        meta: {
            totalGroups,
            totalMembers,
            generatedAt: new Date().toISOString(),
            compareCount: selectedCompareKeys.length,
            filterDepth: Object.values(parentFilters).filter(Boolean).length,
            scopeRank: getLocationScopeRank(scope),
        },
    });
}