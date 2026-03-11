"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    buildWhatsAppShareUrl,
    buildXShareUrl,
    getClientOrigin,
    trackShareEvent,
} from '@/lib/share';

export type FeedItemType =
    | 'question'
    | 'action_email'
    | 'milestone'
    | 'merge'
    | 'post'
    | 'new_member'
    | 'invitation_accepted'
    | 'trust_milestone'
    | 'new_party';

export interface FeedItemData {
    id: string;
    type: FeedItemType;
    sourceId: string;
    sourceName: string;
    sourceType: 'group' | 'federation';
    scope?: 'member' | 'location' | 'category' | 'global';
    title: string;
    preview: string;
    timestamp: string;
    isSupported?: boolean;
    linkUrl?: string;
}

interface FeedItemProps {
    item: FeedItemData;
    onSupportChange?: (id: string, supported: boolean) => void;
    currentUserId: string | null;
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getTypeLabel(type: FeedItemType): string {
    switch (type) {
        case 'question': return 'Question';
        case 'action_email': return 'Email Action';
        case 'milestone': return 'Milestone';
        case 'merge': return 'Merge';
        case 'post': return 'Post';
        case 'new_member': return 'New Member';
        case 'invitation_accepted': return 'Invite Accepted';
        case 'trust_milestone': return 'Backing Milestone';
        case 'new_party': return 'New Group';
        default: return 'Update';
    }
}

function getScopeLabel(scope?: FeedItemData['scope']): string | null {
    switch (scope) {
        case 'member': return 'Your group';
        case 'location': return 'Your area';
        case 'category': return 'Similar issues';
        case 'global': return 'Global';
        default: return null;
    }
}

function getBadgeStyles(type: FeedItemType): string {
    switch (type) {
        case 'question':
            return 'bg-primary/10 text-primary border-primary/20';
        case 'action_email':
            return 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]';
        case 'milestone':
        case 'trust_milestone':
            return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'merge':
            return 'bg-violet-50 text-violet-700 border-violet-200';
        case 'post':
            return 'bg-bg-tertiary text-text-secondary border-border-primary';
        case 'new_member':
            return 'bg-green-50 text-green-700 border-green-200';
        case 'invitation_accepted':
            return 'bg-teal-50 text-teal-700 border-teal-200';
        case 'new_party':
            return 'bg-blue-50 text-blue-700 border-blue-200';
        default:
            return 'bg-bg-tertiary text-text-secondary border-border-primary';
    }
}

export function FeedItem({ item, onSupportChange, currentUserId }: FeedItemProps) {
    const router = useRouter();
    const [supported, setSupported] = useState(item.isSupported ?? false);
    const [isToggling, setIsToggling] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);

    const typeLabel = getTypeLabel(item.type);
    const scopeLabel = getScopeLabel(item.scope);
    const badgeStyles = getBadgeStyles(item.type);

    const handleSupportToggle = async () => {
        if (!currentUserId || isToggling) return;

        setIsToggling(true);
        const newValue = !supported;
        setSupported(newValue);

        try {
            onSupportChange?.(item.id, newValue);
        } finally {
            setIsToggling(false);
        }
    };

    const content = (
        <div className="glass-panel transition-colors duration-200 hover:border-border-secondary">
            <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] sm:text-[10px] font-semibold uppercase tracking-wide border ${badgeStyles}`}>
                                {typeLabel}
                            </span>
                            <span className="text-xs text-text-muted font-medium">
                                {formatRelativeTime(item.timestamp)}
                            </span>
                        </div>

                        <h3 className="text-[15px] sm:text-lg font-semibold text-text-primary leading-[1.35] mb-1.5 line-clamp-2 sm:line-clamp-none">
                            {item.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-2 mb-2 min-w-0">
                            <span className="inline-flex max-w-full items-center text-xs text-text-secondary px-2 py-0.5 rounded-md bg-bg-tertiary border border-border-primary">
                                <span className="shrink-0 mr-1">{item.sourceType === 'federation' ? 'Network:' : 'Group:'}</span>
                                <span className="truncate">{item.sourceName}</span>
                            </span>
                            {scopeLabel && (
                                <span className="inline-flex max-w-[11rem] sm:max-w-full items-center text-xs text-text-secondary px-2 py-0.5 rounded-md bg-bg-tertiary border border-border-primary truncate">
                                    {scopeLabel}
                                </span>
                            )}
                        </div>

                        <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 sm:line-clamp-3">
                            {item.preview}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 sm:pt-1">
                        {currentUserId && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSupportToggle();
                                }}
                                disabled={isToggling}
                                aria-pressed={supported}
                                className={`
                                    flex items-center justify-center min-w-[96px] h-10 sm:h-8 rounded-md border text-sm sm:text-xs font-semibold transition-colors
                                    ${supported
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-bg-secondary text-text-secondary border-border-primary hover:text-text-primary hover:bg-bg-hover'
                                    }
                                `}
                                title={supported ? 'Remove support' : 'Support this'}
                            >
                                {supported ? 'Supported' : 'Support'}
                            </button>
                        )}
                    </div>
                </div>

                {item.linkUrl && (
                    <div className="mt-4 pt-3 border-t border-border-primary flex items-center justify-end">
                        <button
                            type="button"
                            className="btn btn-ghost h-10 sm:h-8 px-4 sm:px-3 rounded-md text-sm sm:text-xs"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShareOpen((prev) => !prev);
                            }}
                            aria-expanded={shareOpen}
                        >
                            Share
                        </button>
                    </div>
                )}

                {shareOpen && item.linkUrl && (
                    <div className="mt-3 pt-3 border-t border-border-primary">
                        {(() => {
                            const origin = getClientOrigin();
                            const absoluteUrl = origin ? `${origin}${item.linkUrl}` : item.linkUrl;
                            const ctx = { url: absoluteUrl, title: item.title };
                            const wa = buildWhatsAppShareUrl(ctx);
                            const x = buildXShareUrl(ctx);

                            return (
                                <div className="flex flex-wrap gap-2 justify-end">
                                    <a
                                        href={wa}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn h-10 sm:h-9 text-xs font-semibold bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-lg px-4"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            trackShareEvent({ platform: 'whatsapp', source: `feed_item:${item.type}` });
                                        }}
                                    >
                                        WhatsApp
                                    </a>
                                    <a
                                        href={x}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn h-10 sm:h-9 text-xs font-semibold bg-black/5 text-black hover:bg-black/10 border border-black/10 rounded-lg px-4"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            trackShareEvent({ platform: 'x', source: `feed_item:${item.type}` });
                                        }}
                                    >
                                        X
                                    </a>
                                    <button
                                        type="button"
                                        className="btn h-10 sm:h-9 text-xs font-semibold bg-bg-secondary text-text-secondary border border-border-secondary hover:bg-bg-hover rounded-md px-4"
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            try {
                                                await navigator.clipboard.writeText(absoluteUrl);
                                                trackShareEvent({ platform: 'copy', source: `feed_item:${item.type}` });
                                            } catch {
                                                // ignore clipboard failures
                                            }
                                        }}
                                    >
                                        Copy link
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );

    if (item.linkUrl) {
        return (
            <div
                role="link"
                tabIndex={0}
                className="block cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-primary/20 rounded-xl transition-transform active:scale-[0.99]"
                onClick={() => router.push(item.linkUrl!)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(item.linkUrl!);
                    }
                }}
            >
                {content}
            </div>
        );
    }

    return content;
}
