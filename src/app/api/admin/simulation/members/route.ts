import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminUserId } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminUserId(user.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const partyId = request.nextUrl.searchParams.get('partyId');
    if (!partyId) {
        return NextResponse.json({ error: 'partyId is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from('memberships')
        .select('user_id, joined_at, profiles:user_id(display_name)')
        .eq('party_id', partyId)
        .is('left_at', null)
        .order('joined_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const members = (data || []).map((row) => {
        const relatedProfile = row.profiles as
            | { display_name: string | null }
            | Array<{ display_name: string | null }>
            | null;

        const displayName = Array.isArray(relatedProfile)
            ? relatedProfile[0]?.display_name
            : relatedProfile?.display_name;

        return {
            user_id: row.user_id,
            joined_at: row.joined_at,
            display_name: displayName || 'Anonymous',
            is_subgroup_leader: false,
            subgroup_name: null as string | null,
        };
    });

    // Include direct child subgroup leaders as eligible leadership candidates
    const { data: childGroups, error: childGroupsError } = await adminClient
        .from('parties')
        .select('id, issue_text')
        .eq('parent_party_id', partyId);

    if (childGroupsError) {
        return NextResponse.json({ error: childGroupsError.message }, { status: 500 });
    }

    const subgroupLeaders: Array<{
        user_id: string;
        joined_at: string | null;
        display_name: string;
        is_subgroup_leader: boolean;
        subgroup_name: string | null;
    }> = [];

    for (const child of childGroups || []) {
        const { data: leaderId, error: leaderError } = await adminClient.rpc('get_party_leader', {
            p_party_id: child.id,
        });

        if (leaderError) {
            return NextResponse.json({ error: leaderError.message }, { status: 500 });
        }

        if (!leaderId) {
            continue;
        }

        const { data: leaderProfile, error: profileError } = await adminClient
            .from('profiles')
            .select('display_name')
            .eq('id', leaderId)
            .maybeSingle();

        if (profileError) {
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        subgroupLeaders.push({
            user_id: leaderId as string,
            joined_at: null,
            display_name: leaderProfile?.display_name || 'Anonymous',
            is_subgroup_leader: true,
            subgroup_name: child.issue_text || null,
        });
    }

    // Merge direct members + subgroup leaders uniquely by user_id
    const byUserId = new Map<string, {
        user_id: string;
        joined_at: string | null;
        display_name: string;
        is_subgroup_leader: boolean;
        subgroup_name: string | null;
    }>();

    for (const member of members) {
        byUserId.set(member.user_id, member);
    }

    for (const subgroupLeader of subgroupLeaders) {
        const existing = byUserId.get(subgroupLeader.user_id);
        if (!existing) {
            byUserId.set(subgroupLeader.user_id, subgroupLeader);
            continue;
        }

        // If user is both direct member and subgroup leader, preserve direct member data
        // while surfacing subgroup-leader metadata for clearer admin selection UI.
        byUserId.set(subgroupLeader.user_id, {
            ...existing,
            is_subgroup_leader: existing.is_subgroup_leader || subgroupLeader.is_subgroup_leader,
            subgroup_name: existing.subgroup_name || subgroupLeader.subgroup_name,
        });
    }

    return NextResponse.json(Array.from(byUserId.values()));
}
