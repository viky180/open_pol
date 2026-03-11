'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createPartyUrl } from '@/lib/createPartyUrl';
import { getPartyLocationLabel, getLocationScopeConfig } from '@/types/database';
import type { Party, MemberWithVotes, QuestionWithAnswers, QAMetrics } from '@/types/database';
import { buildPartyShareUrl, trackShareEvent } from '@/lib/share';
import { usePartyMembership } from './hooks/usePartyMembership';
import { usePartyIcon } from './hooks/usePartyIcon';
import {
    AuthModal,
    JoinGroupSelectionModal,
    IconPreviewModal,
    IconEditorModal,
    LeaveModal,
    PetitionCampaignModal,
    type PetitionCampaignDraft,
} from './components/PartyModals';
import { getProgressHint, getProgressTarget } from './components/PartyDetailShared';
import { GroupIconBadge } from './components/PartyPrimitives';
import {
    AboutTabPanel,
    ActivityTabPanel,
    AlliancesTabPanel,
    PartyDetailTabs,
    type PartyDetailTabId,
    PeopleTabPanel,
    PetitionsTabPanel,
    RecentActivityPanel,
} from './components/PartyDetailClientSections';
import { LeaderSection } from '@/components/LeaderSection';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PartyDetailClientProps {
    party: Party;
    memberCount: number;
    members: MemberWithVotes[];
    questions: QuestionWithAnswers[];
    qaMetrics: QAMetrics;
    currentUserId: string | null;
    isMember: boolean;
    isEligibleVoter: boolean;
    activeMembershipPartyId: string | null;
    memberSince: string | null;
    votedFor: string | null;
    voteExpiresAt: string | null;
    currentParentParty: Party | null;
    childGroups: Array<Pick<Party, 'id' | 'issue_text' | 'icon_svg' | 'icon_image_url'> & {
        memberCount: number;
        location_scope: string | null;
        state_name: string | null;
        district_name: string | null;
        block_name: string | null;
        panchayat_name: string | null;
        village_name: string | null;
    }>;
    siblingGroups: Array<{ id: string; issue_text: string; icon_svg?: string | null; icon_image_url?: string | null; memberCount: number }>;
    currentAlliance: { id: string; name: string; combinedMemberCount: number; leaderName: string | null } | null;
    canEditPartyIcon: boolean;
    levelNavigationTargets: Array<{
        id: string;
        issue_text: string;
        location_scope: string;
        is_current: boolean;
    }>;
    initialLikeCount: number;
    initialLikedByMe: boolean;
    weeklyMemberDelta: number;
    trendingPercent: number;
    rankInScope: number;
    isLeadingInScope: boolean;
    voicePath: Array<{
        id: string;
        issue_text: string;
        location_scope: string;
        total_members: number;
        is_current: boolean;
        is_leading: boolean;
    }>;
    groupLeaderMeta: {
        leaderId: string | null;
        leaderName: string | null;
        leaderSince: string | null;
        electedBy: number;
    };
    levelLeaderMeta: {
        leaderId: string | null;
        leaderName: string | null;
        leaderSince: string | null;
        electedBy: number;
        isFromThisGroup: boolean;
    };
    activityItems: Array<{
        id: string;
        type: 'post' | 'leader_message' | 'question' | 'milestone';
        title: string;
        preview: string;
        created_at: string;
    }>;
    petitionCampaigns: Array<{
        id: string;
        title: string;
        description: string;
        target_signatures: number;
        status: string;
        ends_at: string;
        created_at: string;
        signatures: number;
    }>;
    isCurrentUserLeader: boolean;
    issueId?: string | null;
}

type StatusTone = 'success' | 'error' | 'info';
type AutoProvisionScope = 'state' | 'district' | 'village';
type AutoProvisionNotice = {
    targetPartyId: string;
    created: Array<{ scope: AutoProvisionScope; party_id: string }>;
    reused: Array<{ scope: AutoProvisionScope; party_id: string }>;
    skipped: Array<{ scope: AutoProvisionScope; reason: string }>;
    createdAt: number;
};

