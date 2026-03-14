import { CREATION_LOCATION_SCOPE_LEVELS, LOCATION_SCOPE_LEVELS } from '@/types/database';

export type CreatePartyPrefill = {
    issueText: string;
    titleImageUrl: string;
    pincodes: string;
    parentPartyId: string;
    forkOfPartyId: string;
    categoryId: string;
    locationScope: string;
    stateName: string;
    districtName: string;
    blockName: string;
    panchayatName: string;
    villageName: string;
};

export const DEFAULT_CREATE_PARTY_PREFILL: CreatePartyPrefill = {
    issueText: '',
    titleImageUrl: '',
    pincodes: '',
    parentPartyId: '',
    forkOfPartyId: '',
    categoryId: '',
    locationScope: 'district',
    stateName: '',
    districtName: '',
    blockName: '',
    panchayatName: '',
    villageName: '',
};

export function parsePincodes(input: string): string[] {
    return input
        .split(/[,\s]+/)
        .map((p) => p.trim())
        .filter((p) => p.length === 6 && /^\d+$/.test(p));
}

export function getChildDefaultScope(parentScope: string | null | undefined): string {
    const currentScope = parentScope || 'district';

    // Launch creation chain: national -> state -> district -> village
    const creationIndex = CREATION_LOCATION_SCOPE_LEVELS.findIndex((scope) => scope.value === currentScope);
    if (creationIndex !== -1) {
        const nextCreationScope = CREATION_LOCATION_SCOPE_LEVELS[creationIndex + 1];
        return nextCreationScope?.value || currentScope;
    }

    // Fallback for non-launch scopes (for example: block, panchayat).
    const currentIndex = LOCATION_SCOPE_LEVELS.findIndex((scope) => scope.value === currentScope);
    if (currentIndex === -1) return 'district';
    const nextScope = LOCATION_SCOPE_LEVELS[currentIndex + 1];
    return nextScope?.value || currentScope;
}

function getScopeLevelWord(scope: string): string {
    if (scope === 'national') return 'national';
    if (scope === 'state') return 'state';
    if (scope === 'district') return 'district';
    if (scope === 'block') return 'block';
    if (scope === 'panchayat') return 'panchayat';
    if (scope === 'village') return 'village';
    return scope;
}

export function getCreateChildGroupLabel(parentScope: string | null | undefined): string {
    if (!parentScope) return 'Create Local Chapter';

    const childScope = getChildDefaultScope(parentScope);
    if (!childScope || childScope === parentScope) return 'Create Local Chapter';

    return `Create ${getScopeLevelWord(childScope)} Local Chapter`;
}

export function getCreatePartyPrefill(search: string): CreatePartyPrefill {
    const params = new URLSearchParams(search);

    return {
        issueText: params.get('issue') || '',
        titleImageUrl: params.get('title_image_url') || '',
        pincodes: params.get('pincodes') || '',
        parentPartyId: params.get('parent') || '',
        forkOfPartyId: params.get('fork_of') || '',
        categoryId: params.get('category') || '',
        locationScope: params.get('location_scope') || 'district',
        stateName: params.get('state_name') || '',
        districtName: params.get('district_name') || '',
        blockName: params.get('block_name') || '',
        panchayatName: params.get('panchayat_name') || '',
        villageName: params.get('village_name') || '',
    };
}

export function getLocationLabelFromScope(details: {
    locationScope: string;
    stateName: string;
    districtName: string;
    blockName: string;
    panchayatName: string;
    villageName: string;
}): string {
    const {
        locationScope,
        stateName,
        districtName,
        blockName,
        panchayatName,
        villageName,
    } = details;

    if (locationScope === 'national') return 'India';
    if (locationScope === 'state') return stateName.trim();
    if (locationScope === 'district') return districtName.trim();
    if (locationScope === 'block') return blockName.trim();
    if (locationScope === 'panchayat') return panchayatName.trim();
    if (locationScope === 'village') return villageName.trim();
    return '';
}

export function isScopeLocationValid(details: {
    locationScope: string;
    stateName: string;
    districtName: string;
    blockName: string;
    panchayatName: string;
    villageName: string;
}): boolean {
    const {
        locationScope,
        stateName,
        districtName,
        blockName,
        panchayatName,
        villageName,
    } = details;

    if (locationScope === 'national') return true;
    if (locationScope === 'state') return !!stateName.trim();
    if (locationScope === 'district') return !!stateName.trim() && !!districtName.trim();
    if (locationScope === 'block') return !!stateName.trim() && !!blockName.trim();
    if (locationScope === 'panchayat') return !!panchayatName.trim();
    if (locationScope === 'village') return !!villageName.trim();
    return true;
}

/**
 * Returns the location qualifier string for a party based on its scope.
 * e.g. "National" for national, the state name for state scope, etc.
 */
export function getLocationQualifier(party: {
    location_scope?: string | null;
    state_name?: string | null;
    district_name?: string | null;
    block_name?: string | null;
    panchayat_name?: string | null;
    village_name?: string | null;
}): string {
    const scope = party.location_scope || 'district';
    if (scope === 'national') return 'National';
    if (scope === 'state') return party.state_name?.trim() || '';
    if (scope === 'district') return party.district_name?.trim() || '';
    if (scope === 'block') return party.block_name?.trim() || '';
    if (scope === 'panchayat') return party.panchayat_name?.trim() || '';
    if (scope === 'village') return party.village_name?.trim() || '';
    return '';
}

/**
 * Build an auto-suggested name for a child/new party.
 *
 * Rules:
 * - National scope: append " National" to base text if not already present
 * - Sub-national scopes: prefix "{LocationName} " and strip the parent's old qualifier
 *
 * @param parentIssueText  The parent party's issue_text (or current text for national)
 * @param parentQualifier  The parent's location qualifier (from getLocationQualifier)
 * @param childQualifier   The child's location qualifier (e.g. state name, district name)
 * @param childScope       The child's location scope
 */
export function buildAutoName(
    parentIssueText: string,
    parentQualifier: string,
    childQualifier: string,
    childScope: string,
): string {
    let base = parentIssueText.trim();
    if (!base) return '';

    // Strip parent qualifier — could be a prefix ("Maharashtra ") or suffix (" National")
    if (parentQualifier) {
        // Strip as suffix (e.g. " National")
        const suffixPattern = new RegExp(`\\s+${escapeRegex(parentQualifier)}$`, 'i');
        base = base.replace(suffixPattern, '');
        // Strip as prefix (e.g. "Maharashtra ")
        const prefixPattern = new RegExp(`^${escapeRegex(parentQualifier)}\\s+`, 'i');
        base = base.replace(prefixPattern, '');
    }

    base = base.trim();
    if (!base) return childQualifier || '';

    if (childScope === 'national') {
        // Append " National" only if not already present
        if (!/\bNational\b/i.test(base)) {
            return `${base} National`;
        }
        return base;
    }

    // For sub-national scopes, prefix with location name
    if (childQualifier) {
        return `${childQualifier} ${base}`;
    }
    return base;
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
