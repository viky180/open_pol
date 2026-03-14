'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import type { QuestionWithAnswers, QAMetrics } from '@/types/database';
import { ResponseRing, StatTileDetail, EmptyStateCard } from './PartyPrimitives';

interface QATabProps {
    partyId: string;
    optimisticIsMember: boolean;
    questions: QuestionWithAnswers[];
    qaMetrics: QAMetrics;
    onJoin: () => void;
    joinLoading: boolean;
    onRefresh: () => void;
    onStatusMessage: (tone: 'success' | 'error' | 'info', text: string) => void;
    currentUserId: string | null;
    onAuthRequired: () => void;
}

export function QATab({
    partyId,
    optimisticIsMember,
    questions,
    qaMetrics,
    onJoin,
    joinLoading,
    onRefresh,
    onStatusMessage,
    currentUserId,
    onAuthRequired,
}: QATabProps) {
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [questionDraft, setQuestionDraft] = useState('');
    const [questionLoading, setQuestionLoading] = useState(false);

    const answeredQuestions = Math.max(qaMetrics.total_questions - qaMetrics.unanswered_questions, 0);
    const responseRate = qaMetrics.total_questions > 0
        ? Math.round((answeredQuestions / qaMetrics.total_questions) * 100)
        : 0;

    const handleAskQuestion = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const questionText = questionDraft.trim();
        if (!questionText) return;

        if (!currentUserId) {
            onAuthRequired();
            return;
        }
        if (!optimisticIsMember) {
            onStatusMessage('info', 'Join this group first to ask a public question.');
            return;
        }

        setQuestionLoading(true);
        try {
            // Dynamic import to avoid top-level client dependency
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            const { error } = await supabase
                .from('questions')
                .insert({ party_id: partyId, asked_by: currentUserId, question_text: questionText });
            if (error) throw error;
            setQuestionDraft('');
            setShowQuestionForm(false);
            onStatusMessage('success', 'Question posted publicly.');
            onRefresh();
        } catch {
            onStatusMessage('error', 'Could not post your question. Please try again.');
        } finally {
            setQuestionLoading(false);
        }
    };

    return (
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
                    <StatTileDetail value={qaMetrics.total_questions} label="Total questions" />
                    <StatTileDetail
                        value={qaMetrics.unanswered_questions}
                        label="Awaiting answer"
                        colorClass={qaMetrics.unanswered_questions > 0 ? 'text-warning' : 'text-text-primary'}
                    />
                </div>
            </div>

            {/* Q&A actions */}
            {!optimisticIsMember ? (
                <EmptyStateCard
                    icon={<MessageCircle className="w-6 h-6" />}
                    title="Members can ask questions"
                    description="Join this group to ask public questions and hold the voice accountable."
                    actionLabel={joinLoading ? 'Joining...' : 'Join to ask'}
                    onAction={onJoin}
                />
            ) : (
                <div>
                    <button
                        type="button"
                        onClick={() => setShowQuestionForm((prev) => !prev)}
                        className="btn btn-primary"
                    >
                        {showQuestionForm ? 'Cancel' : 'Ask Question'}
                    </button>

                    {showQuestionForm && (
                        <form onSubmit={handleAskQuestion} className="mt-4 max-w-2xl animate-fade-in">
                            <textarea
                                className="input min-h-[110px]"
                                value={questionDraft}
                                onChange={(e) => setQuestionDraft(e.target.value)}
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

            <hr className="border-border-primary/40" />

            {questions.length > 0 && (
                <p className="text-xs text-text-muted">
                    Questions are public and visible to everyone.
                </p>
            )}

            {questions.length === 0 && optimisticIsMember && (
                <EmptyStateCard
                    icon={<MessageCircle className="w-6 h-6" />}
                    title="No questions yet"
                    description="Be the first to ask a public question. Good questions drive accountability."
                />
            )}
        </section>
    );
}
