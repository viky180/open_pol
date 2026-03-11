'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Issue } from '@/types/database';

type IssueSelectorSectionProps = {
    issueId: string;
    onIssueIdChange: (id: string) => void;
    newIssueName: string;
    onNewIssueNameChange: (v: string) => void;
};

/**
 * Shown only when creating a national-scope group.
 * Lets the user either pick an existing issue or name a new one (created on submit).
 */
export function IssueSelectorSection({
    issueId,
    onIssueIdChange,
    newIssueName,
    onNewIssueNameChange,
}: IssueSelectorSectionProps) {
    const [mode, setMode] = useState<'search' | 'new'>(issueId ? 'search' : 'new');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Issue[]>([]);
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
    const [searching, setSearching] = useState(false);

    // Keep selected issue label if we already have an id
    useEffect(() => {
        if (!issueId) {
            setSelectedIssue(null);
            return;
        }
        // Fetch by id to show label
        fetch(`/api/issues/${issueId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.issue) setSelectedIssue(data.issue); })
            .catch(() => { });
    }, [issueId]);

    const search = useCallback(async (q: string) => {
        setSearching(true);
        try {
            const res = await fetch(`/api/issues?q=${encodeURIComponent(q)}&limit=10`);
            if (!res.ok) return;
            const data = await res.json();
            setResults(data.issues || []);
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        if (mode !== 'search') return;
        const timer = setTimeout(() => search(query), 300);
        return () => clearTimeout(timer);
    }, [query, mode, search]);

    // When switching to search mode, pre-load all issues
    useEffect(() => {
        if (mode === 'search' && results.length === 0 && !query) {
            search('');
        }
    }, [mode, search, results.length, query]);

    const selectIssue = (issue: Issue) => {
        setSelectedIssue(issue);
        onIssueIdChange(issue.id);
        onNewIssueNameChange('');
    };

    const clearSelection = () => {
        setSelectedIssue(null);
        onIssueIdChange('');
    };

    return (
        <div className="space-y-3">
            <p className="text-xs text-text-muted">
                National groups must belong to an issue. Select an existing one or create a new issue.
            </p>

            {/* Mode tabs */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => { setMode('new'); onIssueIdChange(''); setSelectedIssue(null); }}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${mode === 'new'
                        ? 'border-primary bg-primary/10 text-primary-light font-medium'
                        : 'border-border-primary bg-bg-secondary text-text-secondary hover:border-primary/50'}`}
                >
                    ✨ New Issue
                </button>
                <button
                    type="button"
                    onClick={() => { setMode('search'); onNewIssueNameChange(''); }}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${mode === 'search'
                        ? 'border-primary bg-primary/10 text-primary-light font-medium'
                        : 'border-border-primary bg-bg-secondary text-text-secondary hover:border-primary/50'}`}
                >
                    🔍 Find Existing
                </button>
            </div>

            {/* New issue name */}
            {mode === 'new' && (
                <div>
                    <input
                        type="text"
                        className="input"
                        placeholder='e.g. "Clean Water Access" or "Remove AFSPA"'
                        value={newIssueName}
                        onChange={e => onNewIssueNameChange(e.target.value)}
                        maxLength={280}
                    />
                    <span className="form-hint">
                        A short, descriptive name for the issue. Multiple national groups can later form under this issue.
                    </span>
                </div>
            )}

            {/* Search existing issues */}
            {mode === 'search' && (
                <div className="space-y-2">
                    {selectedIssue ? (
                        <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 flex items-center justify-between gap-2">
                            <span className="text-sm text-text-primary truncate">{selectedIssue.issue_text}</span>
                            <button
                                type="button"
                                className="text-xs text-text-muted hover:text-danger flex-shrink-0"
                                onClick={clearSelection}
                            >
                                Change
                            </button>
                        </div>
                    ) : (
                        <>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search issues…"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                autoFocus
                            />
                            {searching && (
                                <p className="text-xs text-text-muted">Searching…</p>
                            )}
                            {!searching && results.length === 0 && query && (
                                <p className="text-xs text-text-muted">No issues found. Switch to &quot;New Issue&quot; to create one.</p>
                            )}
                            {results.length > 0 && (
                                <ul className="rounded-xl border border-border-primary divide-y divide-border-primary overflow-hidden">
                                    {results.map(issue => (
                                        <li key={issue.id}>
                                            <button
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-bg-secondary transition-colors text-text-primary"
                                                onClick={() => selectIssue(issue)}
                                            >
                                                {issue.issue_text}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
