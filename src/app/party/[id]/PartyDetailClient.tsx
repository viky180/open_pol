'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createPartyUrl } from '@/lib/createPartyUrl';
import { getCreateChildGroupLabel } from '@/lib/partyCreation';
import type { Party, MemberWithVotes, QuestionWithAnswers, QAMetrics } from '@/types/database';
import { getLocationScopeConfig, getPartyLocationLabel } from '@/types/database';
import { buildPartyShareUrl, trackShareEvent } from '@/lib/share';
import { PartyHierarchyTree } from '@/components/PartyHierarchyTree';
import { usePartyMembership } from './hooks/usePartyMembership';
import { AuthModal } from './components/PartyModals';
import { PartySectionTabs } from './components/PartyDetailChrome';
import type { PartySectionTab } from './components/PartyDetailChrome';

interface PartyDetailClientProps {
    party: Party;
    memberCount: number;
    members: MemberWithVotes[];
    questions: QuestionWithAnswers[];
    qaMetrics: QAMetrics;
    currentUserId: string | null;
    isMember: boolean;
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
    isGoverning: boolean;
    competingGroups: Array<{ id: string; issue_text: string; icon_svg?: string | null; icon_image_url?: string | null; memberCount: number }>;
    currentUserIsSubgroupLeader: boolean;
    currentUserNomination: { nominated: boolean; fromPartyId: string | null };
    currentAlliance: { id: string; name: string } | null;
    canEditPartyIcon: boolean;
}

type StatusTone = 'success' | 'error' | 'info';
type TabId = 'overview' | 'structure' | 'qa';

const PARTY_DETAIL_ACCENT_STYLE: CSSProperties = {
    '--color-primary': '#a35a2d',
    '--color-primary-dark': '#844823',
    '--color-primary-light': '#b9744a',
} as CSSProperties;

const TABS: PartySectionTab<TabId>[] = [
    { id: 'overview', label: 'Overview', sectionId: 'party-section-overview' },
    { id: 'structure', label: 'Structure', sectionId: 'party-section-structure' },
    { id: 'qa', label: 'Q&A', sectionId: 'party-section-qa' },
];

function formatDaysUntil(dateValue: string | null) {
    if (!dateValue) return null;
    const expiresAtMs = new Date(dateValue).getTime();
    if (Number.isNaN(expiresAtMs)) return null;
    const diffMs = expiresAtMs - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(days, 0);
}

function buildDefaultGroupIconSvg(name: string) {
    const first = (name || 'G').trim().charAt(0).toUpperCase() || 'G';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${first}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f6e6da"/><stop offset="100%" stop-color="#ddb297"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#6b3a1f" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="30">${first}</text></svg>`;
}

function svgToDataUri(svg: string) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getGroupIconSrc(name: string, iconSvg?: string | null, iconImageUrl?: string | null) {
    return iconImageUrl?.trim() || (iconSvg ? svgToDataUri(iconSvg) : svgToDataUri(buildDefaultGroupIconSvg(name)));
}

function GroupIconBadge({
    name,
    iconSvg,
    iconImageUrl,
    size = 24,
    clickable = false,
    onClick,
    clickLabel,
    ring = false,
}: {
    name: string;
    iconSvg?: string | null;
    iconImageUrl?: string | null;
    size?: number;
    clickable?: boolean;
    onClick?: () => void;
    clickLabel?: string;
    ring?: boolean;
}) {
    const [failed, setFailed] = useState(false);
    const resolvedImageSrc = !failed
        ? getGroupIconSrc(name, iconSvg, iconImageUrl)
        : svgToDataUri(buildDefaultGroupIconSvg(name));

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!clickable}
            className={`inline-flex items-center justify-center overflow-hidden rounded-md border border-border-primary bg-bg-tertiary ${clickable ? 'hover:border-primary/40 cursor-pointer' : 'cursor-default'} ${ring ? 'ring-2 ring-primary/30 ring-offset-1' : ''}`}
            style={{ width: size, height: size }}
            aria-label={clickable ? (clickLabel || 'View group icon') : `${name} icon`}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={resolvedImageSrc}
                alt=""
                aria-hidden="true"
                width={size}
                height={size}
                className="h-full w-full object-cover"
                onError={() => setFailed(true)}
            />
        </button>
    );
}

/** Circular SVG progress ring for response rate visualization */
function ResponseRing({ percent }: { percent: number }) {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    const color = percent >= 75 ? '#22c55e' : percent >= 40 ? '#f59e0b' : '#ef4444';

    return (
        <div className="flex flex-col items-center gap-1">
            <svg width="72" height="72" viewBox="0 0 72 72" aria-label={`${percent}% response rate`}>
                <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-bg-tertiary" />
                <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform="rotate(-90 36 36)"
                    style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
                />
                <text x="36" y="36" dominantBaseline="central" textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>
                    {percent}%
                </text>
            </svg>
            <span className="text-[11px] uppercase tracking-wide text-text-muted">Response Rate</span>
        </div>
    );
}

