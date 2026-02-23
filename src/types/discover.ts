import type { Party } from '@/types/database';

export type GroupType = 'standalone' | 'parent';

export type HierarchyChild = {
    party: Party;
    memberCount: number;
    children?: HierarchyChild[];
};

export interface DiscoverGroupItem {
    party: Party;
    memberCount: number;
    lastActiveAt?: string | null;
    type: GroupType;
    hasChildren?: boolean;
    children?: HierarchyChild[];
    parentName?: string;
}