const AUTO_PROVISION_NOTICE_STORAGE_KEY = 'openpolitics:auto-provision-notice';
const AUTO_PROVISION_SCOPE_LABEL: Record<AutoProvisionScope, string> = {
    state: 'State',
    district: 'District',
    village: 'Village',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PartyDetailClient(props: PartyDetailClientProps) {
    return <PartyDetailClientInner key={props.party.id} {...props} />;
}

function PartyDetailClientInner({
    party,
    memberCount,
    members,
    currentUserId,
    isMember,
    activeMembershipPartyId,
    memberSince,
    currentParentParty,
    childGroups,
    siblingGroups,
    currentAlliance,
    canEditPartyIcon,
    levelNavigationTargets,
    initialLikeCount,
    initialLikedByMe,
    weeklyMemberDelta,
    trendingPercent,
    rankInScope,
    isLeadingInScope,
    voicePath,
    groupLeaderMeta,
    levelLeaderMeta,
    activityItems,
    petitionCampaigns,
    isCurrentUserLeader,
    issueId,
}: PartyDetailClientProps) {
    const supabase = useMemo(() => createClient(), []);
    const [statusMessage, setStatusMessage] = useState<{ tone: StatusTone; text: string } | null>(null);
    const [autoProvisionNotice, setAutoProvisionNotice] = useState<AutoProvisionNotice | null>(null);
    const [activeTab, setActiveTab] = useState<PartyDetailTabId>('about');
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showPeopleNames, setShowPeopleNames] = useState(false);
    const [showPetitionModal, setShowPetitionModal] = useState(false);
    const [petitionSubmitting, setPetitionSubmitting] = useState(false);
    const [memberCountLive, setMemberCountLive] = useState(memberCount);
    const [likeCountLive, setLikeCountLive] = useState(initialLikeCount);
    const [likedByMe, setLikedByMe] = useState(initialLikedByMe);
    const [likeLoading, setLikeLoading] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement | null>(null);
    const router = useRouter();

    const showStatusMessage = (tone: StatusTone, text: string) => setStatusMessage({ tone, text });
    const handleRefresh = () => router.refresh();

    // ── Hooks ─────────────────────────────────────────────────────────────────

    const singleMembershipHint = 'You can join one group per level. Saving a group lets you revisit it later without becoming a member.';

    const {
        joinLoading,
        optimisticIsMember,
        joinDisabled,
        showAuthModal,
        setShowAuthModal,
        showLeaveModal,
        setShowLeaveModal,
        showJoinSelectionModal,
        setShowJoinSelectionModal,
        joinOptions,
        handleJoin,
        handleJoinSelection,
        handleLeave,
    } = usePartyMembership({
        partyId: party.id,
        partyIssueText: party.issue_text,
        partyIconSvg: party.icon_svg || null,
        partyIconImageUrl: party.icon_image_url || null,
        partyMemberCount: memberCountLive,
        currentUserId,
        isMember,
        activeMembershipPartyId,
        memberSince,
        siblingGroups,
        childGroups: childGroups,
        singleMembershipHint,
        onStatusMessage: showStatusMessage,
    });

    const {
        partyIconSvg,
        partyIconImageUrl,
        iconSvgDraft,
        setIconSvgDraft,
        iconImageUrlDraft,
        setIconImageUrlDraft,
        iconImageUploading,
        savingIcon,
        showIconPreviewModal,
        setShowIconPreviewModal,
        showIconEditorModal,
        setShowIconEditorModal,
        handleUploadIconImage,
        handleSavePartyIcon,
        handleResetIcon,
    } = usePartyIcon({
        partyId: party.id,
        initialIconSvg: party.icon_svg || null,
        initialIconImageUrl: party.icon_image_url || null,
        canEdit: canEditPartyIcon,
        onStatusMessage: showStatusMessage,
        onRefresh: handleRefresh,
    });

    // ── Derived data ──────────────────────────────────────────────────────────
    const locationScope = getLocationScopeConfig(party.location_scope || 'district');
    const growthTarget = getProgressTarget(memberCountLive);
    const growthHint = getProgressHint(memberCountLive);
    const growthProgress = Math.min(100, Math.round((memberCountLive / growthTarget) * 100));

    const [selectedJumpScope, setSelectedJumpScope] = useState<string | null>(null);

    const scopeTargetsMap = useMemo(() => {
        const map = new Map<string, Array<{ id: string; issue_text: string; is_current: boolean }>>();

        for (const target of levelNavigationTargets) {
            const targetsForScope = map.get(target.location_scope) || [];
            targetsForScope.push({
                id: target.id,
                issue_text: target.issue_text,
                is_current: target.is_current,
            });
            map.set(target.location_scope, targetsForScope);
        }

        for (const [scope, targets] of map.entries()) {
            map.set(
                scope,
                [...targets].sort((a, b) => {
                    if (a.is_current && !b.is_current) return -1;
                    if (!a.is_current && b.is_current) return 1;
                    return a.issue_text.localeCompare(b.issue_text);
                })
            );
        }

        return map;
    }, [levelNavigationTargets]);

    const jumpChips = [
        { scope: 'state', label: 'State' },
        { scope: 'district', label: 'District/City' },
        { scope: 'block', label: 'Block/Corporation' },
        { scope: 'panchayat', label: 'Panchayat/Ward' },
        { scope: 'village', label: 'Village/Locality' },
    ] as const;

    const testimonials = useMemo(() => {
        return activityItems
            .filter((item) => item.type === 'question' || item.type === 'post')
            .slice(0, 3)
            .map((item) => `“${item.preview.slice(0, 120)}${item.preview.length > 120 ? '…' : ''}”`);
    }, [activityItems]);

    const dynamicLevelBadge = useMemo(() => {
        if ((party.location_scope || 'district') === 'state' && party.state_name) {
            return `${party.state_name} State`;
        }
        return `${locationScope.label} Level`;
    }, [party.location_scope, party.state_name, locationScope.label]);

    const joinedStatusLine = optimisticIsMember
        ? 'You are a member of this group'
        : likedByMe
            ? 'Saved so you can revisit it later'
            : 'Not a member yet';
    const isFoundingNationalGroup = party.location_scope === 'national' && !!party.is_founding_group;
    const foundingElectionMemberThreshold = 50;
    const foundingElectionLocked = isFoundingNationalGroup && memberCountLive < foundingElectionMemberThreshold;
    const locationLabel = getPartyLocationLabel(party);
    const groupSummary = isFoundingNationalGroup
        ? `This founding group gives ${party.issue_text === 'Founding group' ? 'this issue' : party.issue_text} a neutral national home while competing national groups emerge.`
        : currentParentParty
            ? `This ${locationScope.label.toLowerCase()} group builds support for ${currentParentParty.issue_text}${locationLabel ? ` in ${locationLabel}` : ''}.`
            : `This ${locationScope.label.toLowerCase()} group gathers support around one clear public demand${locationLabel ? ` in ${locationLabel}` : ''}.`;

    const createForkHref = createPartyUrl({
        parent: currentParentParty?.id || null, fork_of: party.id, category: party.category_id || null,
        location_scope: party.location_scope || null, location_label: party.location_label || null,
        state_name: party.state_name || null, district_name: party.district_name || null,
        block_name: party.block_name || null, panchayat_name: party.panchayat_name || null,
        village_name: party.village_name || null,
    });

    const createChildHref = createPartyUrl({
        parent: party.id, category: party.category_id || null,
    });

    const iconPromptText = `Create a clean, simple square SVG logo for this civic group name: "${party.issue_text}".\nRules:\n- Output only raw <svg>...</svg> code.\n- No scripts, no external images/fonts, no foreignObject.\n- Keep it minimal and readable at small sizes (24px/32px).\n- Use warm neutral colors and high contrast text/symbol.\n- Keep file small (under 20KB).`;

    // ── Effects ───────────────────────────────────────────────────────────────

    useEffect(() => {
        setMemberCountLive(memberCount);
        setLikeCountLive(initialLikeCount);
        setLikedByMe(initialLikedByMe);
    }, [memberCount, initialLikeCount, initialLikedByMe, party.id]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const raw = window.sessionStorage.getItem(AUTO_PROVISION_NOTICE_STORAGE_KEY);
        if (!raw) {
            setAutoProvisionNotice(null);
            return;
        }

        try {
            const parsed = JSON.parse(raw) as AutoProvisionNotice;
            if (!parsed || parsed.targetPartyId !== party.id) {
                setAutoProvisionNotice(null);
                return;
            }
            setAutoProvisionNotice(parsed);
        } catch {
            setAutoProvisionNotice(null);
        }
    }, [party.id]);

    const refreshLiveCounts = async () => {
        try {
            const [memberResp, likeCountResp, likedResp] = await Promise.all([
                supabase
                    .from('parties')
                    .select('member_count')
                    .eq('id', party.id)
                    .maybeSingle(),
                supabase
                    .from('party_likes')
                    .select('*', { count: 'exact', head: true })
                    .eq('party_id', party.id),
                currentUserId
                    ? supabase
                        .from('party_likes')
                        .select('id')
                        .eq('party_id', party.id)
                        .eq('user_id', currentUserId)
                        .maybeSingle()
                    : Promise.resolve({ data: null }),
            ]);

            if (typeof memberResp.data?.member_count === 'number') {
                setMemberCountLive(memberResp.data.member_count);
            }

            setLikeCountLive(likeCountResp.count || 0);
            setLikedByMe(!!likedResp.data);
        } catch {
            // keep optimistic values if live fetch fails
        }
    };

    useEffect(() => {
        void refreshLiveCounts();
        const channel = supabase
            .channel(`party-detail-live-${party.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'memberships', filter: `party_id=eq.${party.id}` },
                () => { void refreshLiveCounts(); }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'party_likes', filter: `party_id=eq.${party.id}` },
                () => { void refreshLiveCounts(); }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [party.id, currentUserId]);

    useEffect(() => {
        if (optimisticIsMember && !isMember) {
            setMemberCountLive((prev) => prev + 1);
        }
        if (!optimisticIsMember && isMember) {
            setMemberCountLive((prev) => Math.max(0, prev - 1));
        }
    }, [optimisticIsMember, isMember]);

    useEffect(() => {
        if (!showMoreMenu) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!moreMenuRef.current?.contains(event.target as Node)) {
                setShowMoreMenu(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowMoreMenu(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showMoreMenu]);

    // ── Share ─────────────────────────────────────────────────────────────────

    const shareUrl = buildPartyShareUrl(party.id);
    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: party.issue_text, text: `Join this issue group: ${party.issue_text}`, url: shareUrl });
                await trackShareEvent({ platform: 'copy', partyId: party.id, source: 'party_detail_hero' });
                return;
            } catch { /* fall through */ }
        }
        try {
            await navigator.clipboard.writeText(shareUrl);
            await trackShareEvent({ platform: 'copy', partyId: party.id, source: 'party_detail_hero' });
            showStatusMessage('success', 'Link copied.');
        } catch {
            showStatusMessage('error', 'Could not copy link.');
        }
    };

    const handleLikeToggle = async () => {
        if (!currentUserId) {
            router.push(`/auth?returnTo=${encodeURIComponent(`/party/${party.id}`)}`);
            return;
        }
        if (likeLoading) return;

        const previousLiked = likedByMe;
        const previousCount = likeCountLive;
        const nextLiked = !likedByMe;

        setLikeLoading(true);
        setLikedByMe(nextLiked);
        setLikeCountLive((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));

        try {
            const res = await fetch(`/api/parties/${party.id}/like`, {
                method: nextLiked ? 'POST' : 'DELETE',
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload?.error || 'Could not update like status');
            }
        } catch (error) {
            setLikedByMe(previousLiked);
            setLikeCountLive(previousCount);
            showStatusMessage('error', error instanceof Error ? error.message : 'Could not update like status');
        } finally {
            setLikeLoading(false);
            void refreshLiveCounts();
        }
    };

    const handleJoinClick = () => {
        void handleJoin().finally(() => {
            void refreshLiveCounts();
        });
    };

    const handleLeaveClick = () => {
        void handleLeave().finally(() => {
            void refreshLiveCounts();
        });
    };

    const handleInviteFriends = async () => {
        const message = `Join ${party.issue_text} on Open Politics: ${shareUrl}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: party.issue_text, text: message, url: shareUrl });
                return;
            } catch {
                // fallback below
            }
        }

        try {
            await navigator.clipboard.writeText(message);
            showStatusMessage('success', 'Invite message copied. Share it with friends.');
        } catch {
            showStatusMessage('error', 'Could not prepare invite.');
        }
    };

    const handleAddToHome = () => {
        showStatusMessage('info', 'Use your browser menu and choose "Add to Home screen" to install Open Politics.');
        setShowMoreMenu(false);
    };

    const handleReport = () => {
        showStatusMessage('info', 'Report submitted. Our moderation team will review this group.');
        setShowMoreMenu(false);
    };

    const handleStartNewPetition = () => {
        if (!isCurrentUserLeader) {
            return;
        }
        setShowPetitionModal(true);
    };

    const handleCreatePetition = async (draft: PetitionCampaignDraft) => {
        if (!draft.title.trim() || !draft.description.trim() || !draft.endsAt || draft.targetSignatures < 1) {
            showStatusMessage('error', 'Add a title, description, signature target, and end date.');
            return;
        }

        setPetitionSubmitting(true);
        try {
            const response = await fetch(`/api/parties/${party.id}/petition-campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: draft.title.trim(),
                    description: draft.description.trim(),
                    target_signatures: draft.targetSignatures,
                    ends_at: new Date(`${draft.endsAt}T23:59:59`).toISOString(),
                    authority_name: draft.authorityName.trim() || undefined,
                    authority_email: draft.authorityEmail.trim() || undefined,
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.error || 'Could not start petition');
            }

            setShowPetitionModal(false);
            setActiveTab('petitions');
            showStatusMessage('success', 'Petition campaign started.');
            router.refresh();
        } catch (error) {
            showStatusMessage('error', error instanceof Error ? error.message : 'Could not start petition');
        } finally {
            setPetitionSubmitting(false);
        }
    };

    const handleSeeMembers = () => {
        setShowPeopleNames(true);
        setActiveTab('people');
        requestAnimationFrame(() => {
            document.getElementById('party-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const handleJumpToScope = (scope: string) => {
        const targets = scopeTargetsMap.get(scope) || [];

        if (targets.length === 0) {
            setSelectedJumpScope(null);
            return;
        }

        if (targets.length === 1) {
            const [target] = targets;
            if (target.id !== party.id) {
                router.push(`/party/${target.id}`);
            }
            setSelectedJumpScope(null);
            return;
        }

        setSelectedJumpScope((prev) => (prev === scope ? null : scope));
    };

    const jumpChooserTargets = selectedJumpScope
        ? (scopeTargetsMap.get(selectedJumpScope) || [])
        : [];

    const peopleRows = useMemo(() => {
        return [...members]
            .sort((a, b) => b.trust_votes - a.trust_votes)
            .map((member, index) => ({
                key: member.user_id,
                display: showPeopleNames
                    ? (member.display_name || `Member ${index + 1}`)
                    : `Anonymous Member ${index + 1}`,
                trust: member.trust_votes,
                joined: new Date(member.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            }));
    }, [members, showPeopleNames]);

    const recentActivityTeaser = activityItems.slice(0, 3);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="issue-shell" style={{ maxWidth: '1080px' }}>

            {/* Status toast */}
            {statusMessage && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`mb-4 rounded-2xl border px-3 py-3 text-sm animate-fade-in ${statusMessage.tone === 'error'
                        ? 'border-warning/20 bg-warning/10 text-warning'
                        : statusMessage.tone === 'success'
                            ? 'border-success/20 bg-success/10 text-success'
                            : 'border-border-primary bg-bg-card text-text-secondary'
                        }`}
                >
                    {statusMessage.text}
                </div>
            )}

            {autoProvisionNotice && (
                <div className="mb-4 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text-primary">
                    <p className="font-semibold text-accent">Local path ready for this issue</p>
                    <p className="mt-1 text-text-secondary">
                        We auto-created or found your local chain. Open the next level directly:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {[...autoProvisionNotice.created, ...autoProvisionNotice.reused].map((item) => (
                            <Link
                                key={`${item.scope}-${item.party_id}`}
                                href={`/party/${item.party_id}`}
                                className="btn btn-secondary btn-sm"
                            >
                                Open {AUTO_PROVISION_SCOPE_LABEL[item.scope]} group
                            </Link>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="mt-2 text-xs text-text-muted underline"
                        onClick={() => {
                            if (typeof window !== 'undefined') {
                                window.sessionStorage.removeItem(AUTO_PROVISION_NOTICE_STORAGE_KEY);
                            }
                            setAutoProvisionNotice(null);
                        }}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* 1) Hero */}
            <header className="relative z-10 mb-4 rounded-[22px] border border-black/10 bg-[linear-gradient(160deg,var(--iux-forest)_0%,var(--iux-forest2)_58%,var(--iux-forest3)_100%)] p-4 text-white shadow-[0_24px_60px_rgba(21,33,23,0.18)] sm:p-5">
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[rgba(232,151,30,0.09)]" aria-hidden="true" />
                <div className="absolute right-6 top-24 h-20 w-20 rounded-full bg-[rgba(232,151,30,0.05)]" aria-hidden="true" />

                <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="issue-hero-button"
                                aria-label="Go back"
                            >
                                ←
                            </button>
                            <div className="issue-meta-chip">Open Politics</div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="issue-meta-chip">{dynamicLevelBadge}</div>
                            <button
                                type="button"
                                onClick={handleShare}
                                className="issue-hero-button"
                                aria-label="Share"
                            >
                                ↗
                            </button>
                            <div className="relative" ref={moreMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowMoreMenu((prev) => !prev)}
                                    className="issue-hero-button"
                                    aria-label="More options"
                                >
                                    ⋮
                                </button>
                                {showMoreMenu && (
                                    <div className="absolute right-0 top-12 z-20 w-48 overflow-hidden rounded-2xl border border-border-primary bg-bg-primary text-text-primary shadow-xl">
                                        {party.location_scope !== 'village' && (
                                            <Link href={createChildHref} className="block px-3 py-2.5 text-sm hover:bg-bg-secondary" onClick={() => setShowMoreMenu(false)}>
                                                Start local chapter
                                            </Link>
                                        )}
                                        <Link href={createForkHref} className="block px-3 py-2.5 text-sm hover:bg-bg-secondary" onClick={() => setShowMoreMenu(false)}>
                                            {isFoundingNationalGroup ? 'Start alternative national group' : 'Create alternative group'}
                                        </Link>
                                        <button type="button" onClick={handleReport} className="block w-full px-3 py-2.5 text-left text-sm hover:bg-bg-secondary">
                                            Report
                                        </button>
                                        <button type="button" onClick={handleAddToHome} className="block w-full px-3 py-2.5 text-left text-sm hover:bg-bg-secondary">
                                            Add to Home
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {party.location_scope === 'national' && issueId && (
                        <Link
                            href={`/issue/${issueId}`}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold text-[var(--iux-ochre2)] transition hover:bg-white/20"
                        >
                            <span>Issue</span>
                            <span>→</span>
                        </Link>
                    )}

                    <div className="mt-4 flex items-start gap-4">
                        <GroupIconBadge
                            name={party.issue_text}
                            iconSvg={partyIconSvg}
                            iconImageUrl={partyIconImageUrl}
                            size={84}
                            clickable={canEditPartyIcon}
                            onClick={() => setShowIconPreviewModal(true)}
                            ring={true}
                        />
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-white/50" style={{ fontFamily: 'var(--font-mono)' }}>
                                {locationScope.label} Group
                            </p>
                            <h1 className="mt-2 text-3xl leading-tight text-white sm:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
                                {party.issue_text}
                            </h1>
                            <p className="mt-2 text-sm leading-6 text-white/70">
                                {locationLabel || `${locationScope.label} group`}
                            </p>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
                                {groupSummary}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="issue-meta-chip">{joinedStatusLine}</span>
                                {isFoundingNationalGroup && <span className="issue-meta-chip">Founding group</span>}
                                {trendingPercent > 0 && <span className="issue-meta-chip">Trending +{trendingPercent}%</span>}
                                {isLeadingInScope && <span className="issue-meta-chip">Leading in {locationScope.label}</span>}
                                {canEditPartyIcon && (
                                    <button type="button" onClick={() => setShowIconEditorModal(true)} className="issue-meta-chip">
                                        Edit Icon
                                    </button>
                                )}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {optimisticIsMember ? (
                                    <>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowLeaveModal(true)} disabled={joinLoading}>
                                            {joinLoading ? 'Leaving...' : 'Leave group'}
                                        </button>
                                        <button type="button" className="btn btn-primary btn-sm" onClick={handleInviteFriends}>
                                            Invite people
                                        </button>
                                        {isFoundingNationalGroup && (
                                            <Link href={createForkHref} className="btn btn-secondary btn-sm">
                                                Start alternative national group
                                            </Link>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <button type="button" className="btn btn-primary btn-sm" onClick={handleJoinClick} disabled={joinDisabled || joinLoading}>
                                            {joinLoading ? 'Joining...' : 'Join group'}
                                        </button>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleLikeToggle} disabled={likeLoading}>
                                            {likeLoading ? 'Saving...' : likedByMe ? 'Saved' : 'Save group'}
                                        </button>
                                        {isFoundingNationalGroup && (
                                            <Link href={createForkHref} className="btn btn-secondary btn-sm">
                                                Start alternative national group
                                            </Link>
                                        )}
                                    </>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm text-white hover:bg-white/10 hover:text-white"
                                    onClick={() => {
                                        setActiveTab('about');
                                        requestAnimationFrame(() => {
                                            document.getElementById('party-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        });
                                    }}
                                >
                                    How it works
                                </button>
                            </div>
                            <p className="mt-3 text-xs leading-6 text-white/60">{singleMembershipHint}</p>
                            {foundingElectionLocked && (
                                <p className="mt-2 text-xs leading-6 text-[var(--iux-ochre2)]">
                                    Leadership stays open in the founding group until {foundingElectionMemberThreshold} members join. Current progress: {memberCountLive}/{foundingElectionMemberThreshold}.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="issue-metric-grid">
                        <div className="issue-metric">
                            <p className="issue-metric__value">{memberCountLive.toLocaleString('en-IN')}</p>
                            <p className="issue-metric__label">Members</p>
                        </div>
                        <div className="issue-metric">
                            <p className="issue-metric__value">{likeCountLive.toLocaleString('en-IN')}</p>
                            <p className="issue-metric__label">Saved</p>
                        </div>
                        <div className="issue-metric">
                            <p className="issue-metric__value">#{rankInScope}</p>
                            <p className="issue-metric__label">{locationScope.label} Rank</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2) Tabs */}
            <section className="mb-4">
                <PartyDetailTabs activeTab={activeTab} onChange={setActiveTab} />
            </section>

            {/* 3) Tab content */}
            {activeTab === 'about' && (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)] lg:items-start">
                    <div className="space-y-4">
                        <section className="issue-card issue-card--soft">
                            <p className="issue-section-kicker">Compare nearby levels</p>
                            <h2 className="mt-2 text-2xl text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                                Explore the same issue at other levels
                            </h2>
                            <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-2">
                                {jumpChips.map((chip) => {
                                    const targets = scopeTargetsMap.get(chip.scope) || [];
                                    const hasTargets = targets.length > 0;
                                    const hasMultipleTargets = targets.length > 1;
                                    const isActive = (party.location_scope || 'district') === chip.scope;
                                    const isCurrentOnlyTarget = targets.length === 1 && targets[0].id === party.id;
                                    return (
                                        <button
                                            key={chip.scope}
                                            type="button"
                                            onClick={() => handleJumpToScope(chip.scope)}
                                            disabled={!hasTargets || isCurrentOnlyTarget}
                                            className={`relative shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition ${isActive
                                                ? 'border-primary bg-primary text-[var(--iux-ochre2)]'
                                                : 'border-border-primary bg-bg-card text-text-secondary hover:bg-bg-tertiary'
                                                } disabled:opacity-50`}
                                        >
                                            {chip.label}
                                            {hasMultipleTargets ? ` (${targets.length})` : ''}
                                            {isActive && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-orange-500" aria-hidden="true" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedJumpScope && jumpChooserTargets.length > 1 && (
                                <div className="mt-3 rounded-2xl border border-border-primary bg-bg-card p-3">
                                    <div className="mb-2 flex items-center justify-between px-1">
                                        <p className="text-xs font-semibold text-text-secondary">
                                            Choose {getLocationScopeConfig(selectedJumpScope).label} group
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedJumpScope(null)}
                                            className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-bg-primary hover:text-text-primary"
                                        >
                                            Close
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        {jumpChooserTargets.map((target) => (
                                            <button
                                                key={target.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedJumpScope(null);
                                                    if (!target.is_current) {
                                                        router.push(`/party/${target.id}`);
                                                    }
                                                }}
                                                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${target.is_current
                                                    ? 'border border-accent/40 bg-accent/10 text-accent'
                                                    : 'text-text-primary hover:bg-bg-primary'
                                                    }`}
                                            >
                                                <span className="line-clamp-2">{target.issue_text}</span>
                                                {target.is_current && (
                                                    <span className="mt-1 inline-block text-xs text-accent">Current group</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        <section className="issue-card">
                            <p className="issue-section-kicker">Representation path</p>
                            <h2 className="mt-2 text-2xl text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                                How support from this group can travel upward
                            </h2>
                            <div className="mt-3 space-y-2">
                                {voicePath.map((node, index) => (
                                    <div key={node.id}>
                                        <button
                                            type="button"
                                            onClick={() => node.id !== party.id && router.push(`/party/${node.id}`)}
                                            className={`w-full rounded-2xl border px-3 py-3 text-left transition ${node.is_current
                                                ? 'border-primary bg-primary text-[var(--iux-ochre2)]'
                                                : 'border-border-primary bg-bg-secondary hover:bg-bg-tertiary'
                                                }`}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className={`text-sm font-medium ${node.is_current ? 'text-[var(--iux-ochre2)]' : 'text-text-primary'}`}>{node.issue_text}</p>
                                                    <p className={`text-xs ${node.is_current ? 'text-white/60' : 'text-text-muted'}`}>{node.total_members.toLocaleString('en-IN')} members</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {node.is_current && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--iux-ochre2)]">Current group</span>}
                                                    {node.is_leading && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Leading</span>}
                                                </div>
                                            </div>
                                        </button>
                                        {index < voicePath.length - 1 && (
                                            <div className="mx-4 my-1 text-xs text-text-muted">Moves upward</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <AboutTabPanel
                            party={party}
                            currentParentParty={currentParentParty}
                            testimonials={testimonials}
                        />
                    </div>

                    <div className="space-y-4 lg:sticky lg:top-24">

                        {/* ── Card 1: This group's own internal leader ── */}
                        <section className="issue-card">
                            <p className="issue-section-kicker">This group&apos;s leader</p>
                            <h2 className="mt-2 text-2xl text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                                {foundingElectionLocked ? 'Leadership opens at 50 members' : 'Elected by members of this group'}
                            </h2>
                            <p className="mt-2 text-sm text-text-secondary leading-6">
                                {foundingElectionLocked
                                    ? `This founding group stays leaderless until ${foundingElectionMemberThreshold} members join. After that, members can trust-vote to elect a leader.`
                                    : 'Members trust-vote to elect their own leader. Every group independently elects one this way.'}
                            </p>
                            <div className="mt-4">
                                <LeaderSection
                                    leader={members.find(m => m.user_id === groupLeaderMeta.leaderId) || null}
                                    latestStatement={null}
                                    locationScope={party.location_scope}
                                    isWinningGroup={false}
                                    isGroupLeaderCard={true}
                                />
                            </div>
                            {groupLeaderMeta.leaderId ? (
                                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border-primary bg-bg-secondary/70 p-3">
                                    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-[var(--iux-ochre2)]">
                                        {(groupLeaderMeta.leaderName || 'L').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-text-primary">{groupLeaderMeta.leaderName || 'Anonymous leader'}</p>
                                        <p className="text-xs text-text-muted">
                                            {groupLeaderMeta.electedBy} trust vote{groupLeaderMeta.electedBy !== 1 ? 's' : ''} from this group
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSeeMembers}
                                        className="btn btn-secondary btn-sm shrink-0"
                                    >
                                        Trust-vote
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-3 rounded-2xl border border-border-primary bg-bg-secondary/70 p-3 text-sm text-text-secondary">
                                    {foundingElectionLocked
                                        ? `No leader yet. Election opens automatically once this founding group reaches ${foundingElectionMemberThreshold} members.`
                                        : <>
                                            No trust votes yet. Be the first to back a member of this group.{' '}
                                            <button type="button" onClick={handleSeeMembers} className="underline text-accent">
                                                See members
                                            </button>
                                        </>}
                                </div>
                            )}
                        </section>

                        {/* ── Card 2: Level-wide leader (from the most-membership group) ── */}
                        <section className={`issue-card ${isLeadingInScope ? 'border-success/30 bg-success/5' : ''}`}>
                            <p className="issue-section-kicker">{locationScope.label} level leader</p>
                            <h2 className="mt-2 text-2xl text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                                {isLeadingInScope
                                    ? 'Your group leads this level'
                                    : 'Who officially speaks for this level'}
                            </h2>
                            <p className="mt-2 text-sm text-text-secondary leading-6">
                                {isLeadingInScope
                                    ? `This group has the most members at the ${locationScope.label.toLowerCase()} level, so its leader officially represents this level.`
                                    : `The group with the most members at this level provides the official representative. Grow membership to compete.`}
                            </p>
                            <div className="mt-4">
                                {levelLeaderMeta.leaderId ? (
                                    <div className="flex items-center gap-3 rounded-2xl border border-border-primary bg-bg-secondary/70 p-3">
                                        <div className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[var(--iux-ochre2)] ${isLeadingInScope ? 'bg-success/20' : 'bg-primary'}`}>
                                            {(levelLeaderMeta.leaderName || 'L').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-text-primary">{levelLeaderMeta.leaderName || 'Anonymous'}</p>
                                            <p className="text-xs text-text-muted">
                                                {isLeadingInScope
                                                    ? `${levelLeaderMeta.electedBy} trust vote${levelLeaderMeta.electedBy !== 1 ? 's' : ''} · from this group`
                                                    : `From the leading group at this level`}
                                            </p>
                                        </div>
                                        {isLeadingInScope && (
                                            <span className="rounded-full border border-success/20 bg-success/10 px-2 py-1 text-[11px] font-medium text-success shrink-0">
                                                Leading
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-border-primary bg-bg-secondary/70 p-3 text-sm text-text-secondary">
                                        No level leader yet. The group that grows the most members here will provide the representative.
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="issue-card">
                            <div className="flex items-baseline justify-between gap-2">
                                <div>
                                    <p className="issue-section-kicker">Progress</p>
                                    <h2 className="mt-2 text-2xl text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                                        Momentum toward the next milestone
                                    </h2>
                                </div>
                                <span className="text-xs text-text-muted">{memberCountLive} / {growthTarget} members</span>
                            </div>
                            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-bg-tertiary">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${growthProgress}%` }} />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-border-primary bg-bg-secondary/70 px-3 py-3">
                                    <p className="issue-section-kicker">This Week</p>
                                    <p className={`mt-2 text-2xl ${weeklyMemberDelta >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontFamily: 'var(--font-display)' }}>
                                        {weeklyMemberDelta >= 0 ? '+' : ''}{weeklyMemberDelta}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-border-primary bg-bg-secondary/70 px-3 py-3">
                                    <p className="issue-section-kicker">Next step</p>
                                    <p className="mt-2 text-sm font-semibold text-text-primary">{growthHint}</p>
                                </div>
                            </div>
                        </section>

                        <RecentActivityPanel activityItems={recentActivityTeaser} />
                    </div>
                </div>
            )}

            {activeTab === 'activity' && (
                <ActivityTabPanel activityItems={activityItems} />
            )}

            {activeTab === 'people' && (
                <PeopleTabPanel
                    memberCountLive={memberCountLive}
                    showPeopleNames={showPeopleNames}
                    onToggleShowPeopleNames={setShowPeopleNames}
                    peopleRows={peopleRows}
                />
            )}

            {activeTab === 'petitions' && (
                <PetitionsTabPanel
                    petitionCampaigns={petitionCampaigns}
                    canStartNewPetition={isCurrentUserLeader}
                    onStartNewPetition={handleStartNewPetition}
                />
            )}

            {activeTab === 'alliances' && (
                <AlliancesTabPanel currentAlliance={currentAlliance} />
            )}

            {/* Modals */}
            {showAuthModal && <AuthModal partyId={party.id} onCancel={() => setShowAuthModal(false)} />}

            {showJoinSelectionModal && (
                <JoinGroupSelectionModal
                    options={joinOptions}
                    joinLoading={joinLoading}
                    onSelect={handleJoinSelection}
                    onCancel={() => setShowJoinSelectionModal(false)}
                />
            )}

            {showLeaveModal && (
                <LeaveModal
                    partyIssueText={party.issue_text}
                    joinLoading={joinLoading}
                    onCancel={() => setShowLeaveModal(false)}
                    onLeave={handleLeaveClick}
                />
            )}

            {showPetitionModal && (
                <PetitionCampaignModal
                    partyIssueText={party.issue_text}
                    submitting={petitionSubmitting}
                    onClose={() => setShowPetitionModal(false)}
                    onSubmit={handleCreatePetition}
                />
            )}

            {showIconPreviewModal && canEditPartyIcon && (
                <IconPreviewModal
                    issueText={party.issue_text}
                    iconSvg={partyIconSvg}
                    iconImageUrl={partyIconImageUrl}
                    onClose={() => setShowIconPreviewModal(false)}
                />
            )}

            {showIconEditorModal && canEditPartyIcon && (
                <IconEditorModal
                    issueText={party.issue_text}
                    iconSvgDraft={iconSvgDraft}
                    onIconSvgDraftChange={setIconSvgDraft}
                    iconImageUrlDraft={iconImageUrlDraft}
                    onIconImageUrlDraftChange={setIconImageUrlDraft}
                    iconImageUploading={iconImageUploading}
                    savingIcon={savingIcon}
                    iconPromptText={iconPromptText}
                    onUploadIconImage={handleUploadIconImage}
                    onSavePartyIcon={handleSavePartyIcon}
                    onReset={handleResetIcon}
                    onClose={() => setShowIconEditorModal(false)}
                    onShowStatusMessage={showStatusMessage}
                />
            )}
        </div>
    );
}
