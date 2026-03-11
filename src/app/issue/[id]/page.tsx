import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPartyLocationLabel, type PartyWithStats } from '@/types/database';
import { IssueDetailClient, type NationalGroupData, type SubGroupData } from '@/components/IssueDetailClient';

export const revalidate = 30;

type Props = {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ group?: string; tab?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const supabase = await createClient();
    const { id } = await params;
    const { data: issue } = await supabase.from('issues').select('issue_text').eq('id', id).maybeSingle();
    if (!issue) return { title: 'Issue Not Found' };
    return {
        title: `${issue.issue_text} — Open Politics`,
        description: `View all national groups working on: ${issue.issue_text}`,
    };
}

export default async function IssueDetailPage({ params, searchParams }: Props) {
    const supabase = await createClient();
    const { id } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : undefined;

    // Fetch issue
    const { data: issue } = await supabase
        .from('issues')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (!issue) notFound();

    // ── 1. National Groups linked to this issue ──────────────────────────
    const { data: partyRows } = await supabase
        .from('parties')
        .select('id')
        .eq('issue_id', id)
        .eq('location_scope', 'national')
        .is('parent_party_id', null);

    const nationalPartyIds = partyRows?.map((p) => p.id) || [];

    const { data: nationalGroupsRaw } = nationalPartyIds.length > 0
        ? await supabase
            .from('parties_with_member_counts')
            .select('*')
            .in('id', nationalPartyIds)
            .order('member_count', { ascending: false })
        : { data: [] };

    const nationalGroupsList = (nationalGroupsRaw || []) as PartyWithStats[];

    // ── 2. All children (state, district, village) of those national groups ──
    let allChildrenRaw: PartyWithStats[] = [];
    if (nationalPartyIds.length > 0) {
        const { data: childData } = await supabase
            .from('parties_with_member_counts')
            .select('*')
            .in('parent_party_id', nationalPartyIds);
        allChildrenRaw = (childData || []) as PartyWithStats[];
    }

    const allPartyIds = Array.from(new Set([...nationalPartyIds, ...allChildrenRaw.map((party) => party.id)]));
    const leaderVoteCounts: Record<string, number> = {};

    if (allPartyIds.length > 0) {
        const { data: trustVotes } = await supabase
            .from('trust_votes')
            .select('party_id, to_user_id')
            .in('party_id', allPartyIds)
            .gt('expires_at', new Date().toISOString());

        (trustVotes || []).forEach((vote) => {
            const key = `${vote.party_id}:${vote.to_user_id}`;
            leaderVoteCounts[key] = (leaderVoteCounts[key] || 0) + 1;
        });
    }

    function getLeaderTrustVotes(party: Pick<PartyWithStats, 'id' | 'leader_id'>): number {
        if (!party.leader_id) return 0;
        return leaderVoteCounts[`${party.id}:${party.leader_id}`] || 0;
    }

    // Helper to build a SubGroupData from a PartyWithStats
    function toSubGroup(p: PartyWithStats): SubGroupData {
        return {
            id: p.id,
            issue_text: p.issue_text,
            member_count: p.member_count ?? 0,
            leader_name: p.leader_name ?? null,
            leader_trust_votes: getLeaderTrustVotes(p),
            location_scope: (p.location_scope ?? 'district') as SubGroupData['location_scope'],
            location_label: getPartyLocationLabel(p),
            parent_party_id: p.parent_party_id ?? null,
        };
    }

    // ── 3. Build NationalGroupData objects ───────────────────────────────
    const nationalGroups: NationalGroupData[] = nationalGroupsList.map((ng) => {
        const children = allChildrenRaw.filter((c) => c.parent_party_id === ng.id);
        return {
            id: ng.id,
            issue_text: ng.issue_text,
            is_founding_group: ng.is_founding_group ?? false,
            member_count: ng.member_count ?? 0,
            leader_name: ng.leader_name ?? null,
            leader_id: ng.leader_id ?? null,
            leader_trust_votes: getLeaderTrustVotes(ng),
            location_scope: (ng.location_scope ?? 'national') as NationalGroupData['location_scope'],
            stateChildren: children.filter((c) => c.location_scope === 'state').map(toSubGroup),
            districtChildren: children.filter((c) => c.location_scope === 'district').map(toSubGroup),
            villageChildren: children.filter((c) => c.location_scope === 'village').map(toSubGroup),
        };
    });

    const totalMembers = nationalGroups.reduce((sum, g) => sum + g.member_count, 0);

    // ── 4. Current user: membership + location ──────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    let userMemberPartyId: string | null = null;
    let userStateName: string | null = null;
    let userDistrictName: string | null = null;
    let userVillageName: string | null = null;

    if (user) {
        const [membershipResult, profileResult] = await Promise.all([
            allPartyIds.length > 0
                ? supabase
                    .from('memberships')
                    .select('party_id')
                    .eq('user_id', user.id)
                    .in('party_id', allPartyIds)
                    .is('left_at', null)
                    .limit(1)
                    .maybeSingle()
                : Promise.resolve({ data: null }),
            supabase
                .from('profiles')
                .select('state, district, village')
                .eq('id', user.id)
                .maybeSingle(),
        ]);
        userMemberPartyId = membershipResult.data?.party_id ?? null;
        userStateName = profileResult.data?.state ?? null;
        userDistrictName = profileResult.data?.district ?? null;
        userVillageName = profileResult.data?.village ?? null;
    }

    return (
        <IssueDetailClient
            issueId={issue.id}
            issueName={issue.issue_text}
            issueCategoryId={issue.category_id ?? null}
            totalMembers={totalMembers}
            urgency={null}
            nationalGroups={nationalGroups}
            userMemberPartyId={userMemberPartyId}
            userStateName={userStateName}
            userDistrictName={userDistrictName}
            userVillageName={userVillageName}
            initialSelectedGroupId={resolvedSearchParams?.group ?? null}
            initialTab={resolvedSearchParams?.tab ?? null}
        />
    );
}
