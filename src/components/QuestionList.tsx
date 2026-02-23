'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { QuestionWithAnswers, QAMetrics } from '@/types/database';

interface QuestionFormProps {
    partyId: string;
    onQuestionAdded: () => void;
}

export function QuestionForm({ partyId, onQuestionAdded }: QuestionFormProps) {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error: insertError } = await supabase
                .from('questions')
                .insert({
                    party_id: partyId,
                    asked_by: user?.id || null,
                    question_text: question.trim()
                });

            if (insertError) throw insertError;

            setQuestion('');
            onQuestionAdded();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to ask question');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    className="input flex-1"
                    placeholder="Ask a public question..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                />
                <button
                    type="submit"
                    className="btn btn-primary sm:w-auto"
                    disabled={loading || !question.trim()}
                >
                    {loading ? '...' : 'Ask'}
                </button>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="form-hint mt-1">
                Questions are public and cannot be deleted
            </div>
        </form>
    );
}

interface QuestionListProps {
    questions: QuestionWithAnswers[];
    partyId: string;
    isMember: boolean;
    onAnswerAdded: () => void;
}

export function QuestionList({ questions, isMember, onAnswerAdded }: QuestionListProps) {
    return (
        <div className="flex flex-col gap-4">
            {questions.map((q) => (
                <QuestionItem
                    key={q.id}
                    question={q}
                    isMember={isMember}
                    onAnswerAdded={onAnswerAdded}
                />
            ))}

            {questions.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">❓</div>
                    <p>This issue has no public questions yet. Ask one.</p>
                </div>
            )}
        </div>
    );
}

interface QuestionItemProps {
    question: QuestionWithAnswers;
    isMember: boolean;
    onAnswerAdded: () => void;
}

function QuestionItem({ question, isMember, onAnswerAdded }: QuestionItemProps) {
    const [showAnswerForm, setShowAnswerForm] = useState(false);
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const isAnswered = question.answers.length > 0;

    const handleAnswer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answer.trim()) return;

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            await supabase
                .from('answers')
                .insert({
                    question_id: question.id,
                    answered_by: user?.id || null,
                    answer_text: answer.trim()
                });

            setAnswer('');
            setShowAnswerForm(false);
            onAnswerAdded();
        } catch (err) {
            console.error('Failed to answer:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    };

    return (
        <div className={`card ${isAnswered ? 'question-answered' : 'question-unanswered'}`}>
            {/* Question */}
            <div className={isAnswered ? 'mb-4' : ''}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-text-muted">
                        {question.asker_name || 'Anonymous'} • {formatDate(question.created_at)}
                    </span>
                    {!isAnswered && (
                        <span className="badge text-warning border-warning/40 bg-warning/10">
                            Unanswered
                        </span>
                    )}
                </div>
                <p className="text-sm text-text-primary leading-relaxed">
                    {question.question_text}
                </p>
            </div>

            {/* Answers */}
            {isAnswered && (
                <div className="pt-4 border-t border-border-primary">
                    {question.answers.map((a) => (
                        <div key={a.id} className="mb-3">
                            <div className="text-xs text-text-muted mb-1">
                                ↳ {a.answerer_name || 'Member'} • {formatDate(a.created_at)}
                            </div>
                            <p className="text-sm text-text-secondary leading-relaxed pl-3 border-l-2 border-accent">
                                {a.answer_text}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Answer form for members */}
            {isMember && (
                <div className="mt-3">
                    {showAnswerForm ? (
                        <form onSubmit={handleAnswer}>
                            <textarea
                                className="input min-h-[80px] mb-2"
                                placeholder="Write your answer..."
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                            />
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAnswerForm(false)}
                                    className="btn btn-secondary btn-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-success btn-sm"
                                    disabled={loading || !answer.trim()}
                                >
                                    {loading ? '...' : 'Submit Answer'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button
                            onClick={() => setShowAnswerForm(true)}
                            className="btn btn-secondary btn-sm"
                        >
                            Add Answer
                        </button>
                    )}
                </div>
            )}

            {/* Response time for answered questions */}
            {isAnswered && question.response_time_hours !== null && (
                <div className="mt-3 text-xs text-text-muted">
                    ⏱️ Responded in {
                        question.response_time_hours < 1
                            ? 'less than an hour'
                            : question.response_time_hours < 24
                                ? `${Math.round(question.response_time_hours)} hours`
                                : `${Math.round(question.response_time_hours / 24)} days`
                    }
                </div>
            )}
        </div>
    );
}

// Q&A Metrics display
interface QAMetricsDisplayProps {
    metrics: QAMetrics;
}

export function QAMetricsDisplay({ metrics }: QAMetricsDisplayProps) {
    const avgResponseText = metrics.avg_response_time_hours !== null
        ? metrics.avg_response_time_hours < 24
            ? `${Math.round(metrics.avg_response_time_hours)}h`
            : `${Math.round(metrics.avg_response_time_hours / 24)}d`
        : '-';

    return (
        <div className="qa-metrics">
            <div className="qa-metric">
                <span className="qa-metric-value">{metrics.total_questions}</span>
                <span className="qa-metric-label">Total</span>
            </div>
            <div className="qa-metric">
                <span className={`qa-metric-value ${metrics.unanswered_questions > 0 ? 'qa-metric-value--warning' : 'qa-metric-value--accent'}`}>
                    {metrics.unanswered_questions}
                </span>
                <span className="qa-metric-label">Unanswered</span>
            </div>
            <div className="qa-metric">
                <span className="qa-metric-value">{avgResponseText}</span>
                <span className="qa-metric-label">Avg Response</span>
            </div>
        </div>
    );
}
