'use client';

import { useMemo, useState, useEffect, useRef, type ReactNode } from 'react';
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
    IconPreviewModal,
    IconEditorModal,
    LeaveModal,
    PetitionCampaignModal,
    type PetitionCampaignDraft,
} from './components/PartyModals';
import { getProgressHint, getProgressTarget, InfoTooltip } from './components/PartyDetailShared';
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

// Types

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
    initialLikeCount: number;
    initialLikedByMe: boolean;
    weeklyMemberDelta: number;
    trendingPercent: number;
    rankInScope: number;
    isLeadingInScope: boolean;
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

const MENU_ITEM_CLS = 'block px-3 py-2.5 text-sm hover:bg-bg-secondary';

interface LeaderSummaryRowProps {
    displayName: string;
    avatarSeed?: string | null;
    subtitle: ReactNode;
    avatarToneClassName?: string;
    aside?: ReactNode;
}

function LeaderSummaryRow({
    displayName,
    avatarSeed,
    subtitle,
    avatarToneClassName = 'bg-primary',
    aside = null,
}: LeaderSummaryRowProps) {
    return (
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border-primary bg-bg-secondary/70 p-3">
            <div className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[var(--iux-ochre2)] ${avatarToneClassName}`}>
                {(avatarSeed || displayName || 'L').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary">{displayName}</p>
                <p className="text-xs text-text-muted">{subtitle}</p>
            </div>
            {aside}
        </div>
    );
}

// ── Utilities ──────────────────────────────────────────────────────────────

function trustVoteLabel(count: number): string {
    return `${count} trust vote${count !== 1 ? 's' : ''}`;
}

async function shareWithFallback(
    payload: { title: string; text: string; url: string },
    clipboardText: string,
    successMessage: string,
    onSuccess: (msg: string) => void,
    onError: (msg: string) => void,
): Promise<void> {
    if (navigator.share) {
        try {
            await navigator.share(payload);
            return;
        } catch { /* fall through to clipboard */ }
    }
    try {
        await navigator.clipboard.writeText(clipboardText);
        onSuccess(successMessage);
    } catch {
        onError('Could not copy link.');
    }
}

// ── Internal UI primitives ─────────────────────────────────────────────────

interface SectionHeaderProps {
    kicker: string;
    heading?: ReactNode;
    description?: ReactNode;
    tooltip?: ReactNode;
}

function SectionHeader({ kicker, heading, description, tooltip }: SectionHeaderProps) {
    return (
        <>
            <div className="flex items-start gap-2">
                <p className="issue-section-kicker">{kicker}</p>
                {tooltip && (
                    <InfoTooltip
                        content={tooltip}
                        label={`More information about ${typeof heading === 'string' ? heading : kicker}`}
                        className="mt-0.5 shrink-0"
                    />
                )}
            </div>
            {heading && (
                <h2 className="mt-2 text-2xl text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                    {heading}
                </h2>
            )}
            {description && (
                <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
            )}
        </>
    );
}

interface StatCardProps {
    label: string;
    children: ReactNode;
}

function StatCard({ label, children }: StatCardProps) {
    return (
        <div className="rounded-2xl border border-border-primary bg-bg-secondary/70 px-3 py-3">
            <p className="issue-section-kicker">{label}</p>
            <div className="mt-2">{children}</div>
        </div>
    );
}

function NoLeaderCard({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-border-primary bg-bg-secondary/70 p-3 text-sm text-text-secondary ${className ?? ''}`}>
            {children}
        </div>
    );
}

