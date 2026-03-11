'use client';

import type { QuestionWithAnswers, QAMetrics } from '@/types/database';
import { QuestionForm, QuestionList } from '@/components/QuestionList';
import { SectionHeader, JoinToParticipateCard, StatTile, EmptyState, type PrimaryAction } from './PartyDetailShared';

interface AccountabilityTabContentProps {
    partyId: string;
    isMember: boolean;
    questions: QuestionWithAnswers[];
    qaMetrics: QAMetrics;
    primaryAction: PrimaryAction;
    onRefresh: () => void;
    ariaLabelledBy?: string;
}

export function AccountabilityTabContent({
    partyId,
    isMember,
    questions,
    qaMetrics,
    primaryAction,
    onRefresh,
    ariaLabelledBy = 'party-tab-accountability',
}: AccountabilityTabContentProps) {
    const answeredQuestions = Math.max(qaMetrics.total_questions - qaMetrics.unanswered_questions, 0);
    const responseRate = qaMetrics.total_questions > 0
        ? Math.round((answeredQuestions / qaMetrics.total_questions) * 100)
        : 0;

    return (
        <section
            id="party-section-accountability"
            role="tabpanel"
            className="space-y-6 party-section-anchor mt-10"
            aria-labelledby={ariaLabelledBy}
        >
            <SectionHeader
                icon="Q"
                title="Public Q&A"
                description="Ask questions that cannot be deleted. Hold voices accountable."
                gradientClassName="bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5"
                glowClassName="-top-10 -left-10 bg-amber-500/10"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatTile value={qaMetrics.total_questions} label="Questions" />
                <StatTile value={qaMetrics.total_questions - qaMetrics.unanswered_questions} label="Answered" valueClassName="text-success" />
                <StatTile value={qaMetrics.unanswered_questions} label="Awaiting" valueClassName="text-warning" />
                <StatTile value={`${responseRate}%`} label="Response Rate" valueClassName="text-primary" />
            </div>

            {isMember ? (
                <div className="rounded-2xl border border-border-primary bg-bg-card p-6">
                    <h3 className="font-semibold text-text-primary mb-4">Ask a public question</h3>
                    <QuestionForm partyId={partyId} onQuestionAdded={onRefresh} />
                </div>
            ) : (
                <JoinToParticipateCard
                    icon="?"
                    title="Join to ask questions"
                    description="Members can ask public questions that voices must answer."
                    actionLabel={primaryAction.label}
                    actionDisabled={primaryAction.disabled}
                    onAction={primaryAction.onClick}
                />
            )}

            <div>
                <h3 className="font-semibold text-text-primary mb-4">
                    {questions.length > 0 ? `${questions.length} Questions` : 'Questions'}
                </h3>
                {questions.length > 0 ? (
                    <QuestionList
                        questions={questions}
                        partyId={partyId}
                        isMember={isMember}
                        onAnswerAdded={onRefresh}
                    />
                ) : (
                    <EmptyState
                        icon="Q"
                        title="No questions yet"
                        description="Be the first to ask a question and start the conversation."
                    />
                )}
            </div>
        </section>
    );
}
