import type { Alliance, LocationScope, Party } from '@/types/database';

export type GroupType = 'standalone' | 'parent';
export type ExploreScope = 'india' | 'state' | 'district' | 'village';

export type HierarchyChild = {
    party: Party;
    memberCount: number;
    children?: HierarchyChild[];
};

export interface DiscoverGroupItem {
    party: Party;
    memberCount: number;
    likeCount: number;
    likedByMe?: boolean;
    joinedByMe?: boolean;
    lastActiveAt?: string | null;
    type: GroupType;
    hasChildren?: boolean;
    children?: HierarchyChild[];
    parentName?: string;
    leaderName?: string | null;
    creatorName?: string | null;
}

export type DiscoverAllianceMember = {
    partyId: string;
    issueText: string;
    locationScope: LocationScope | string | null;
    locationLabel: string | null;
    memberCount: number;
};

export interface DiscoverAllianceItem {
    alliance: Alliance;
    members: DiscoverAllianceMember[];
    combinedMemberCount: number;
    groupCount: number;
    scopes: Array<LocationScope | string>;
}
