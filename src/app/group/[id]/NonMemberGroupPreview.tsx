'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import type { Party, MemberWithVotes } from '@/types/database';
import { getLocationScopeConfig, getPartyLocationLabel } from '@/types/database';
import {
    buildPartyShareUrl,
    buildWhatsAppShareUrl,
    buildXShareUrl,
    trackShareEvent,
} from '@/lib/share';
import { LocationScopeIcon } from '@/lib/locationIcons';

interface NonMemberGroupPreviewProps {
    party: Party;
    memberCount: number;
    leader: MemberWithVotes | null;
    alliances: Array<{
        id: string;
        name: string | null;
        members: Array<{ party: Party }>;
    }>;
    questionsCount: number;
    unansweredCount: number;
}

export function NonMemberGroupPreview({
    party,
    memberCount,
    leader,
    alliances,
    questionsCount,
    unansweredCount,
}: NonMemberGroupPreviewProps) {
    const router = useRouter();
    const [showFederation, setShowFederation] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    const shareUrl = buildPartyShareUrl(party.id);
    const shareCtx = {
        url: shareUrl,
        title: party.issue_text,
        subtitle: getPartyLocationLabel(party),
    };
    const whatsappShareUrl = buildWhatsAppShareUrl(shareCtx);
    const xShareUrl = buildXShareUrl(shareCtx);

    const scopeConfig = getLocationScopeConfig(party.location_scope || 'district');

    const handleJoin = () => {
        const returnPath = `/group/${party.id}`;
        router.push(`/auth?returnTo=${encodeURIComponent(returnPath)}`);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            trackShareEvent({ platform: 'copy', partyId: party.id, source: 'non_member_preview' });
            setCopyFeedback('Link copied. Share it in your community!');
        } catch {
            setCopyFeedback('Could not copy link. Please try again.');
        }

        window.setTimeout(() => setCopyFeedback(null), 2500);
    };

    return (
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-2xl">
            {/* Back link */}
            <Link
                href="/discover"
                className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary mb-4"
            >
                ← Browse groups
            </Link>

            {/* Header Card */}
            <div className="card-glass animate-fade-in mb-6">
                {/* Group Name */}
                <h1 className="text-xl sm:text-2xl font-semibold leading-snug mb-3">
                    {party.issue_text}
                </h1>

                {/* Meta Row */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary mb-4">
                    <span className="badge flex items-center gap-1"><LocationScopeIcon iconName={scopeConfig.icon} className="w-3.5 h-3.5" /> {scopeConfig.label}</span>
                    <span className="text-text-muted flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {getPartyLocationLabel(party)}</span>
                    <span className="text-text-muted">
                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                </div>

                {/* Issue Summary (already shown as title, keeping it brief) */}
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 mb-2">
                    Join to choose who speaks for you and add your weight to this group&apos;s leverage.
                </p>
                <p className="text-xs text-text-muted mb-6">
                    You can leave anytime. Your choice expires automatically.
                </p>

                {/* Leader Section */}
                <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4 mb-6">
                    <div className="text-xs uppercase tracking-[0.2em] text-text-muted mb-2">
                        Current voice
                    </div>
                    {leader ? (
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-text-primary">
                                    {leader.display_name || 'Anonymous'}
                                </div>
                                <div className="text-sm text-text-muted">
                                    {leader.trust_votes} {leader.trust_votes === 1 ? 'choice' : 'choices'}
                                </div>
                            </div>
                            <Link
                                href={`/profile/${leader.user_id}`}
                                className="text-sm text-primary hover:underline"
                            >
                                View profile →
                            </Link>
                        </div>
                    ) : (
                        <div className="text-sm text-text-muted">
                            No voice yet. Join and choose to help one emerge.
                        </div>
                    )}
                </div>

                {/* Primary CTA */}
                <button
                    type="button"
                    onClick={handleJoin}
                    className="btn btn-primary w-full py-3 text-base mb-4"
                >
                    Join this group
                </button>

                {/* Share CTA (pre-join) */}
                <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4 mb-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-text-muted mb-1">Share</div>
                    <div className="text-sm text-text-secondary">
                        Not ready to join? Share this issue with your local WhatsApp groups or on X.
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <a
                            href={whatsappShareUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            onClick={() => trackShareEvent({ platform: 'whatsapp', partyId: party.id, source: 'non_member_preview' })}
                        >
                            Share on WhatsApp
                        </a>
                        <a
                            href={xShareUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            onClick={() => trackShareEvent({ platform: 'x', partyId: party.id, source: 'non_member_preview' })}
                        >
                            Share on X
                        </a>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleCopyLink}
                        >
                            Copy link
                        </button>
                    </div>
                    {copyFeedback && (
                        <p role="status" aria-live="polite" className="mt-2 text-xs text-text-muted">
                            {copyFeedback}
                        </p>
                    )}
                </div>

                {/* Secondary Actions */}
                <div className="flex flex-wrap gap-3 text-sm">
                    {questionsCount > 0 && (
                        <button
                            type="button"
                            onClick={handleJoin}
                            className="text-text-secondary hover:text-primary transition"
                        >
                            Preview {questionsCount} {questionsCount === 1 ? 'answer' : 'answers'}
                            {unansweredCount > 0 && (
                                <span className="text-text-muted ml-1">
                                    ({unansweredCount} unanswered)
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Federation Connections */}
            {alliances.length > 0 && (
                <div className="card mb-6">
                    <button
                        type="button"
                        onClick={() => setShowFederation(!showFederation)}
                        className="w-full flex items-center justify-between text-left"
                        aria-expanded={showFederation}
                        aria-controls="federation-panel"
                    >
                        <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                                Group connections
                            </div>
                            <div className="text-sm text-text-secondary mt-1">
                                {alliances.length > 0 && `${alliances.length} partnership${alliances.length > 1 ? 's' : ''}`}
                            </div>
                        </div>
                        <span className="text-text-muted text-lg">
                            {showFederation ? '−' : '+'}
                        </span>
                    </button>

                    {showFederation && (
                        <div id="federation-panel" className="mt-4 pt-4 border-t border-border-primary">
                            {alliances.length > 0 && (
                                <div className="mb-4">
                                    <div className="text-xs font-medium text-text-muted mb-2">Partnerships (alliances)</div>
                                    <div className="flex flex-col gap-2">
                                        {alliances.map(alliance => (
                                            <div
                                                key={alliance.id}
                                                className="text-sm text-text-secondary"
                                            >
                                                {alliance.name || 'Unnamed partnership'} ({alliance.members.length} groups)
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Information Footer */}
            <div className="text-center text-xs text-text-muted">
                <p>Membership is limited to one group at a time.</p>
                <p className="mt-1">You can leave anytime.</p>
            </div>
        </div>
    );
}
