'use client';

export function getProgressTarget(totalBackers: number): number {
    if (totalBackers < 10) return 10;
    if (totalBackers < 50) return 50;
    if (totalBackers < 100) return 100;
    return totalBackers + 10;
}

export function getProgressHint(totalBackers: number): string {
    if (totalBackers < 10) return `${10 - totalBackers} more to reach 10`;
    if (totalBackers < 50) return `${50 - totalBackers} more to reach 50`;
    if (totalBackers < 100) return `${100 - totalBackers} more to reach 100`;
    return 'Growing strong!';
}

export function formatCompactDate(value: string | null) {
    if (!value) return null;
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
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
    return (
        <div className={`relative overflow-hidden rounded-2xl p-6 border border-border-primary ${gradientClassName}`}>
            <div className={`absolute w-32 h-32 rounded-full blur-2xl ${glowClassName}`} />
            <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-lg">
                        {icon}
                    </div>
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
}: {
    icon: string;
    title: string;
    description: string;
    actionLabel: string;
    actionDisabled: boolean;
    onAction?: () => void;
}) {
    return (
        <div className="text-center p-8 rounded-2xl border-2 border-dashed border-border-secondary bg-bg-tertiary/50">
            <div className="text-4xl mb-4">{icon}</div>
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

export function StatTile({ value, label, valueClassName }: { value: string | number; label: string; valueClassName?: string }) {
    return (
        <div className="p-4 rounded-xl bg-bg-card border border-border-primary text-center">
            <div className={`text-2xl font-bold ${valueClassName || 'text-text-primary'}`}>{value}</div>
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
}: {
    icon: string;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
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
                    className="btn btn-secondary btn-sm"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
