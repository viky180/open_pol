import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { ElectWizardClient } from './ElectWizardClient';
import { buildFoundingGroupName } from '@/lib/foundingGroups';
import type { MemberWithVotes } from '@/types/database';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export interface AvailableGroup {
    partyId: string;
    partyName: string;
    memberCount: number;
    description: string;
    isFoundingGroup?: boolean;
}

export interface LevelData {
    scope: 'national' | 'state' | 'district' | 'village';
    // If the user is already a member at this scope (like National, or if they joined previously)
    joinedPartyId: string | null;
    joinedPartyName: string | null;
    joinedMembers: MemberWithVotes[] | null;
    votedFor: string | null;
    
    // If they haven't joined, what groups are available in their area?
    availableGroups: AvailableGroup[] | null;
    
    // Metadata for creating a group if none exists/they want a new one
    userState: string | null;
    userDistrict: string | null;
    userVillage: string | null;
}

export default async function OnboardingElectPage({ searchParams }: Props) {
    const rawSearchParams = await searchParams;
    const nationalId = Array.isArray(rawSearchParams.nationalId)
        ? rawSearchParams.nationalId[0]
        : rawSearchParams.nationalId;

    if (!nationalId) {
        redirect('/');
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth');
    }

    // Get the national party to find issue_id
    const { data: nationalParty } = await supabase
        .from('parties')
        .select('issue_id, issue_text, location_scope, category_id')
        .eq('id', nationalId)
        .single();

    if (!nationalParty || !nationalParty.issue_id) {
        redirect('/');
    }

    const issueId = nationalParty.issue_id;

    // Get the user's location profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('state, district, village')
        .eq('id', user.id)
        .maybeSingle();

    const userState = profile?.state?.trim() || null;
    const userDistrict = profile?.district?.trim() || null;
    const userVillage = profile?.village?.trim() || null;

    // 1. Fetch user's CURRENT memberships under this issue
    const { data: userMemberships } = await supabase
        .from('memberships')
        .select(`
            party_id,
            parties!inner(id, issue_text, location_scope, state_name, district_name, village_name)
        `)
        .eq('user_id', user.id)
        .is('left_at', null)
        .eq('parties.issue_id', issueId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const joinedParties = (userMemberships || []).map((m: any) => m.parties);

    // Fetch members and votes for the parties the user HAS joined
    const joinedPartyIds = joinedParties.map(p => p.id);
    
    const [{ data: joinedGroupMembers }, { data: allVotes }] = await Promise.all([
        supabase
            .from('memberships')
            .select(`
                party_id,
                user_id,
                joined_at,
                profiles:user_id(display_name)
            `)
            .in('party_id', joinedPartyIds)
            .is('left_at', null),
        supabase
            .from('trust_votes')
            .select('party_id, to_user_id, from_user_id, expires_at')
            .in('party_id', joinedPartyIds)
            .gt('expires_at', new Date().toISOString())
    ]);

    // 2. Fetch available groups in user's area for scopes they haven't joined yet
    const scopes: ('national' | 'state' | 'district' | 'village')[] = ['national', 'state', 'district', 'village'];
    const levels: LevelData[] = [];

    for (const scope of scopes) {
        const joinedAtScope = joinedParties.find(p => p.location_scope === scope);

        if (joinedAtScope) {
            // Already joined - populate leader election data
            const partyMembers = (joinedGroupMembers || []).filter(m => m.party_id === joinedAtScope.id);
            const partyVotes = (allVotes || []).filter((v: { party_id: string }) => v.party_id === joinedAtScope.id);

            const voteCounts: Record<string, number> = {};
            partyVotes.forEach((v: { to_user_id: string }) => {
                voteCounts[v.to_user_id] = (voteCounts[v.to_user_id] || 0) + 1;
            });

            const leaderId = Object.keys(voteCounts).length > 0
                ? Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0][0]
                : null;

            const members: MemberWithVotes[] = partyMembers.map(m => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pProfile = (m.profiles as any) || {};
                return {
                    user_id: m.user_id as string,
                    display_name: pProfile.display_name || 'Member',
                    joined_at: m.joined_at as string,
                    trust_votes: voteCounts[m.user_id as string] || 0,
                    is_leader: m.user_id === leaderId,
                };
            });

            const userVote = partyVotes.find((v: { from_user_id: string }) => v.from_user_id === user.id)?.to_user_id || null;

            let partyName = joinedAtScope.issue_text;
            if (scope === 'state') partyName = `${joinedAtScope.state_name} - ${joinedAtScope.issue_text}`;
            else if (scope === 'district') partyName = `${joinedAtScope.district_name} - ${joinedAtScope.issue_text}`;
            else if (scope === 'village') partyName = `${joinedAtScope.village_name} - ${joinedAtScope.issue_text}`;

            levels.push({
                scope,
                joinedPartyId: joinedAtScope.id,
                joinedPartyName: partyName,
                joinedMembers: members,
                votedFor: userVote,
                availableGroups: null,
                userState,
                userDistrict,
                userVillage
            });
        } else {
            // Not joined yet - fetch available groups
            let availableGroups: AvailableGroup[] = [];
            
            // Only try finding groups if the user has that level of location defined
            let canFindGroups = false;
            if (scope === 'state' && userState) canFindGroups = true;
            if (scope === 'district' && userState && userDistrict) canFindGroups = true;
            if (scope === 'village' && userState && userDistrict && userVillage) canFindGroups = true;

            if (canFindGroups) {
                let query = supabase
                    .from('parties')
                    .select('id, issue_text, member_count, state_name, district_name, village_name, is_founding_group')
                    .eq('issue_id', issueId)
                    .eq('location_scope', scope);

                if (scope === 'state') query = query.eq('state_name', userState);
                if (scope === 'district') query = query.eq('state_name', userState).eq('district_name', userDistrict);
                if (scope === 'village') query = query.eq('state_name', userState).eq('district_name', userDistrict).eq('village_name', userVillage);

                const { data: areaGroups } = await query;

                if (areaGroups && areaGroups.length > 0) {
                    availableGroups = areaGroups.map(ag => {
                        let pName = ag.issue_text;
                        if (scope === 'state') pName = `${ag.state_name} - ${ag.issue_text}`;
                        else if (scope === 'district') pName = `${ag.district_name} - ${ag.issue_text}`;
                        else if (scope === 'village') pName = `${ag.village_name} - ${ag.issue_text}`;

                        return {
                            partyId: ag.id,
                            partyName: pName,
                            memberCount: ag.member_count || 0,
                            description: `A competing group focusing on ${ag.issue_text} at the ${scope} level.`,
                            isFoundingGroup: !!(ag as { is_founding_group?: boolean }).is_founding_group,
                        };
                    });

                    // Sort by largest first
                    availableGroups.sort((a, b) => b.memberCount - a.memberCount);
                } else {
                    // Safety fallback: no groups found — create the founding group inline so the
                    // user always has a default group to join (in case provision-local was not called
                    // or failed before redirect).
                    try {
                        const adminSupabase = createAdminClient();
                        const locationLabel =
                            scope === 'village' ? userVillage! :
                            scope === 'district' ? userDistrict! :
                            userState!;

                        const { data: newGroup } = await adminSupabase
                            .from('parties')
                            .insert({
                                issue_text: buildFoundingGroupName({
                                    issueText: nationalParty.issue_text,
                                    locationScope: scope,
                                    stateName: userState,
                                    districtName: userDistrict,
                                    villageName: userVillage,
                                }),
                                pincodes: [],
                                is_founding_group: true,
                                issue_id: issueId,
                                category_id: nationalParty.category_id ?? null,
                                parent_party_id: nationalId,
                                node_type: 'group',
                                location_scope: scope,
                                location_label: locationLabel,
                                state_name: userState,
                                district_name: scope === 'district' || scope === 'village' ? userDistrict : null,
                                village_name: scope === 'village' ? userVillage : null,
                                created_by: null,
                            })
                            .select('id, issue_text')
                            .single();

                        if (newGroup) {
                            const pName =
                                scope === 'state' ? `${userState} - ${newGroup.issue_text}` :
                                scope === 'district' ? `${userDistrict} - ${newGroup.issue_text}` :
                                `${userVillage} - ${newGroup.issue_text}`;
                            availableGroups = [{
                                partyId: newGroup.id,
                                partyName: pName,
                                memberCount: 0,
                                description: `The default founding group for your ${scope}.`,
                                isFoundingGroup: true,
                            }];
                        }
                    } catch {
                        // Non-fatal: unique constraint violation means it was created concurrently.
                        // Re-query to pick up the existing row.
                        let refetchQuery = supabase
                            .from('parties')
                            .select('id, issue_text, member_count, is_founding_group')
                            .eq('issue_id', issueId)
                            .eq('location_scope', scope)
                            .eq('is_founding_group', true)
                            .ilike('state_name', userState!);
                        if (scope === 'district' || scope === 'village') {
                            refetchQuery = refetchQuery.ilike('district_name', userDistrict!);
                        }
                        if (scope === 'village') {
                            refetchQuery = refetchQuery.ilike('village_name', userVillage!);
                        }
                        const { data: raced } = await refetchQuery.maybeSingle();
                        if (raced) {
                            const pName =
                                scope === 'state' ? `${userState} - ${raced.issue_text}` :
                                scope === 'district' ? `${userDistrict} - ${raced.issue_text}` :
                                `${userVillage} - ${raced.issue_text}`;
                            availableGroups = [{
                                partyId: raced.id,
                                partyName: pName,
                                memberCount: raced.member_count || 0,
                                description: `The default founding group for your ${scope}.`,
                                isFoundingGroup: true,
                            }];
                        }
                    }
                }
            }

            levels.push({
                scope,
                joinedPartyId: null,
                joinedPartyName: null,
                joinedMembers: null,
                votedFor: null,
                availableGroups,
                userState,
                userDistrict,
                userVillage
            });
        }
    }

    return (
        <ElectWizardClient
            levels={levels}
            currentUserId={user.id}
            nationalId={nationalId}
            issueId={issueId}
            issueText={nationalParty.issue_text}
            categoryId={nationalParty.category_id}
        />
    );
}
