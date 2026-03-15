import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { BackMemberClient } from './BackMemberClient';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ groupId: string; memberId: string }>;
}

export default async function BackMemberPage({ params }: Props) {
    const { groupId, memberId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/auth?returnTo=/back/${groupId}/${memberId}`);
    }

    // Fetch group and member in parallel
    const [groupResult, memberResult, voteResult, membershipResult] = await Promise.all([
        supabase
            .from('parties')
            .select('id, issue_text, location_scope, member_count, is_founding_group')
            .eq('id', groupId)
            .maybeSingle(),
        supabase
            .from('profiles')
            .select('id, display_name, bio')
            .eq('id', memberId)
            .maybeSingle(),
        supabase
            .from('trust_votes')
            .select('to_user_id')
            .eq('party_id', groupId)
            .eq('from_user_id', user.id)
            .maybeSingle(),
        supabase
            .from('memberships')
            .select('id')
            .eq('party_id', groupId)
            .eq('user_id', user.id)
            .is('left_at', null)
            .maybeSingle(),
    ]);

    const group = groupResult.data;
    const member = memberResult.data;

    if (!group || !member) notFound();

    // Verify the target person is actually a member of this group
    const { data: candidateMembership } = await supabase
        .from('memberships')
        .select('id')
        .eq('party_id', groupId)
        .eq('user_id', memberId)
        .is('left_at', null)
        .maybeSingle();

    if (!candidateMembership) notFound();

    // Block self-backing
    const isSelf = user.id === memberId;

    return (
        <div className="min-h-screen bg-bg-primary flex items-start justify-center px-4 pt-12 pb-16">
            <BackMemberClient
                groupId={groupId}
                groupName={group.issue_text ?? 'this group'}
                memberId={memberId}
                memberName={member.display_name ?? 'this member'}
                memberBio={member.bio ?? null}
                currentUserId={user.id}
                isMember={!!membershipResult.data}
                alreadyVotedFor={voteResult.data?.to_user_id ?? null}
                isSelf={isSelf}
            />
        </div>
    );
}