/** Mini stat tile for number-based metrics */
function StatTile({ value, label, colorClass }: { value: number | string; label: string; colorClass?: string }) {
    return (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-border-primary bg-bg-card px-4 py-3 text-center shadow-sm">
            <span className={`text-2xl font-bold ${colorClass ?? 'text-text-primary'}`}>{value}</span>
            <span className="text-[11px] uppercase tracking-wide text-text-muted">{label}</span>
        </div>
    );
}

/** A single mini-card used in the competing groups grid */
function GroupMiniCard({
    group,
    isWinner,
    isSelf,
}: {
    group: { id: string; issue_text: string; icon_svg?: string | null; icon_image_url?: string | null; memberCount: number };
    isWinner: boolean;
    isSelf?: boolean;
}) {
    const inner = (
        <div className={`relative flex flex-col gap-2 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${isSelf ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : 'border-border-primary bg-bg-card'}`}>
            {isWinner && (
                <span className="absolute -top-2 -right-2 inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                    🏆 Winner
                </span>
            )}
            <div className="flex items-center gap-2">
                <GroupIconBadge name={group.issue_text} iconSvg={group.icon_svg} iconImageUrl={group.icon_image_url} size={28} />
                <p className={`line-clamp-2 flex-1 text-xs font-medium leading-snug ${isSelf ? 'text-primary' : 'text-text-primary'}`}>
                    {group.issue_text}
                </p>
            </div>
            <p className="text-[11px] text-text-muted">{group.memberCount.toLocaleString('en-IN')} {group.memberCount === 1 ? 'member' : 'members'}</p>
        </div>
    );

    return isSelf ? <div>{inner}</div> : (
        <Link href={`/party/${group.id}`} className="block no-underline">
            {inner}
        </Link>
    );
}

