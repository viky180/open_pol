import type { Party } from '@/types/database';

export const FOUNDING_GROUP_NAME = 'Founding group';

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
    void locationLabel;
    void blockName;
    void panchayatName;

    const normalizedIssueText = (issueText || '').trim();
    const issueFragment = normalizedIssueText ? ` ${normalizedIssueText}` : '';

    if (locationScope === 'state' && stateName) {
        return `${FOUNDING_GROUP_NAME} ${stateName}${issueFragment}`;
    }
    if (locationScope === 'district' && districtName) {
        return `${FOUNDING_GROUP_NAME} ${districtName}${issueFragment}`;
    }
    if (locationScope === 'village' && villageName) {
        return `${FOUNDING_GROUP_NAME} ${villageName}${issueFragment}`;
    }

    // National or unknown scope
    if (!normalizedIssueText) return FOUNDING_GROUP_NAME;
    return `${FOUNDING_GROUP_NAME} ${normalizedIssueText}`;
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
    void isFoundingGroup;
    const normalizedPartyName = (partyName || '').trim();

    if (normalizedPartyName) return normalizedPartyName;
    return buildFoundingGroupName({ issueText, locationScope, locationLabel, stateName, districtName, blockName, panchayatName, villageName });
}
