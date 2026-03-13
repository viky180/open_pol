import type { Party } from '@/types/database';

export const LEGACY_FOUNDING_GROUP_NAME = 'Founding group';

type FoundingGroupNameOptions = {
    issueText: string | null | undefined;
    locationScope?: Party['location_scope'] | null;
    locationLabel?: string | null;
    stateName?: string | null;
    districtName?: string | null;
    blockName?: string | null;
    panchayatName?: string | null;
    villageName?: string | null;
};

type PartyDisplayNameOptions = FoundingGroupNameOptions & {
    partyName: string | null | undefined;
    isFoundingGroup?: boolean | null;
};

export function isLegacyFoundingGroupName(value: string | null | undefined): boolean {
    return (value || '').trim().toLowerCase() === LEGACY_FOUNDING_GROUP_NAME.toLowerCase();
}

export function buildFoundingGroupName({
    issueText,
    locationScope,
    locationLabel,
    stateName,
    districtName,
    blockName,
    panchayatName,
    villageName,
}: FoundingGroupNameOptions): string {
    const normalizedIssueText = (issueText || '').trim();
    if (!normalizedIssueText) return LEGACY_FOUNDING_GROUP_NAME;

    const baseFoundingName = `${LEGACY_FOUNDING_GROUP_NAME} ${normalizedIssueText}`;

    const normalizedScope = locationScope || 'national';
    if (normalizedScope === 'national') {
        return baseFoundingName;
    }

    const qualifier = getFoundingGroupQualifier({
        locationScope: normalizedScope,
        locationLabel,
        stateName,
        districtName,
        blockName,
        panchayatName,
        villageName,
    });

    return qualifier ? `${qualifier} ${baseFoundingName}` : baseFoundingName;
}

export function resolvePartyDisplayName({
    partyName,
    isFoundingGroup,
    issueText,
    locationScope,
    locationLabel,
    stateName,
    districtName,
    blockName,
    panchayatName,
    villageName,
}: PartyDisplayNameOptions): string {
    const normalizedPartyName = (partyName || '').trim();

    // If the stored name is the legacy placeholder, always resolve it via issue text,
    // regardless of the is_founding_group flag (some older rows have flag=false but legacy name).
    if (isLegacyFoundingGroupName(normalizedPartyName)) {
        return buildFoundingGroupName({ issueText, locationScope, locationLabel, stateName, districtName, blockName, panchayatName, villageName });
    }

    if (!isFoundingGroup) {
        return normalizedPartyName || buildFoundingGroupName({ issueText, locationScope, locationLabel, stateName, districtName, blockName, panchayatName, villageName });
    }

    return normalizedPartyName || buildFoundingGroupName({
        issueText,
        locationScope,
        locationLabel,
        stateName,
        districtName,
        blockName,
        panchayatName,
        villageName,
    });
}


function getFoundingGroupQualifier({
    locationScope,
    locationLabel,
    stateName,
    districtName,
    blockName,
    panchayatName,
    villageName,
}: Omit<FoundingGroupNameOptions, 'issueText'>): string {
    if (locationScope === 'state') return (stateName || locationLabel || '').trim();
    if (locationScope === 'district') return (districtName || locationLabel || '').trim();
    if (locationScope === 'block') return (blockName || locationLabel || '').trim();
    if (locationScope === 'panchayat') return (panchayatName || locationLabel || '').trim();
    if (locationScope === 'village') return (villageName || locationLabel || '').trim();
    return (locationLabel || '').trim();
}
