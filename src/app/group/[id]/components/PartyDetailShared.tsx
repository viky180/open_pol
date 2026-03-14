'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export function getProgressTarget(totalBackers: number): number {
    if (totalBackers < 10) return 10;
    if (totalBackers < 50) return 50;
    if (totalBackers < 100) return 100;
    return totalBackers + 10;
}

export function getProgressHint(totalBackers: number): string {
    if (totalBackers < 10) return `${10 - totalBackers} members needed to reach the first milestone`;
    if (totalBackers < 50) return `${50 - totalBackers} more to reach 50 members`;
    if (totalBackers < 100) return `${100 - totalBackers} more to reach 100 members`;
    return '10 more to the next milestone';
}

export function formatCompactDate(value: string | null) {
    if (!value) return null;
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function InfoTooltip({
    content,
    label = 'More information',
    className,
}: {
    content: ReactNode;
    label?: string;
    align?: 'left' | 'right';
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; right: number } | null>(null);
    const tooltipId = useId();
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const wrapperRef = useRef<HTMLSpanElement | null>(null);
    const TOOLTIP_WIDTH = 288; // w-72

    const computeCoords = () => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        // Prefer right-aligned; flip left if it would overflow the viewport
        const rightEdge = rect.right;
        const leftEdge = rightEdge - TOOLTIP_WIDTH;
        const safeLeft = Math.max(8, leftEdge);
        const top = rect.bottom + 8; // 8px gap below button
        setCoords({ top, left: safeLeft, right: rightEdge });
    };

    const handleToggle = () => {
        if (!open) {
            computeCoords();
        }
        setOpen((current) => !current);
    };

    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        const handleScroll = () => setOpen(false);

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [open]);

    return (
        <span
            ref={wrapperRef}
            className={`relative inline-flex ${className ?? ''}`}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setOpen(false);
                }
            }}
        >
            <button
                ref={buttonRef}
                type="button"
                aria-label={label}
                aria-describedby={open ? tooltipId : undefined}
                aria-expanded={open}
                onClick={handleToggle}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border-primary bg-bg-card text-[11px] font-semibold text-text-muted transition hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
                i
            </button>
            {open && coords && (
                <span
                    id={tooltipId}
                    role="tooltip"
                    style={{
                        position: 'fixed',
                        top: coords.top,
                        left: coords.left,
                        width: TOOLTIP_WIDTH,
                        maxWidth: 'calc(100vw - 1rem)',
                        zIndex: 9999,
                    }}
                    className="rounded-xl border border-border-primary bg-bg-card px-3 py-2 text-left text-xs leading-5 text-text-secondary shadow-xl"
                >
                    {content}
                </span>
            )}
        </span>
    );
}

export function SectionHeader({
    icon,
    title,
    description,
    gradientClassName,
    glowClassName,
}: {
    icon: string;
    title: string;
    description: string;
    gradientClassName: string;
    glowClassName: string;
}) {
    const isEmoji = icon.length > 1;
    return (
        <div className={`relative overflow-hidden rounded-2xl p-6 border border-border-primary ${gradientClassName}`}>
            <div className={`absolute w-32 h-32 rounded-full blur-2xl ${glowClassName}`} />
            <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                    {isEmoji ? (
                        <span className="text-2xl" role="img" aria-hidden="true">{icon}</span>
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-lg">
                            {icon}
                        </div>
                    )}
                    <h2 className="text-xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
                </div>
                <p className="text-text-muted max-w-xl">{description}</p>
            </div>
        </div>
    );
}

export function JoinToParticipateCard({
    icon,
    title,
    description,
    actionLabel,
    actionDisabled,
    onAction,
    gradient,
}: {
    icon: string;
    title: string;
    description: string;
    actionLabel: string;
    actionDisabled: boolean;
    onAction?: () => void;
    gradient?: boolean;
}) {
    return (
        <div className={`text-center p-8 rounded-2xl border-2 border-dashed border-border-secondary ${gradient ? 'bg-gradient-to-br from-primary/5 to-bg-tertiary/50' : 'bg-bg-tertiary/50'}`}>
            <div className="text-5xl mb-4">{icon}</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
            <p className="text-text-muted mb-4 max-w-md mx-auto">{description}</p>
            <button
                type="button"
                onClick={onAction}
                disabled={actionDisabled}
                className="btn btn-primary"
            >
                {actionLabel}
            </button>
        </div>
    );
}

export function StatTile({ value, label, valueClassName, trend }: { value: string | number; label: string; valueClassName?: string; trend?: 'up' | 'down' | null }) {
    return (
        <div className="p-4 rounded-xl bg-bg-card border border-border-primary text-center">
            <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${valueClassName || 'text-text-primary'}`}>
                {value}
                {trend === 'up' && <span className="text-success text-lg">▲</span>}
                {trend === 'down' && <span className="text-danger text-lg">▼</span>}
            </div>
            <div className="text-xs text-text-muted mt-1">{label}</div>
        </div>
    );
}

/** Shared type for the primary action button used across sub-components */
export interface PrimaryAction {
    label: string;
    onClick?: () => void;
    disabled: boolean;
    className: string;
}

export function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    variant,
}: {
    icon: string;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    variant?: 'primary' | 'secondary';
}) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border-2 border-dashed border-border-secondary/50 bg-bg-tertiary/30">
            <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center text-3xl mb-4 shadow-sm">
                {icon}
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">{title}</h3>
            <p className="text-text-muted max-w-sm mx-auto mb-6">{description}</p>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className={`btn ${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
