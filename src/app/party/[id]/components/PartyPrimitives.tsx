'use client';

import { useState } from 'react';
import Link from 'next/link';

// ── Icon helpers ──────────────────────────────────────────────────────────────

export function formatDaysUntil(dateValue: string | null): number | null {
    if (!dateValue) return null;
    const expiresAtMs = new Date(dateValue).getTime();
    if (Number.isNaN(expiresAtMs)) return null;
    const diffMs = expiresAtMs - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(days, 0);
}

export function buildDefaultGroupIconSvg(name: string): string {
    const first = (name || 'G').trim().charAt(0).toUpperCase() || 'G';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${first}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f6e6da"/><stop offset="100%" stop-color="#ddb297"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#6b3a1f" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="30">${first}</text></svg>`;
}

export function svgToDataUri(svg: string): string {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getGroupIconSrc(
    name: string,
    iconSvg?: string | null,
    iconImageUrl?: string | null,
): string {
    return (
        iconImageUrl?.trim() ||
        (iconSvg ? svgToDataUri(iconSvg) : svgToDataUri(buildDefaultGroupIconSvg(name)))
    );
}

// ── GroupIconBadge ────────────────────────────────────────────────────────────

interface GroupIconBadgeProps {
    name: string;
    iconSvg?: string | null;
    iconImageUrl?: string | null;
    size?: number;
    clickable?: boolean;
    onClick?: () => void;
    clickLabel?: string;
    ring?: boolean;
}

export function GroupIconBadge({
    name,
    iconSvg,
    iconImageUrl,
    size = 24,
    clickable = false,
    onClick,
    clickLabel,
    ring = false,
}: GroupIconBadgeProps) {
    const [failed, setFailed] = useState(false);
    const resolvedImageSrc = !failed
        ? getGroupIconSrc(name, iconSvg, iconImageUrl)
        : svgToDataUri(buildDefaultGroupIconSvg(name));

    const badgeClassName = `inline-flex items-center justify-center overflow-hidden rounded-md border border-border-primary bg-bg-tertiary ${clickable ? 'hover:border-primary/40 cursor-pointer' : 'cursor-default'} ${ring ? 'ring-2 ring-primary/30 ring-offset-1' : ''}`;

    const badgeImage = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={resolvedImageSrc}
            alt=""
            aria-hidden="true"
            width={size}
            height={size}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
        />
    );

    if (!clickable) {
        return (
            <span
                className={badgeClassName}
                style={{ width: size, height: size }}
                aria-label={`${name} icon`}
            >
                {badgeImage}
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={badgeClassName}
            style={{ width: size, height: size }}
            aria-label={clickLabel || 'View group icon'}
        >
            {badgeImage}
        </button>
    );
}

// ── ResponseRing ──────────────────────────────────────────────────────────────

/** Circular SVG progress ring for response rate visualization */
export function ResponseRing({ percent }: { percent: number }) {
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

// ── StatTile ──────────────────────────────────────────────────────────────────

/** Mini stat tile for number-based metrics */
export function StatTileDetail({ value, label, colorClass }: { value: number | string; label: string; colorClass?: string }) {
    return (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-border-primary bg-bg-card px-4 py-3 text-center shadow-sm">
            <span className={`text-2xl font-bold ${colorClass ?? 'text-text-primary'}`}>{value}</span>
            <span className="text-[11px] uppercase tracking-wide text-text-muted">{label}</span>
        </div>
    );
}

// ── GroupMiniCard ─────────────────────────────────────────────────────────────

interface GroupMiniCardProps {
    group: {
        id: string;
        issue_text: string;
        icon_svg?: string | null;
        icon_image_url?: string | null;
        memberCount: number;
    };
    isWinner: boolean;
    isSelf?: boolean;
}

/** A single mini-card used in the competing groups grid */
export function GroupMiniCard({ group, isWinner, isSelf }: GroupMiniCardProps) {
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

// ── EmptyStateCard ────────────────────────────────────────────────────────────

interface EmptyStateCardProps {
    icon: string;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
}

/** Styled empty state with optional action CTA */
export function EmptyStateCard({ icon, title, description, actionLabel, actionHref, onAction }: EmptyStateCardProps) {
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