// Component

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
    initialLikeCount,
    initialLikedByMe,
    weeklyMemberDelta,
    trendingPercent,
    rankInScope,
    isLeadingInScope,
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

    // Hooks

    const singleMembershipHint = 'You can join one group at each level. You can still save a group to come back to it later.';

    const {
        joinLoading,
        optimisticIsMember,
        joinDisabled,
        showAuthModal,
        setShowAuthModal,
        showLeaveModal,
        setShowLeaveModal,
        handleJoin,
        handleLeave,
    } = usePartyMembership({
        partyId: party.id,
        currentUserId,
        isMember,
        activeMembershipPartyId,
        memberSince,
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

    // Derived data
    const locationScope = getLocationScopeConfig(party.location_scope || 'district');
    const growthTarget = getProgressTarget(memberCountLive);
    const growthHint = getProgressHint(memberCountLive);
    const growthProgress = Math.min(100, Math.round((memberCountLive / growthTarget) * 100));

    const dynamicLevelBadge = useMemo(() => {
        if ((party.location_scope || 'district') === 'state' && party.state_name) {
            return `${party.state_name} State`;
        }
        return `${locationScope.label} Level`;
    }, [party.location_scope, party.state_name, locationScope.label]);

    const isFoundingNationalGroup = party.location_scope === 'national' && !!party.is_founding_group;
    const foundingElectionMemberThreshold = 50;
    const foundingElectionLocked = isFoundingNationalGroup && memberCountLive < foundingElectionMemberThreshold;
    const locationLabel = getPartyLocationLabel(party);
    const groupSummary = isFoundingNationalGroup
        ? 'This national group helps people organize around this issue until more national groups are formed.'
        : currentParentParty
            ? `This ${locationScope.label.toLowerCase()} group builds support for ${currentParentParty.issue_text}${locationLabel ? ` in ${locationLabel}` : ''}.`
            : `This ${locationScope.label.toLowerCase()} group brings people together around one clear public demand${locationLabel ? ` in ${locationLabel}` : ''}.`;
    const alternateGroupLabel = isFoundingNationalGroup ? 'Start another national group' : 'Start another group';

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

    // Effects

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

    // Share

    const shareUrl = buildPartyShareUrl(party.id);
    const handleShare = async () => {
        await shareWithFallback(
            { title: party.issue_text, text: `Take a look at this group: ${party.issue_text}`, url: shareUrl },
            shareUrl,
            'Link copied.',
            (msg) => showStatusMessage('success', msg),
            (msg) => showStatusMessage('error', msg),
        );
        await trackShareEvent({ platform: 'copy', partyId: party.id, source: 'party_detail_hero' });
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

    const withRefresh = (fn: () => Promise<void>) => (): void => {
        void fn().finally(() => { void refreshLiveCounts(); });
    };

    const handleJoinClick = withRefresh(handleJoin);
    const handleLeaveClick = withRefresh(handleLeave);

    const handleInviteFriends = async () => {
        const message = `Join ${party.issue_text} on Open Politics: ${shareUrl}`;
        await shareWithFallback(
            { title: party.issue_text, text: message, url: shareUrl },
            message,
            'Invite message copied.',
            (msg) => showStatusMessage('success', msg),
            (msg) => showStatusMessage('error', msg),
        );
    };

    const handleAddToHome = () => {
        showStatusMessage('info', 'Use your browser menu, then choose "Add to Home screen" to install Open Politics.');
        setShowMoreMenu(false);
    };

    const handleReport = () => {
        showStatusMessage('info', 'Thanks. Our moderation team will review this group.');
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
            showStatusMessage('error', 'Add a title, description, signature goal, and end date.');
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
                throw new Error(payload?.error || 'Could not create the petition');
            }

            setShowPetitionModal(false);
            setActiveTab('petitions');
            showStatusMessage('success', 'Petition created.');
            router.refresh();
        } catch (error) {
            showStatusMessage('error', error instanceof Error ? error.message : 'Could not create the petition');
        } finally {
            setPetitionSubmitting(false);
        }
    };

    const openTab = (tab: PartyDetailTabId) => {
        setActiveTab(tab);
        requestAnimationFrame(() => {
            document.getElementById('party-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const handleSeeMembers = () => {
        setShowPeopleNames(true);
        openTab('people');
    };

    const peopleRows = useMemo(() => {
        return [...members]
            .sort((a, b) => b.trust_votes - a.trust_votes)
            .map((member, index) => ({
                key: member.user_id,
                display: showPeopleNames
                    ? (member.display_name || `Member ${index + 1}`)
                    : `Member ${index + 1}`,
                trust: member.trust_votes,
                joined: new Date(member.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            }));
    }, [members, showPeopleNames]);

    const recentActivityTeaser = activityItems.slice(0, 3);

    // Render

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
                    <p className="font-semibold text-accent">Your local path is ready</p>
                    <p className="mt-1 text-text-secondary">
                        We found or created the next local groups for this issue:
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
                                {'\u2190'}
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
                                {'\u2197'}
                            </button>
                            <div className="relative" ref={moreMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowMoreMenu((prev) => !prev)}
                                    className="issue-hero-button"
                                    aria-label="More options"
                                >
                                    {'\u22EE'}
                                </button>
                                {showMoreMenu && (
                                    <div className="absolute right-0 top-12 z-20 w-48 overflow-hidden rounded-2xl border border-border-primary bg-bg-primary text-text-primary shadow-xl">
                                        {party.location_scope !== 'village' && (
                                            <Link href={createChildHref} className={MENU_ITEM_CLS} onClick={() => setShowMoreMenu(false)}>
                                                Start local chapter
                                            </Link>
                                        )}
                                        <Link href={createForkHref} className={MENU_ITEM_CLS} onClick={() => setShowMoreMenu(false)}>
                                            {alternateGroupLabel}
                                        </Link>
                                        <button type="button" onClick={handleReport} className={`w-full text-left ${MENU_ITEM_CLS}`}>
                                            Report group
                                        </button>
                                        <button type="button" onClick={handleAddToHome} className={`w-full text-left ${MENU_ITEM_CLS}`}>
                                            Add to home screen
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
                            <span>{'\u2192'}</span>
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
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <h1 className="text-3xl leading-tight text-white sm:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
                                    {party.issue_text}
                                </h1>
                                {isFoundingNationalGroup && (
                                    <InfoTooltip
                                        content="This national group helps people organize around this issue until more national groups are formed."
                                        label="Founding group information"
                                        className="shrink-0"
                                    />
                                )}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-white/70">
                                {locationLabel || `${locationScope.label} group`}
                            </p>
                            {!isFoundingNationalGroup && (
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
                                    {groupSummary}
                                </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                                {isFoundingNationalGroup && <span className="issue-meta-chip">Founding group</span>}
                                {trendingPercent > 0 && <span className="issue-meta-chip">Trending +{trendingPercent}%</span>}
                                {isLeadingInScope && <span className="issue-meta-chip">Leading in {locationScope.label}</span>}
                                {canEditPartyIcon && (
                                    <button type="button" onClick={() => setShowIconEditorModal(true)} className="issue-meta-chip">
                                        Edit icon
                                    </button>
                                )}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {optimisticIsMember ? (
                                    <>
                                        <button type="button" className="btn btn-secondary btn-sm" disabled>
                                            Joined
                                        </button>
                                        <button type="button" className="btn btn-primary btn-sm" onClick={handleInviteFriends}>
                                            Invite others
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" className="btn btn-primary btn-sm" onClick={handleJoinClick} disabled={joinDisabled || joinLoading}>
                                            {joinLoading ? 'Joining...' : 'Join group'}
                                        </button>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleLikeToggle} disabled={likeLoading}>
                                            {likeLoading ? 'Saving...' : likedByMe ? 'Saved' : 'Save'}
                                        </button>
                                    </>
                                )}
                            </div>
                            <p className="mt-3 text-xs leading-6 text-white/60">{singleMembershipHint}</p>
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
                        <AboutTabPanel
                            party={party}
                            currentParentParty={currentParentParty}
                        />
                    </div>

                    <div className="space-y-4 lg:sticky lg:top-24">

                        {/* Card 1: This group's own internal leader */}
                        <section className="issue-card">
                            <SectionHeader
                                kicker="Group leadership"
                                heading={foundingElectionLocked ? 'Leadership starts at 50 members' : 'Chosen by members of this group'}
                                tooltip={foundingElectionLocked
                                    ? `This founding group has no leader until ${foundingElectionMemberThreshold} members join. After that, members can use trust votes to choose one.`
                                    : 'Members use trust votes to choose one leader for this group. You can change your vote at any time.'}
                            />
                            {groupLeaderMeta.leaderId ? (
                                <LeaderSummaryRow
                                    displayName={groupLeaderMeta.leaderName || 'Anonymous leader'}
                                    avatarSeed={groupLeaderMeta.leaderName}
                                    subtitle={`${trustVoteLabel(groupLeaderMeta.electedBy)} from this group`}
                                    aside={(
                                        <button
                                            type="button"
                                            onClick={handleSeeMembers}
                                            className="btn btn-secondary btn-sm shrink-0"
                                        >
                                            Choose leader
                                        </button>
                                    )}
                                />
                            ) : (
                                <NoLeaderCard className="mt-3">
                                    {foundingElectionLocked
                                        ? `No leader yet. Voting starts automatically when this founding group reaches ${foundingElectionMemberThreshold} members.`
                                        : <>
                                            No trust votes yet. Be the first to back a member of this group.{' '}
                                            <button type="button" onClick={handleSeeMembers} className="underline text-accent">
                                                View members
                                            </button>
                                        </>}
                                </NoLeaderCard>
                            )}
                        </section>

                        {/* Card 2: Level-wide leader (from the most-membership group) */}
                        <section className={`issue-card ${isLeadingInScope ? 'border-success/30 bg-success/5' : ''}`}>
                            <SectionHeader
                                kicker={`${locationScope.label} representative`}
                                heading={isLeadingInScope ? 'This group speaks for this level' : 'Who speaks for this level'}
                                tooltip={isLeadingInScope
                                    ? `This group has the most members at the ${locationScope.label.toLowerCase()} level, so its leader speaks for this level.`
                                    : 'At each level, the group with the most members provides the person who speaks for this level.'}
                            />
                            <div className="mt-4">
                                {levelLeaderMeta.leaderId ? (
                                    <LeaderSummaryRow
                                        displayName={levelLeaderMeta.leaderName || 'Anonymous'}
                                        avatarSeed={levelLeaderMeta.leaderName}
                                        avatarToneClassName={isLeadingInScope ? 'bg-success/20' : 'bg-primary'}
                                        subtitle={isLeadingInScope
                                            ? `${trustVoteLabel(levelLeaderMeta.electedBy)} from this group`
                                            : 'Chosen inside the largest group at this level'}
                                        aside={isLeadingInScope ? (
                                            <span className="rounded-full border border-success/20 bg-success/10 px-2 py-1 text-[11px] font-medium text-success shrink-0">
                                                Leading
                                            </span>
                                        ) : null}
                                    />
                                ) : (
                                    <NoLeaderCard>
                                        No representative yet. Whichever group reaches the most members here will send one.
                                    </NoLeaderCard>
                                )}
                            </div>
                        </section>

                        <section className="issue-card">
                            <div className="flex items-baseline justify-between gap-2">
                                <div>
                                    <SectionHeader
                                        kicker="Progress"
                                        heading="Progress to the next milestone"
                                    />
                                </div>
                                <span className="text-xs text-text-muted">{memberCountLive} / {growthTarget} members</span>
                            </div>
                            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-bg-tertiary">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${growthProgress}%` }} />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <StatCard label="This Week">
                                    <p className={`text-2xl ${weeklyMemberDelta >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontFamily: 'var(--font-display)' }}>
                                        {weeklyMemberDelta >= 0 ? '+' : ''}{weeklyMemberDelta}
                                    </p>
                                </StatCard>
                                <StatCard label="Next step">
                                    <p className="text-sm font-semibold text-text-primary">{growthHint}</p>
                                </StatCard>
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
