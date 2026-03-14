import { createClient } from '@/lib/supabase/server';
import { buildFoundingGroupName, resolvePartyDisplayName } from '@/lib/foundingGroups';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPartyLocationLabel, type PartyWithStats } from '@/types/database';
import { IssueDetailClient, type NationalGroupData, type SubGroupData } from '@/components/IssueDetailClient';

export const revalidate = 30;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function ensureFoundingGroupsForUserLocation({
    supabase,
    issueId,
    issueText,
    issueCategoryId,
    userId,
    state,
    district,
    village,
}: {
    supabase: SupabaseServerClient;
    issueId: string;
    issueText: string;
    issueCategoryId: string | null;
    userId: string;
    state?: string | null;
    district?: string | null;
    village?: string | null;
}) {
    const normalizedState = state?.trim() || null;
    const normalizedDistrict = district?.trim() || null;
    const normalizedVillage = village?.trim() || null;

    if (!normalizedState) return;

    const { data: foundingNationalGroup } = await supabase
        .from('parties')
        .select('id')
        .eq('issue_id', issueId)
        .eq('location_scope', 'national')
        .eq('is_founding_group', true)
        .is('parent_party_id', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (!foundingNationalGroup) return;

    let statePartyId: string | null = null;

    let { data: existingState } = await supabase
        .from('parties')
        .select('id')
        .eq('issue_id', issueId)
        .eq('parent_party_id', foundingNationalGroup.id)
        .eq('location_scope', 'state')
        .eq('is_founding_group', true)
        .eq('state_name', normalizedState)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (!existingState) {
        const { data: existingStateByLabel } = await supabase
            .from('parties')
            .select('id')
            .eq('issue_id', issueId)
            .eq('parent_party_id', foundingNationalGroup.id)
            .eq('location_scope', 'state')
            .eq('is_founding_group', true)
            .eq('location_label', normalizedState)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
        existingState = existingStateByLabel;
    }

    statePartyId = existingState?.id ?? null;

    if (!statePartyId) {
        const { error: stateInsertError } = await supabase
            .from('parties')
            .insert({
                issue_text: buildFoundingGroupName({
                    issueText,
                    locationScope: 'state',
                    locationLabel: normalizedState,
                    stateName: normalizedState,
                }),
                pincodes: [],
                category_id: issueCategoryId,
                created_by: userId,
                issue_id: issueId,
                node_type: 'group',
                parent_party_id: foundingNationalGroup.id,
                location_scope: 'state',
                location_label: normalizedState,
                state_name: normalizedState,
                is_founding_group: true,
            });

        if (stateInsertError) {
            console.error('Failed to create state founding group:', stateInsertError.message);
        }

        let { data: createdOrExistingState } = await supabase
            .from('parties')
            .select('id')
            .eq('issue_id', issueId)
            .eq('parent_party_id', foundingNationalGroup.id)
            .eq('location_scope', 'state')
            .eq('is_founding_group', true)
            .eq('state_name', normalizedState)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (!createdOrExistingState) {
            const { data: createdOrExistingStateByLabel } = await supabase
                .from('parties')
                .select('id')
                .eq('issue_id', issueId)
                .eq('parent_party_id', foundingNationalGroup.id)
                .eq('location_scope', 'state')
                .eq('is_founding_group', true)
                .eq('location_label', normalizedState)
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle();
            createdOrExistingState = createdOrExistingStateByLabel;
        }

        statePartyId = createdOrExistingState?.id ?? null;
    }

    if (!normalizedDistrict || !statePartyId) return;

    let districtPartyId: string | null = null;

    let { data: existingDistrict } = await supabase
        .from('parties')
        .select('id')
        .eq('issue_id', issueId)
        .eq('parent_party_id', statePartyId)
        .eq('location_scope', 'district')
        .eq('is_founding_group', true)
        .eq('state_name', normalizedState)
        .eq('district_name', normalizedDistrict)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (!existingDistrict) {
        const { data: existingDistrictByLabel } = await supabase
            .from('parties')
            .select('id')
            .eq('issue_id', issueId)
            .eq('parent_party_id', statePartyId)
            .eq('location_scope', 'district')
            .eq('is_founding_group', true)
            .eq('state_name', normalizedState)
            .eq('location_label', normalizedDistrict)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
        existingDistrict = existingDistrictByLabel;
    }

    districtPartyId = existingDistrict?.id ?? null;

    if (!districtPartyId) {
        const { error: districtInsertError } = await supabase
            .from('parties')
            .insert({
                issue_text: buildFoundingGroupName({
                    issueText,
                    locationScope: 'district',
                    locationLabel: normalizedDistrict,
                    stateName: normalizedState,
                    districtName: normalizedDistrict,
                }),
                pincodes: [],
                category_id: issueCategoryId,
                created_by: userId,
                issue_id: issueId,
                node_type: 'group',
                parent_party_id: statePartyId,
                location_scope: 'district',
                location_label: normalizedDistrict,
                state_name: normalizedState,
                district_name: normalizedDistrict,
                is_founding_group: true,
            });

        if (districtInsertError) {
            console.error('Failed to create district founding group:', districtInsertError.message);
        }

        let { data: createdOrExistingDistrict } = await supabase
            .from('parties')
            .select('id')
            .eq('issue_id', issueId)
            .eq('parent_party_id', statePartyId)
            .eq('location_scope', 'district')
            .eq('is_founding_group', true)
            .eq('state_name', normalizedState)
            .eq('district_name', normalizedDistrict)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (!createdOrExistingDistrict) {
            const { data: createdOrExistingDistrictByLabel } = await supabase
                .from('parties')
                .select('id')
                .eq('issue_id', issueId)
                .eq('parent_party_id', statePartyId)
                .eq('location_scope', 'district')
                .eq('is_founding_group', true)
                .eq('state_name', normalizedState)
                .eq('location_label', normalizedDistrict)
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle();
            createdOrExistingDistrict = createdOrExistingDistrictByLabel;
        }

        districtPartyId = createdOrExistingDistrict?.id ?? null;
    }

    if (!normalizedVillage || !districtPartyId) return;

    let { data: existingVillage } = await supabase
        .from('parties')
        .select('id')
        .eq('issue_id', issueId)
        .eq('parent_party_id', districtPartyId)
        .eq('location_scope', 'village')
        .eq('is_founding_group', true)
        .eq('state_name', normalizedState)
        .eq('district_name', normalizedDistrict)
        .eq('village_name', normalizedVillage)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (!existingVillage) {
        const { data: existingVillageByLabel } = await supabase
            .from('parties')
            .select('id')
            .eq('issue_id', issueId)
            .eq('parent_party_id', districtPartyId)
            .eq('location_scope', 'village')
            .eq('is_founding_group', true)
            .eq('state_name', normalizedState)
            .eq('district_name', normalizedDistrict)
            .eq('location_label', normalizedVillage)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
        existingVillage = existingVillageByLabel;
    }

    if (existingVillage) return;

    const { error: villageInsertError } = await supabase
        .from('parties')
        .insert({
            issue_text: buildFoundingGroupName({
                issueText,
                locationScope: 'village',
                locationLabel: normalizedVillage,
                stateName: normalizedState,
                districtName: normalizedDistrict,
                villageName: normalizedVillage,
            }),
            pincodes: [],
            category_id: issueCategoryId,
            created_by: userId,
            issue_id: issueId,
            node_type: 'group',
            parent_party_id: districtPartyId,
            location_scope: 'village',
            location_label: normalizedVillage,
            state_name: normalizedState,
            district_name: normalizedDistrict,
            village_name: normalizedVillage,
            is_founding_group: true,
        });

    if (villageInsertError) {
        console.error('Failed to create village founding group:', villageInsertError.message);
    }
}

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

    // ── Current user location (used for local founding groups + highlighting) ──
    const { data: { user } } = await supabase.auth.getUser();
    let userStateName: string | null = null;
    let userDistrictName: string | null = null;
    let userVillageName: string | null = null;

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('state, district, village, city, locality, ward, panchayat, block')
            .eq('id', user.id)
            .maybeSingle();

        userStateName = profile?.state ?? null;
        userDistrictName = profile?.district || profile?.city || profile?.block || null;
        userVillageName = profile?.village || profile?.locality || profile?.ward || profile?.panchayat || null;

        await ensureFoundingGroupsForUserLocation({
            supabase,
            issueId: issue.id,
            issueText: issue.issue_text,
            issueCategoryId: issue.category_id ?? null,
            userId: user.id,
            state: userStateName,
            district: userDistrictName,
            village: userVillageName,
        });
    }

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

    // ── 2. All local groups (state, district, village) for this issue ───────
    let allChildrenRaw: PartyWithStats[] = [];
    if (nationalPartyIds.length > 0) {
        const { data: localPartyRows } = await supabase
            .from('parties')
            .select('id')
            .eq('issue_id', id)
            .in('location_scope', ['state', 'district', 'village']);

        const localPartyIds = localPartyRows?.map((party) => party.id) || [];

        if (localPartyIds.length > 0) {
            const { data: childData } = await supabase
                .from('parties_with_member_counts')
                .select('*')
                .in('id', localPartyIds);
            allChildrenRaw = (childData || []) as PartyWithStats[];
        }
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
            issue_text: resolvePartyDisplayName({
                partyName: p.issue_text,
                isFoundingGroup: p.is_founding_group,
                issueText: issue.issue_text,
                locationScope: p.location_scope,
                locationLabel: getPartyLocationLabel(p),
                stateName: p.state_name,
                districtName: p.district_name,
                blockName: p.block_name,
                panchayatName: p.panchayat_name,
                villageName: p.village_name,
            }),
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
        const stateChildrenRaw = allChildrenRaw.filter(
            (child) => child.location_scope === 'state' && child.parent_party_id === ng.id
        );
        const stateIds = new Set(stateChildrenRaw.map((child) => child.id));

        const districtChildrenRaw = allChildrenRaw.filter((child) => {
            if (child.location_scope !== 'district') return false;
            const parentId = child.parent_party_id;
            if (!parentId) return false;

            // Primary path: district is child of state.
            if (stateIds.has(parentId)) return true;

            // Also include district groups directly attached under national.
            return parentId === ng.id;
        });
        const districtIds = new Set(districtChildrenRaw.map((child) => child.id));

        const villageChildrenRaw = allChildrenRaw.filter((child) => {
            if (child.location_scope !== 'village') return false;
            const parentId = child.parent_party_id;
            if (!parentId) return false;

            // Primary path: village is child of district.
            if (districtIds.has(parentId)) return true;

            // Also include villages directly under state or national.
            return stateIds.has(parentId) || parentId === ng.id;
        });

        return {
            id: ng.id,
            issue_text: resolvePartyDisplayName({
                partyName: ng.issue_text,
                isFoundingGroup: ng.is_founding_group,
                issueText: issue.issue_text,
                locationScope: ng.location_scope,
                locationLabel: getPartyLocationLabel(ng),
                stateName: ng.state_name,
                districtName: ng.district_name,
                blockName: ng.block_name,
                panchayatName: ng.panchayat_name,
                villageName: ng.village_name,
            }),
            is_founding_group: ng.is_founding_group ?? false,
            member_count: ng.member_count ?? 0,
            leader_name: ng.leader_name ?? null,
            leader_id: ng.leader_id ?? null,
            leader_trust_votes: getLeaderTrustVotes(ng),
            location_scope: (ng.location_scope ?? 'national') as NationalGroupData['location_scope'],
            stateChildren: stateChildrenRaw.map(toSubGroup),
            districtChildren: districtChildrenRaw.map(toSubGroup),
            villageChildren: villageChildrenRaw.map(toSubGroup),
        };
    });

    const totalMembers = nationalGroups.reduce((sum, g) => sum + g.member_count, 0);

    // ── 4. Current user membership ───────────────────────────────────────
    let userMemberPartyId: string | null = null;

    if (user) {
        const membershipResult = allPartyIds.length > 0
            ? await supabase
                .from('memberships')
                .select('party_id')
                .eq('user_id', user.id)
                .in('party_id', allPartyIds)
                .is('left_at', null)
                .limit(1)
                .maybeSingle()
            : { data: null };

        userMemberPartyId = membershipResult.data?.party_id ?? null;
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
