'use client';

type StepStatus = 'upcoming' | 'current' | 'completed';

interface StepItem {
    id: string;
    label: string;
    status: StepStatus;
}

interface OnboardingStepIndicatorProps {
    title?: string;
    metaLabel?: string;
    steps: StepItem[];
    className?: string;
}

function getStepClasses(status: StepStatus): string {
    if (status === 'current') {
        return 'border-primary bg-primary/10 text-text-primary shadow-sm';
    }

    if (status === 'completed') {
        return 'border-primary/30 bg-primary/5 text-primary';
    }

    return 'border-border-primary bg-bg-secondary text-text-muted';
}

export function OnboardingStepIndicator({
    title,
    metaLabel,
    steps,
    className = '',
}: OnboardingStepIndicatorProps) {
    return (
        <div className={`rounded-xl border border-border-primary bg-bg-tertiary/60 p-4 ${className}`.trim()}>
            {(title || metaLabel) && (
                <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.14em] text-text-muted">
                    <span>{title}</span>
                    <span>{metaLabel}</span>
                </div>
            )}

            <ol className="mt-3 flex flex-wrap gap-2" aria-label={title || 'Progress'}>
                {steps.map((step, index) => {
                    const badge = step.status === 'completed' ? 'OK' : String(index + 1).padStart(2, '0');

                    return (
                        <li
                            key={step.id}
                            className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${getStepClasses(step.status)}`}
                            aria-current={step.status === 'current' ? 'step' : undefined}
                        >
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/70 text-[10px] font-semibold tracking-[0.12em]">
                                {badge}
                            </span>
                            <span className="truncate">{step.label}</span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
