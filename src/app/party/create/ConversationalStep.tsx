'use client';

import { useEffect, useRef } from 'react';
import type { StepId } from './useConversationalSteps';

interface ConversationalStepProps {
    id: StepId;
    emoji: string;
    question: string;
    summaryText?: string;
    isVisible: boolean;
    isCompleted: boolean;
    isEditing: boolean;
    isCurrent: boolean;
    canAdvance: boolean;
    onContinue: () => void;
    onEdit: () => void;
    children: React.ReactNode;
}

export function ConversationalStep({
    emoji,
    question,
    summaryText,
    isVisible,
    isCompleted,
    isEditing,
    isCurrent,
    canAdvance,
    onContinue,
    onEdit,
    children,
}: ConversationalStepProps) {
    const stepRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isCurrent && stepRef.current) {
            const timeout = setTimeout(() => {
                stepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 120);
            return () => clearTimeout(timeout);
        }
    }, [isCurrent]);

    if (!isVisible) return null;

    if (isCompleted && !isEditing) {
        return (
            <div ref={stepRef} className="flex items-start gap-3 animate-fade-in">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-base">
                    {emoji}
                </div>

                <div className="min-w-0 flex-1">
                    <div
                        className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-border-primary bg-bg-secondary px-4 py-2 text-sm text-text-secondary"
                        style={{ wordBreak: 'break-word' }}
                    >
                        <span className="truncate">{summaryText || question}</span>
                        <button
                            type="button"
                            onClick={onEdit}
                            className="flex-shrink-0 text-text-muted transition-colors hover:text-primary"
                            aria-label="Edit this step"
                            title="Edit"
                        >
                            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={stepRef} className="flex items-start gap-3 animate-fade-in">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-base">
                {emoji}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
                <div
                    className="inline-block rounded-2xl rounded-tl-sm px-4 py-3 text-sm font-medium leading-snug"
                    style={{
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-primary)',
                        color: 'var(--color-text-primary)',
                    }}
                >
                    {question}
                </div>

                <div className="space-y-3">{children}</div>

                <div className="pt-1">
                    <button
                        type="button"
                        onClick={onContinue}
                        disabled={!canAdvance}
                        className="btn btn-primary btn-sm"
                        style={{ minWidth: '100px' }}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
