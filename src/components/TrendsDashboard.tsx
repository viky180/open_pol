'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type TrendPeriod = '7d' | '30d' | '90d';

type TrendItem = {
    party_id: string;
    current_members: number;
    previous_members: number;
    member_change: number;
    member_change_pct: number;
    current_supporters: number;
    current_likes: number;
    issue_text: string;
    node_type: string;
    location_scope: string;
};

type PlatformStats = {
    total_groups: number;
    total_members: number;
    previous_total_members: number;
    overall_change_pct: number;
};

type TrendsData = {
    period: TrendPeriod;
    days: number;
    platform: PlatformStats;
    gainers: TrendItem[];
    losers: TrendItem[];
};

function Sparkline({ values, color, width = 80, height = 28 }: {
    values: number[];
    color: string;
    width?: number;
    height?: number;
}) {
    if (values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padding = 2;

    const points = values
        .map((v, i) => {
            const x = padding + (i / (values.length - 1)) * (width - padding * 2);
            const y = height - padding - ((v - min) / range) * (height - padding * 2);
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <svg width={width} height={height} className="inline-block shrink-0">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Gradient fill under the line */}
            <defs>
                <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon
                points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
                fill={`url(#grad-${color.replace('#', '')})`}
            />
        </svg>
    );
}

export function ChangeIndicator({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
    const isPositive = value > 0;
    const isZero = value === 0;
    const sizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-lg font-bold',
    };

    return (
        <span className={`inline-flex items-center gap-0.5 ${sizeClasses[size]} ${isZero
            ? 'text-text-muted'
            : isPositive
                ? 'text-success'
                : 'text-danger'
            }`}>
            {isZero ? '—' : isPositive ? '▲' : '▼'}
            {!isZero && <span>{Math.abs(value)}%</span>}
        </span>
    );
}

export function TrendCard({ item, rank }: { item: TrendItem; rank: number }) {
    const isGainer = item.member_change >= 0;
    // Generate synthetic sparkline data points for visualization
    const sparkValues = generateSparklineData(item.previous_members, item.current_members, 7);

    return (
        <Link
            href={`/party/${item.party_id}`}
            className="flex items-center gap-4 p-4 rounded-xl border border-border-primary bg-bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 group"
        >
            {/* Rank */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-bg-tertiary border border-border-primary flex items-center justify-center text-sm font-bold text-text-muted">
                {rank}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                    {item.issue_text}
                </p>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-muted">
                        {item.current_members.toLocaleString()} members
                    </span>
                    <span className="text-xs text-text-muted">
                        {item.current_supporters} local chapters
                    </span>
                </div>
            </div>

            {/* Sparkline */}
            <Sparkline
                values={sparkValues}
                color={isGainer ? 'hsl(150, 85%, 45%)' : 'hsl(345, 90%, 60%)'}
            />

            {/* Change */}
            <div className="flex-shrink-0 text-right">
                <ChangeIndicator value={item.member_change_pct} />
                <div className="text-[11px] text-text-muted mt-0.5">
                    {item.member_change >= 0 ? '+' : ''}{item.member_change}
                </div>
            </div>
        </Link>
    );
}

function generateSparklineData(start: number, end: number, points: number): number[] {
    const data: number[] = [];
    for (let i = 0; i < points; i++) {
        const progress = i / (points - 1);
        // Add some random noise to make the chart look organic
        const noise = (Math.sin(i * 2.5) * 0.15 + Math.cos(i * 1.7) * 0.1) * Math.abs(end - start);
        const value = start + (end - start) * progress + noise;
        data.push(Math.max(0, Math.round(value)));
    }
    return data;
}

export function TrendsDashboard() {
    const [fetchState, setFetchState] = useState<{ data: TrendsData | null; loading: boolean; error: string | null }>(
        { data: null, loading: true, error: null }
    );
    const [period, setPeriod] = useState<TrendPeriod>('7d');

    useEffect(() => {
        let cancelled = false;
        const doFetch = async () => {
            try {
                const r = await fetch(`/api/trends?period=${period}&limit=15`);
                const d = await r.json();
                if (cancelled) return;
                if (d.error) throw new Error(d.error);
                setFetchState({ data: d, loading: false, error: null });
            } catch (e) {
                if (!cancelled) setFetchState(prev => ({ ...prev, loading: false, error: e instanceof Error ? e.message : 'Failed to load' }));
            }
        };
        setFetchState(prev => ({ ...prev, loading: true, error: null }));
        doFetch();
        return () => { cancelled = true; };
    }, [period]);

    const data = fetchState.data;
    const loading = fetchState.loading;
    const error = fetchState.error;

    const periods: { key: TrendPeriod; label: string }[] = [
        { key: '7d', label: '7 Days' },
        { key: '30d', label: '30 Days' },
        { key: '90d', label: '90 Days' },
    ];

    return (
        <div className="space-y-8">
            {/* Period Selector */}
            <div className="editorial-pill-group w-fit mx-auto">
                {periods.map(p => (
                    <button
                        key={p.key}
                        type="button"
                        onClick={() => setPeriod(p.key)}
                        className={`editorial-pill ${period === p.key
                            ? 'editorial-pill--active'
                            : ''
                            }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="stat-card animate-pulse">
                                <div className="h-8 bg-bg-tertiary rounded w-16 mx-auto mb-2" />
                                <div className="h-4 bg-bg-tertiary rounded w-24 mx-auto" />
                            </div>
                        ))}
                    </div>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-20 bg-bg-tertiary rounded-xl border border-border-primary animate-pulse" />
                    ))}
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="text-center py-12">
                    <p className="text-danger text-sm mb-2">Failed to load trends</p>
                    <p className="text-text-muted text-xs">{error}</p>
                    <button
                        type="button"
                        onClick={() => setPeriod(period)}
                        className="btn btn-secondary btn-sm mt-4"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Data loaded */}
            {data && !loading && (
                <>
                    {/* Platform Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="stat-card">
                            <div className="stat-value text-primary">{data.platform.total_groups}</div>
                            <div className="stat-label">Active Groups</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value text-accent">{data.platform.total_members.toLocaleString()}</div>
                            <div className="stat-label">Total Members</div>
                        </div>
                        <div className="stat-card">
                            <div className="flex items-center justify-center gap-2">
                                <ChangeIndicator value={data.platform.overall_change_pct} size="lg" />
                            </div>
                            <div className="stat-label">Overall Growth</div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Gainers */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-lg">📈</span>
                                <h2 className="text-lg font-bold text-text-primary">Top Gainers</h2>
                                <span className="ml-auto badge bg-success/10 text-success border-success/20">
                                    {data.gainers.length}
                                </span>
                            </div>
                            {data.gainers.length > 0 ? (
                                <div className="space-y-3">
                                    {data.gainers.map((item, i) => (
                                        <TrendCard key={item.party_id} item={item} rank={i + 1} />
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state py-8">
                                    <div className="empty-state-icon">📊</div>
                                    <p className="text-text-muted text-sm">No gainers yet</p>
                                    <p className="text-text-muted text-xs">Data will appear after snapshots are recorded</p>
                                </div>
                            )}
                        </div>

                        {/* Losers */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-lg">📉</span>
                                <h2 className="text-lg font-bold text-text-primary">Declining</h2>
                                <span className="ml-auto badge bg-danger/10 text-danger border-danger/20">
                                    {data.losers.length}
                                </span>
                            </div>
                            {data.losers.length > 0 ? (
                                <div className="space-y-3">
                                    {data.losers.map((item, i) => (
                                        <TrendCard key={item.party_id} item={item} rank={i + 1} />
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state py-8">
                                    <div className="empty-state-icon">📊</div>
                                    <p className="text-text-muted text-sm">No declining groups</p>
                                    <p className="text-text-muted text-xs">Groups losing members will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* No data at all */}
                    {data.gainers.length === 0 && data.losers.length === 0 && (
                        <div className="empty-state py-16">
                            <div className="empty-state-icon">🕐</div>
                            <h3 className="text-lg font-semibold text-text-primary">Not enough data yet</h3>
                            <p className="text-text-muted text-sm max-w-md">
                                Trends will appear once the system has recorded at least 2 daily snapshots.
                                The first snapshot will be taken automatically at 02:00 UTC tonight.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