/** Styled empty state with optional action CTA */
function EmptyStateCard({
    icon,
    title,
    description,
    actionLabel,
    actionHref,
    onAction,
}: {
    icon: string;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border-secondary/50 bg-bg-tertiary/30 px-6 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-secondary text-2xl shadow-sm">
                {icon}
            </div>
            <div>
                <p className="font-medium text-text-primary">{title}</p>
                <p className="mt-1 max-w-xs text-sm text-text-muted">{description}</p>
            </div>
            {actionLabel && actionHref && (
                <Link href={actionHref} className="btn btn-secondary btn-sm">
                    {actionLabel}
                </Link>
            )}
            {actionLabel && onAction && !actionHref && (
                <button type="button" onClick={onAction} className="btn btn-secondary btn-sm">
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

export function PartyDetailClient({
    party,
    memberCount,
    members,
    questions,
    qaMetrics,
    currentUserId,
    isMember,
    activeMembershipPartyId,
    memberSince,
    votedFor,
    voteExpiresAt,
    currentParentParty,
    childGroups,
    competingGroups,
    isGoverning,
    currentUserIsSubgroupLeader,
    currentUserNomination,
    currentAlliance,
    canEditPartyIcon,
}: PartyDetailClientProps) {
    const [statusMessage, setStatusMessage] = useState<{ tone: StatusTone; text: string } | null>(null);
    const [showVoteOptions, setShowVoteOptions] = useState(false);
    const [voteLoadingFor, setVoteLoadingFor] = useState<string | null>(null);
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [questionDraft, setQuestionDraft] = useState('');
    const [questionLoading, setQuestionLoading] = useState(false);
    const [nominationLoading, setNominationLoading] = useState(false);
    const [isNominated, setIsNominated] = useState(currentUserNomination.nominated);
    const [showTitleImageModal, setShowTitleImageModal] = useState(false);
    const [showIconPreviewModal, setShowIconPreviewModal] = useState(false);
    const [showIconEditorModal, setShowIconEditorModal] = useState(false);
    const [iconSvgDraft, setIconSvgDraft] = useState((party.icon_svg || '').trim());
    const [iconImageUrlDraft, setIconImageUrlDraft] = useState((party.icon_image_url || '').trim());
    const [iconImageUploading, setIconImageUploading] = useState(false);
    const [savingIcon, setSavingIcon] = useState(false);
    const [partyIconSvg, setPartyIconSvg] = useState<string | null>(party.icon_svg || null);
    const [partyIconImageUrl, setPartyIconImageUrl] = useState<string | null>(party.icon_image_url || null);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [stickyHeaderVisible, setStickyHeaderVisible] = useState(false);

    const heroRef = useRef<HTMLHeadingElement>(null);

    const router = useRouter();
    const supabase = createClient();

    const singleMembershipHint = 'You can be part of only one group at a time. You can still like parties to show interest.';
    const showStatusMessage = (tone: StatusTone, text: string) => {
        setStatusMessage({ tone, text });
    };

    const {
        joinLoading,
        optimisticIsMember,
        hasMembershipElsewhere,
        joinDisabled,
        showAuthModal,
        setShowAuthModal,
        handleJoin,
    } = usePartyMembership({
        partyId: party.id,
        currentUserId,
        isMember,
        activeMembershipPartyId,
        memberSince,
        singleMembershipHint,
        onStatusMessage: showStatusMessage,
    });

    // Sticky header via IntersectionObserver on the hero h1
    useEffect(() => {
        const el = heroRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setStickyHeaderVisible(!entry.isIntersecting),
            { threshold: 0 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const leader = useMemo(() => members.find((member) => member.is_leader) || null, [members]);

    // Group child groups into competing clusters (same location) and standalone groups
    type ChildGroup = (typeof childGroups)[number];
    type GroupCluster = { key: string; groups: ChildGroup[]; winnerId: string | null };
    const { clusters, standaloneGroups } = useMemo(() => {
        const locationKey = (g: ChildGroup) =>
            `${g.location_scope || ''}|${g.state_name || ''}|${g.district_name || ''}|${g.block_name || ''}|${g.panchayat_name || ''}|${g.village_name || ''}`;

        const buckets = new Map<string, ChildGroup[]>();
        for (const g of childGroups) {
            const k = locationKey(g);
            const bucket = buckets.get(k) || [];
            bucket.push(g);
            buckets.set(k, bucket);
        }

        const clusters: GroupCluster[] = [];
        const standaloneGroups: ChildGroup[] = [];

        for (const [key, groups] of buckets) {
            if (groups.length >= 2) {
                const sorted = [...groups].sort((a, b) => b.memberCount - a.memberCount);
                let winnerId: string | null = null;
                if (sorted[0].memberCount > 0 && sorted[0].memberCount !== sorted[1].memberCount) {
                    winnerId = sorted[0].id;
                }
                clusters.push({ key, groups: sorted, winnerId });
            } else {
                standaloneGroups.push(groups[0]);
            }
        }

        return { clusters, standaloneGroups };
    }, [childGroups]);

    const trustedMember = useMemo(() => {
        if (!votedFor) return null;
        return members.find((member) => member.user_id === votedFor) || null;
    }, [members, votedFor]);

    const candidateMembers = useMemo(() => {
        return [...members]
            .sort((a, b) => b.trust_votes - a.trust_votes)
            .slice(0, 8);
    }, [members]);

    const answeredQuestions = Math.max(qaMetrics.total_questions - qaMetrics.unanswered_questions, 0);
    const responseRate = qaMetrics.total_questions > 0
        ? Math.round((answeredQuestions / qaMetrics.total_questions) * 100)
        : 0;

    const voteExpiresInDays = formatDaysUntil(voteExpiresAt);
    const locationScope = getLocationScopeConfig(party.location_scope || 'district');
    const shareUrl = buildPartyShareUrl(party.id);
    const createChildGroupHref = createPartyUrl({
        issue: party.issue_text,
        parent: party.id,
        category: party.category_id || null,
        location_scope: party.location_scope || null,
        location_label: party.location_label || null,
        state_name: party.state_name || null,
        district_name: party.district_name || null,
        block_name: party.block_name || null,
        panchayat_name: party.panchayat_name || null,
        village_name: party.village_name || null,
    });
    const createChildGroupLabel = getCreateChildGroupLabel(party.location_scope || null);
    const createForkHref = createPartyUrl({
        parent: currentParentParty?.id || null,
        fork_of: party.id,
        category: party.category_id || null,
        location_scope: party.location_scope || null,
        location_label: party.location_label || null,
        state_name: party.state_name || null,
        district_name: party.district_name || null,
        block_name: party.block_name || null,
        panchayat_name: party.panchayat_name || null,
        village_name: party.village_name || null,
    });

    const handleRefresh = () => {
        router.refresh();
    };

    const iconPromptText = `Create a clean, simple square SVG logo for this civic group name: "${party.issue_text}".
Rules:
- Output only raw <svg>...</svg> code.
- No scripts, no external images/fonts, no foreignObject.
- Keep it minimal and readable at small sizes (24px/32px).
- Use warm neutral colors and high contrast text/symbol.
- Keep file small (under 20KB).`;

    const handleSavePartyIcon = async () => {
        if (!canEditPartyIcon) return;

        setSavingIcon(true);
        try {
            const response = await fetch(`/api/parties/${party.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    icon_svg: iconSvgDraft.trim() || null,
                    icon_image_url: iconImageUrlDraft.trim() || null,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Could not save group icon');
            }

            const nextIcon = payload?.icon_svg ?? null;
            const nextIconImageUrl = payload?.icon_image_url ?? null;
            setPartyIconSvg(nextIcon);
            setPartyIconImageUrl(nextIconImageUrl);
            setIconSvgDraft(nextIcon || '');
            setIconImageUrlDraft(nextIconImageUrl || '');
            setShowIconEditorModal(false);
            showStatusMessage('success', nextIcon ? 'Group icon updated.' : 'Group icon reset to default.');
            handleRefresh();
        } catch (err) {
            showStatusMessage('error', err instanceof Error ? err.message : 'Could not save group icon');
        } finally {
            setSavingIcon(false);
        }
    };

    const handleUploadIconImage = async (file: File | null) => {
        if (!file) return;
        setIconImageUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/uploads/party-icon-image', {
                method: 'POST',
                body: formData,
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Could not upload icon image');
            }

            const uploadedUrl = typeof payload?.url === 'string' ? payload.url : '';
            setIconImageUrlDraft(uploadedUrl);
            showStatusMessage('success', 'Icon image uploaded. Save to apply.');
        } catch (err) {
            showStatusMessage('error', err instanceof Error ? err.message : 'Could not upload icon image');
        } finally {
            setIconImageUploading(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: party.issue_text,
                    text: `Join this issue group: ${party.issue_text}`,
                    url: shareUrl,
                });
                await trackShareEvent({ platform: 'copy', partyId: party.id, source: 'party_detail_hero' });
                return;
            } catch {
                // Fall back to clipboard.
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            await trackShareEvent({ platform: 'copy', partyId: party.id, source: 'party_detail_hero' });
            showStatusMessage('success', 'Link copied.');
        } catch {
            showStatusMessage('error', 'Could not copy link.');
        }
    };

    const handleVoteChange = async (toUserId: string) => {
        if (!currentUserId) {
            setShowAuthModal(true);
            return;
        }

        if (!optimisticIsMember) {
            showStatusMessage('info', 'Join this group first to choose a representative.');
            return;
        }

        setVoteLoadingFor(toUserId);
        try {
            await supabase
                .from('trust_votes')
                .delete()
                .eq('party_id', party.id)
                .eq('from_user_id', currentUserId);

            const { error: insertError } = await supabase
                .from('trust_votes')
                .insert({
                    party_id: party.id,
                    from_user_id: currentUserId,
                    to_user_id: toUserId,
                });

            if (insertError) throw insertError;

            setShowVoteOptions(false);
            showStatusMessage('success', 'Your trust vote was updated.');
            handleRefresh();
        } catch {
            showStatusMessage('error', 'Could not update your vote. Please try again.');
        } finally {
            setVoteLoadingFor(null);
        }
    };

    const handleAskQuestion = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const questionText = questionDraft.trim();
        if (!questionText) return;

        if (!currentUserId) {
            setShowAuthModal(true);
            return;
        }

        if (!optimisticIsMember) {
            showStatusMessage('info', 'Join this group first to ask a public question.');
            return;
        }

        setQuestionLoading(true);
        try {
            const { error } = await supabase
                .from('questions')
                .insert({
                    party_id: party.id,
                    asked_by: currentUserId,
                    question_text: questionText,
                });

            if (error) throw error;

            setQuestionDraft('');
            setShowQuestionForm(false);
            showStatusMessage('success', 'Question posted publicly.');
            handleRefresh();
        } catch {
            showStatusMessage('error', 'Could not post your question. Please try again.');
        } finally {
            setQuestionLoading(false);
        }
    };

    useEffect(() => {
        if (!showIconEditorModal) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [showIconEditorModal]);

    // Build competing groups data including self
    const allCompetingGroupsData = useMemo(() => {
        if (competingGroups.length === 0) return null;
        const all = [
            { id: party.id, issue_text: party.issue_text, icon_svg: partyIconSvg, icon_image_url: partyIconImageUrl, memberCount },
            ...competingGroups,
        ].sort((a, b) => b.memberCount - a.memberCount);
        const topCount = all[0].memberCount;
        const winnerId = topCount > 0 && all.filter(g => g.memberCount === topCount).length === 1 ? all[0].id : null;
        return { all, winnerId };
    }, [competingGroups, party.id, party.issue_text, partyIconSvg, partyIconImageUrl, memberCount]);

    return (
        <div className="container mx-auto max-w-3xl px-5 py-8 sm:py-12" style={PARTY_DETAIL_ACCENT_STYLE}>
            {/* ── Sticky mini-header (appears on scroll) ─────────────────── */}
            <div
                className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${stickyHeaderVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-full pointer-events-none'}`}
            >
                <div className="border-b border-border-primary bg-bg-primary/90 backdrop-blur-md shadow-sm">
                    <div className="container mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                            <GroupIconBadge
                                name={party.issue_text}
                                iconSvg={partyIconSvg}
                                iconImageUrl={partyIconImageUrl}
                                size={28}
                            />
                            <span className="truncate text-sm font-semibold text-text-primary">
                                {party.issue_text}
                            </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button type="button" onClick={handleShare} className="btn btn-secondary btn-sm">
                                Share
                            </button>
                            {!optimisticIsMember ? (
                                <button
                                    type="button"
                                    onClick={handleJoin}
                                    disabled={joinDisabled || joinLoading}
                                    className="btn btn-primary btn-sm"
                                >
                                    {joinLoading ? 'Joining…' : 'Join'}
                                </button>
                            ) : (
                                <span className="inline-flex items-center rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                    ✓ Joined
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Status message toast ────────────────────────────────────── */}
            {statusMessage && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`mb-6 rounded-lg px-3 py-2 text-sm animate-fade-in ${statusMessage.tone === 'error'
                        ? 'bg-warning/10 text-warning'
                        : statusMessage.tone === 'success'
                            ? 'bg-success/10 text-success'
                            : 'bg-primary/10 text-text-secondary'
                        }`}
                >
                    {statusMessage.text}
                </div>
            )}

            {/* ── Hero section ─────────────────────────────────────────────── */}
            <section className="pb-6">
                <div className="mb-4 flex justify-end">
                    <button type="button" onClick={handleShare} className="btn btn-secondary btn-sm">
                        Share
                    </button>
                </div>

                {/* Title image or decorative gradient banner */}
                {party.title_image_url ? (
                    <div className="mb-4 overflow-hidden rounded-xl border border-border-primary bg-bg-tertiary">
                        <button
                            type="button"
                            onClick={() => setShowTitleImageModal(true)}
                            className="block cursor-zoom-in"
                            aria-label="Open full title image"
                        >
                            <Image
                                src={party.title_image_url}
                                alt={`${party.issue_text} title image`}
                                className="h-[256px] w-[768px] object-cover"
                                width={1536}
                                height={1024}
                                loading="lazy"
                            />
                        </button>
                    </div>
                ) : (
                    <div className="mb-4 h-20 rounded-xl bg-gradient-to-br from-primary/10 via-bg-secondary to-bg-tertiary" aria-hidden="true" />
                )}

                {/* Location breadcrumb */}
                <p className="text-sm text-text-muted mb-3">
                    {locationScope.label} · {getPartyLocationLabel(party)}
                </p>

                {/* Group name + icon */}
                <div className="flex items-center gap-3">
                    <GroupIconBadge
                        name={party.issue_text}
                        iconSvg={partyIconSvg}
                        iconImageUrl={partyIconImageUrl}
                        size={40}
                        clickable={canEditPartyIcon}
                        clickLabel="View full group icon"
                        onClick={() => canEditPartyIcon && setShowIconPreviewModal(true)}
                        ring={true}
                    />
                    <h1
                        ref={heroRef}
                        className="text-3xl sm:text-4xl font-semibold leading-tight text-text-primary"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        {party.issue_text}
                    </h1>
                    {canEditPartyIcon && (
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowIconEditorModal(true)}
                        >
                            Edit icon
                        </button>
                    )}
                </div>

                {/* Alliance link */}
                {currentAlliance && (
                    <div className="mt-2">
                        <Link
                            href={`/alliance/${currentAlliance.id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline hover:text-primary-dark transition-colors"
                        >
                            🤝 Member of <strong>{currentAlliance.name}</strong> Alliance
                        </Link>
                    </div>
                )}

                {/* Governing badge */}
                {isGoverning && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-600 uppercase tracking-wider">
                        🏛️ Governing Coalition
                    </div>
                )}

                {/* Stats row */}
                <div className="mt-5 space-y-1 text-sm text-text-secondary">
                    <p>{memberCount.toLocaleString('en-IN')} {memberCount === 1 ? 'member' : 'members'}</p>
                    <p>{leader ? `Representative: ${leader.display_name || 'Anonymous'}` : 'Representative: Not chosen yet'}</p>
                </div>

                {/* Primary CTA */}
                <div className="mt-7">
                    {!optimisticIsMember ? (
                        <button
                            type="button"
                            onClick={handleJoin}
                            disabled={joinDisabled || joinLoading}
                            className="btn btn-primary"
                        >
                            {joinLoading ? 'Joining...' : 'Join Group'}
                        </button>
                    ) : (
                        <div className="inline-flex items-center rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                            ✓ Joined
                            {memberSince && (
                                <span className="ml-2 text-text-muted">
                                    since {new Date(memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                </span>
                            )}
                        </div>
                    )}
                    {hasMembershipElsewhere && !optimisticIsMember && (
                        <p className="mt-2 text-xs text-text-muted">{singleMembershipHint}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={createChildGroupHref} className="btn btn-secondary btn-sm">
                            {createChildGroupLabel}
                        </Link>
                        {createForkHref && (
                            <Link href={createForkHref} className="btn btn-secondary btn-sm">
                                Fork this group
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Sticky tab bar ────────────────────────────────────────────── */}
            <PartySectionTabs
                tabs={TABS}
                activeTab={activeTab}
                onTabClick={setActiveTab}
                className="mb-8"
            />

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* TAB: Overview & Representation                                  */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <section
                    id="party-section-overview"
                    role="tabpanel"
                    aria-labelledby="party-tab-overview"
                    className="animate-fade-in space-y-10"
                >
                    {/* Representation */}
                    <div className="border-t border-border-primary/40 pt-8">
                        <h2 className="text-xl font-semibold text-text-primary">Representation</h2>
                        {!optimisticIsMember ? (
                            <div className="mt-4">
                                <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
                                    Members choose who speaks for this group. Trust expires automatically and can be changed anytime.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleJoin}
                                    disabled={joinDisabled || joinLoading}
                                    className="btn btn-primary mt-5"
                                >
                                    {joinLoading ? 'Joining...' : 'Join to choose representative'}
                                </button>
                            </div>
                        ) : (
                            <div className="mt-4">
                                <p className="text-sm text-text-secondary">
                                    You trust: <strong>{trustedMember?.display_name || 'No one yet'}</strong>
                                </p>
                                <p className="mt-1 text-sm text-text-secondary">
                                    Expires in: {voteExpiresInDays === null ? 'Not set' : `${voteExpiresInDays} day${voteExpiresInDays === 1 ? '' : 's'}`}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowVoteOptions((previous) => !previous)}
                                    className="btn btn-secondary mt-5"
                                >
                                    {showVoteOptions ? 'Hide options' : 'Change vote'}
                                </button>

                                {showVoteOptions && (
                                    <ul className="mt-4 space-y-2">
                                        {candidateMembers.map((member) => (
                                            <li key={member.user_id} className="flex items-center justify-between gap-3 rounded-lg border border-border-primary bg-bg-card px-3 py-2 text-sm transition-colors hover:bg-bg-hover">
                                                <span className="text-text-primary">
                                                    {member.display_name || 'Anonymous'}
                                                    <span className="ml-2 text-text-muted">({member.trust_votes})</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleVoteChange(member.user_id)}
                                                    disabled={voteLoadingFor !== null}
                                                    className={`btn btn-sm ${member.user_id === votedFor ? 'btn-secondary' : 'btn-primary'}`}
                                                >
                                                    {voteLoadingFor === member.user_id ? 'Saving...' : member.user_id === votedFor ? '✓ Current' : 'Trust'}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* Sub-group leader nomination */}
                        {currentUserIsSubgroupLeader && (
                            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                                <div className="font-medium text-text-primary mb-1">
                                    🏛️ Sub-group Leader Nomination
                                </div>
                                <p className="text-sm text-text-secondary mb-3">
                                    As a sub-group leader, you can nominate yourself as a candidate for this group&apos;s leadership.
                                </p>
                                {isNominated ? (
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-success font-medium">✓ You are nominated</span>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setNominationLoading(true);
                                                try {
                                                    await fetch(`/api/parties/${party.id}/nominate`, { method: 'DELETE' });
                                                    setIsNominated(false);
                                                    showStatusMessage('info', 'Nomination withdrawn.');
                                                    handleRefresh();
                                                } catch {
                                                    showStatusMessage('error', 'Could not withdraw nomination.');
                                                } finally {
                                                    setNominationLoading(false);
                                                }
                                            }}
                                            disabled={nominationLoading}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            {nominationLoading ? '...' : 'Withdraw'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setNominationLoading(true);
                                            try {
                                                const res = await fetch(`/api/parties/${party.id}/nominate`, { method: 'POST' });
                                                if (!res.ok) {
                                                    const data = await res.json();
                                                    throw new Error(data.error || 'Failed');
                                                }
                                                setIsNominated(true);
                                                showStatusMessage('success', 'You are now nominated as a candidate!');
                                                handleRefresh();
                                            } catch (err) {
                                                showStatusMessage('error', err instanceof Error ? err.message : 'Could not nominate.');
                                            } finally {
                                                setNominationLoading(false);
                                            }
                                        }}
                                        disabled={nominationLoading}
                                        className="btn btn-primary btn-sm"
                                    >
                                        {nominationLoading ? 'Nominating...' : '✋ Nominate Yourself'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* TAB: Group Structure                                            */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {activeTab === 'structure' && (
                <section
                    id="party-section-structure"
                    role="tabpanel"
                    aria-labelledby="party-tab-structure"
                    className="animate-fade-in space-y-8 border-t border-border-primary/40 pt-8"
                >
                    <h2 className="text-xl font-semibold text-text-primary">Group Structure</h2>

                    {/* Parent group */}
                    <div>
                        <p className="text-sm text-text-muted mb-3">Parent group</p>
                        {currentParentParty ? (
                            <Link
                                href={`/party/${currentParentParty.id}`}
                                className="inline-flex items-center gap-2 rounded-lg border border-border-primary bg-bg-card px-3 py-2 text-sm font-medium text-text-primary hover:border-primary/40 hover:text-primary transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <GroupIconBadge
                                    name={currentParentParty.issue_text}
                                    iconSvg={currentParentParty.icon_svg}
                                    iconImageUrl={currentParentParty.icon_image_url}
                                />
                                <span>{currentParentParty.issue_text}</span>
                            </Link>
                        ) : (
                            <EmptyStateCard
                                icon="🌐"
                                title="Top-level group"
                                description="This is a root group with no parent. It represents the broadest scope."
                            />
                        )}
                    </div>

                    {/* Sub-groups */}
                    <div>
                        <p className="text-sm text-text-muted mb-3">Sub-groups</p>
                        {childGroups.length > 0 ? (
                            <div className="space-y-4">
                                {/* Competing fork clusters as mini-card grids */}
                                {clusters.map((cluster) => (
                                    <div key={cluster.key}>
                                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Competing forks at same location</p>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                            {cluster.groups.map((g) => (
                                                <GroupMiniCard
                                                    key={g.id}
                                                    group={g}
                                                    isWinner={g.id === cluster.winnerId}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Standalone sub-groups as mini-card grid */}
                                {standaloneGroups.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        {standaloneGroups.map((g) => (
                                            <GroupMiniCard
                                                key={g.id}
                                                group={g}
                                                isWinner={false}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <EmptyStateCard
                                icon="🌿"
                                title="No sub-groups yet"
                                description="Create a local chapter to narrow the focus and grow this group's reach."
                                actionLabel={createChildGroupLabel}
                                actionHref={createChildGroupHref}
                            />
                        )}
                    </div>

                    {/* Category competition */}
                    {allCompetingGroupsData && (
                        <div>
                            <p className="text-sm text-text-muted mb-3">Category competition</p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {allCompetingGroupsData.all.map((g) => (
                                    <GroupMiniCard
                                        key={g.id}
                                        group={g}
                                        isWinner={g.id === allCompetingGroupsData.winnerId}
                                        isSelf={g.id === party.id}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Hierarchy tree */}
                    {(currentParentParty || childGroups.length > 0) && (
                        <div>
                            <p className="text-sm text-text-muted mb-3">Full hierarchy</p>
                            <div id="party-hierarchy" className="scroll-mt-24">
                                <PartyHierarchyTree partyId={party.id} />
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* TAB: Q&A                                                        */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {activeTab === 'qa' && (
                <section
                    id="party-section-qa"
                    role="tabpanel"
                    aria-labelledby="party-tab-qa"
                    className="animate-fade-in space-y-6 border-t border-border-primary/40 pt-8"
                >
                    <h2 className="text-xl font-semibold text-text-primary">Public Questions</h2>

                    {/* Visualized Q&A metrics */}
                    <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border-primary bg-bg-card p-5 shadow-sm">
                        <ResponseRing percent={responseRate} />
                        <div className="flex flex-wrap gap-3">
                            <StatTile value={qaMetrics.total_questions} label="Total questions" />
                            <StatTile
                                value={qaMetrics.unanswered_questions}
                                label="Awaiting answer"
                                colorClass={qaMetrics.unanswered_questions > 0 ? 'text-warning' : 'text-text-primary'}
                            />
                        </div>
                    </div>

                    {/* Q&A actions */}
                    {!optimisticIsMember ? (
                        <EmptyStateCard
                            icon="💬"
                            title="Members can ask questions"
                            description="Join this group to ask public questions and hold the representative accountable."
                            actionLabel={joinLoading ? 'Joining...' : 'Join to ask'}
                            onAction={handleJoin}
                        />
                    ) : (
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowQuestionForm((previous) => !previous)}
                                className="btn btn-primary"
                            >
                                {showQuestionForm ? 'Cancel' : 'Ask Question'}
                            </button>

                            {showQuestionForm && (
                                <form onSubmit={handleAskQuestion} className="mt-4 max-w-2xl animate-fade-in">
                                    <textarea
                                        className="input min-h-[110px]"
                                        value={questionDraft}
                                        onChange={(event) => setQuestionDraft(event.target.value)}
                                        placeholder="Ask a public question…"
                                    />
                                    <div className="mt-3 flex items-center gap-3">
                                        <button
                                            type="submit"
                                            disabled={questionLoading || !questionDraft.trim()}
                                            className="btn btn-primary btn-sm"
                                        >
                                            {questionLoading ? 'Posting...' : 'Post question'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowQuestionForm(false)}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {questions.length > 0 && (
                        <p className="text-xs text-text-muted">
                            Questions are public and visible to everyone.
                        </p>
                    )}

                    {questions.length === 0 && optimisticIsMember && (
                        <EmptyStateCard
                            icon="🗣️"
                            title="No questions yet"
                            description="Be the first to ask a public question. Good questions drive accountability."
                        />
                    )}
                </section>
            )}

            {/* ── Auth modal ───────────────────────────────────────────────── */}
            {showAuthModal && (
                <AuthModal
                    partyId={party.id}
                    onCancel={() => setShowAuthModal(false)}
                />
            )}

            {/* ── Title image full-screen modal ────────────────────────────── */}
            {showTitleImageModal && party.title_image_url && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 bg-black/90 p-4 sm:p-6"
                    onClick={() => setShowTitleImageModal(false)}
                >
                    <button
                        type="button"
                        aria-label="Close full image"
                        className="absolute right-4 top-4 rounded bg-black/70 px-3 py-1 text-white"
                        onClick={() => setShowTitleImageModal(false)}
                    >
                        ✕
                    </button>
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="animate-scale-in">
                            <Image
                                src={party.title_image_url}
                                alt={`${party.issue_text} full title image`}
                                width={1536}
                                height={1024}
                                className="max-h-full max-w-full object-contain"
                                onClick={(event) => event.stopPropagation()}
                                priority
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Icon preview modal ───────────────────────────────────────── */}
            {showIconPreviewModal && canEditPartyIcon && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 bg-black/90 p-4 sm:p-6"
                    onClick={() => setShowIconPreviewModal(false)}
                >
                    <button
                        type="button"
                        aria-label="Close full icon"
                        className="absolute right-4 top-4 rounded bg-black/70 px-3 py-1 text-white"
                        onClick={() => setShowIconPreviewModal(false)}
                    >
                        ✕
                    </button>
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="animate-scale-in">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={getGroupIconSrc(party.issue_text, partyIconSvg, partyIconImageUrl)}
                                alt={`${party.issue_text} full icon`}
                                className="max-h-[80vh] max-w-[80vw] rounded-xl border border-white/20 bg-white object-contain"
                                onClick={(event) => event.stopPropagation()}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Icon editor modal ────────────────────────────────────────── */}
            {showIconEditorModal && canEditPartyIcon && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/70 p-4 sm:p-6"
                    onClick={() => setShowIconEditorModal(false)}
                >
                    <div
                        className="animate-scale-in mx-auto my-8 w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto rounded-xl border border-border-primary bg-bg-primary p-4 sm:p-5"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold text-text-primary">Edit Group Icon</h3>
                                <p className="mt-1 text-sm text-text-secondary">
                                    Upload your own image, paste an image URL, or generate/paste SVG code.
                                </p>
                            </div>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowIconEditorModal(false)}>
                                Close
                            </button>
                        </div>

                        <div className="mt-4 rounded-lg border border-border-primary bg-bg-tertiary/40 p-3">
                            <p className="text-xs text-text-muted mb-2">Use your own icon image (preferred)</p>
                            <input
                                type="file"
                                accept="image/*"
                                className="input"
                                onChange={(event) => void handleUploadIconImage(event.target.files?.[0] || null)}
                                disabled={iconImageUploading || savingIcon}
                            />
                            <p className="text-xs text-text-muted mt-2">or paste image URL</p>
                            <input
                                type="url"
                                className="input mt-1"
                                value={iconImageUrlDraft}
                                onChange={(event) => setIconImageUrlDraft(event.target.value)}
                                placeholder="https://..."
                                disabled={savingIcon}
                            />
                        </div>

                        <div className="mt-4 rounded-lg border border-border-primary bg-bg-tertiary/40 p-3">
                            <p className="text-xs text-text-muted mb-2">Suggested prompt</p>
                            <pre className="whitespace-pre-wrap text-xs text-text-secondary">{iconPromptText}</pre>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm mt-3"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(iconPromptText);
                                        showStatusMessage('success', 'Prompt copied.');
                                    } catch {
                                        showStatusMessage('error', 'Could not copy prompt.');
                                    }
                                }}
                            >
                                Copy prompt
                            </button>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm text-text-secondary mb-2">Paste SVG code</label>
                            <textarea
                                className="input min-h-[180px] font-mono text-xs"
                                value={iconSvgDraft}
                                onChange={(event) => setIconSvgDraft(event.target.value)}
                                placeholder="<svg ...>...</svg>"
                            />
                            <p className="mt-2 text-xs text-text-muted">SVG is used as fallback if image URL is empty.</p>
                        </div>

                        <div className="mt-4">
                            <p className="text-xs text-text-muted mb-2">Preview</p>
                            <div className="rounded-lg border border-border-primary bg-bg-tertiary/40 p-3 inline-flex items-center gap-3">
                                <GroupIconBadge
                                    name={party.issue_text}
                                    iconSvg={iconSvgDraft.trim() || null}
                                    iconImageUrl={iconImageUrlDraft.trim() || null}
                                    size={48}
                                />
                                <span className="text-sm text-text-secondary">{party.issue_text}</span>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                disabled={savingIcon}
                                onClick={() => {
                                    setIconSvgDraft('');
                                    setIconImageUrlDraft('');
                                }}
                            >
                                Reset to default icon
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={savingIcon}
                                onClick={handleSavePartyIcon}
                            >
                                {savingIcon ? 'Saving...' : 'Save icon'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Mobile sticky footer CTA ─────────────────────────────────── */}
            {!optimisticIsMember && (
                <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden animate-fade-in">
                    <div className="border-t border-border-primary bg-bg-primary/95 backdrop-blur-md px-5 py-3 shadow-lg">
                        <button
                            type="button"
                            onClick={handleJoin}
                            disabled={joinDisabled || joinLoading}
                            className="btn btn-primary w-full py-3 text-base"
                        >
                            {joinLoading ? 'Joining...' : 'Join Group'}
                        </button>
                        {hasMembershipElsewhere && (
                            <p className="mt-1.5 text-center text-xs text-text-muted">{singleMembershipHint}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
