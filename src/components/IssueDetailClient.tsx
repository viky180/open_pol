'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LocationScope } from '@/types/database';

// ─── Data Types ───────────────────────────────────────────────────────────────

export type NationalGroupData = {
    id: string;
    issue_text: string;           // group stance / name
    is_founding_group?: boolean;
    member_count: number;
    leader_name: string | null;
    leader_id: string | null;
    leader_trust_votes: number;
    location_scope: LocationScope;
    // Children by level
    stateChildren: SubGroupData[];
    districtChildren: SubGroupData[];
    villageChildren: SubGroupData[];
};

export type SubGroupData = {
    id: string;
    issue_text: string;
    is_founding_group?: boolean;
    member_count: number;
    leader_name: string | null;
    leader_trust_votes: number;
    location_scope: LocationScope;
    location_label: string;
    parent_party_id: string | null;
    pct?: number;                 // % of that level's total (computed)
    rank?: number;
};

export type IssueDetailClientProps = {
    issueId: string;
    issueName: string;
    issueCategoryId?: string | null;
    totalMembers: number;
    urgency?: string | null;
    nationalGroups: NationalGroupData[];
    userMemberPartyId?: string | null;
    userStateName?: string | null;
    userDistrictName?: string | null;
    userVillageName?: string | null;
    initialSelectedGroupId?: string | null;
    initialTab?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null): string {
    if (!name) return '?';
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}

function fmt(n: number): string {
    if (n >= 100000) return `${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    return String(n);
}

function toPercent(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Math.round((numerator / denominator) * 100);
}

function sortByMemberCount<T extends { member_count: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => b.member_count - a.member_count);
}

function toLocationLabel(label?: string | null): string {
    return (label ?? '').trim() || UNKNOWN_LOCATION_LABEL;
}

function groupByLocation(groups: SubGroupData[]): Record<string, SubGroupData[]> {
    return groups.reduce<Record<string, SubGroupData[]>>((acc, group) => {
        const key = toLocationLabel(group.location_label);
        if (!acc[key]) acc[key] = [];
        acc[key].push(group);
        return acc;
    }, {});
}

function buildLocationList(groupsByLocation: Record<string, SubGroupData[]>): LocationSummary[] {
    return Object.entries(groupsByLocation)
        .map(([label, groups]) => ({ label, memberCount: groups.reduce((sum, g) => sum + g.member_count, 0) }))
        .sort((a, b) => b.memberCount - a.memberCount);
}

function getDefaultLocationSelection(locations: LocationSummary[], userLocation?: string | null): string {
    const selected = locations.find((location) => isLocationMatch(location.label, userLocation));
    return selected?.label ?? locations[0]?.label ?? '';
}

function isLocationMatch(a?: string | null, b?: string | null): boolean {
    if (!a || !b) return false;
    return a.toLowerCase() === b.toLowerCase();
}

function toSubGroup(group: NationalGroupData): SubGroupData {
    return {
        id: group.id,
        issue_text: group.issue_text,
        is_founding_group: group.is_founding_group,
        member_count: group.member_count,
        leader_name: group.leader_name,
        leader_trust_votes: group.leader_trust_votes,
        location_scope: group.location_scope,
        location_label: 'India',
        parent_party_id: null,
    };
}

type GeoTab = 'national' | 'state' | 'district' | 'village';

type IssueDetailRouteState = {
    selectedGroupId: string | null;
    activeTab: GeoTab;
};

type LocationSummary = {
    label: string;
    memberCount: number;
};

const UNKNOWN_LOCATION_LABEL = 'Unknown';

const GEO_TABS: { id: GeoTab; label: string; icon: string }[] = [
    { id: 'national', label: 'National', icon: '🏛️' },
    { id: 'state', label: 'State', icon: '📍' },
    { id: 'district', label: 'District', icon: '🏙️' },
    { id: 'village', label: 'Village', icon: '🏘️' },
];

function parseGeoTab(value: string | null | undefined): GeoTab {
    return GEO_TABS.some((tab) => tab.id === value) ? (value as GeoTab) : 'national';
}

function getRouteStateFromSearch(search: string, fallbackTab: GeoTab = 'national'): IssueDetailRouteState {
    const params = new URLSearchParams(search);
    return {
        selectedGroupId: params.get('group'),
        activeTab: parseGeoTab(params.get('tab') ?? fallbackTab),
    };
}

function getScopedLocationLabel(group: Pick<SubGroupData, 'location_scope' | 'location_label'>): string {
    if (group.location_scope === 'national') return 'National';
    const scopeLabel = group.location_scope.charAt(0).toUpperCase() + group.location_scope.slice(1);
    return group.location_label ? `${scopeLabel}: ${group.location_label}` : scopeLabel;
}

function formatTrustVotes(count: number): string {
    if (count === 1) return '1 active trust vote';
    return `${count} active trust votes`;
}

function buildCreateHref(params: Record<string, string | null | undefined>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value && value.trim()) search.set(key, value);
    }
    return `/party/create?${search.toString()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count?: number }) {
    return (
        <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '9px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase' as const,
            color: 'var(--iux-dust)',
            marginBottom: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        }}>
            {label}
            {count !== undefined && (
                <span style={{
                    color: 'var(--iux-ink)',
                    fontSize: '10px',
                    fontWeight: 600,
                    background: 'var(--iux-faint)',
                    padding: '1px 7px',
                    borderRadius: '20px',
                }}>{count}</span>
            )}
            <span style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.07)' }} />
        </div>
    );
}

function MemberBar({ pct, color }: { pct: number; color: string }) {
    return (
        <div style={{ height: '5px', background: '#EBE5DA', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '3px', transition: 'width 0.6s cubic-bezier(.4,0,.2,1)' }} />
        </div>
    );
}

function LeaderAvatar({ name, bg, border, color, size = 24 }: { name: string | null; bg: string; border: string; color: string; size?: number }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: bg, border: `1.5px solid ${border}`, color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size < 30 ? '9px' : '14px', fontWeight: 700, flexShrink: 0,
        }}>
            {initials(name)}
        </div>
    );
}

// ─── HOW IT WORKS BANNER ──────────────────────────────────────────────────────

function HowItWorksBanner() {
    const steps = [
        { level: 'National', desc: 'Groups compete\nfor members' },
        { level: 'State', desc: 'Sub-groups within\nnational compete' },
        { level: 'District', desc: 'Sub-groups within\nstate compete' },
        { level: 'Village', desc: 'Most trusted\nmember leads' },
    ];
    return (
        <div style={{
            background: 'var(--iux-forest)', borderRadius: '10px',
            padding: '14px', marginBottom: '4px', position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', right: '-15px', top: '-15px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(232,151,30,0.07)' }} />
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--iux-ochre2)', marginBottom: '8px' }}>
                How leadership emerges
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: '2px' }}>
                {steps.map((step, i) => (
                    <div key={step.level} style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                        <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '6px 10px', textAlign: 'center' as const }}>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--iux-ochre2)', marginBottom: '2px' }}>{step.level}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre' }}>{step.desc}</div>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', padding: '0 5px', flexShrink: 0 }}>›</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── NATIONAL GROUP CARD (issue level) ───────────────────────────────────────

function NationalGroupCard({
    group, totalMembers, isUserGroup, rank, onOpen,
}: {
    group: NationalGroupData;
    totalMembers: number;
    isUserGroup: boolean;
    rank: number;
    onOpen: () => void;
}) {
    const pct = toPercent(group.member_count, totalMembers);
    const electionLocked = !!group.is_founding_group && group.member_count < 50;
    const colors = [
        { bar: 'var(--iux-forest3)', avBg: '#e4f0e8', avBorder: 'var(--iux-forest3)', avColor: 'var(--iux-forest)' },
        { bar: 'var(--iux-ochre)', avBg: '#fef3e2', avBorder: 'var(--iux-ochre2)', avColor: 'var(--iux-ochre)' },
        { bar: 'var(--iux-red)', avBg: 'var(--iux-red-pale)', avBorder: 'var(--iux-red)', avColor: 'var(--iux-red)' },
        { bar: 'var(--iux-blue)', avBg: 'var(--iux-blue-pale)', avBorder: 'var(--iux-blue)', avColor: 'var(--iux-blue)' },
    ];
    const scheme = colors[(rank - 1) % colors.length];
    const icons = ['💧', '🌾', '🚫', '🌱', '🏛️', '📣'];
    const icon = icons[(rank - 1) % icons.length];

    return (
        <button
            type="button"
            onClick={onOpen}
            aria-label={`Open ${group.issue_text}`}
            style={{
                display: 'block',
                width: '100%',
                textAlign: 'left' as const,
                background: 'var(--iux-white)',
                border: isUserGroup ? '2px solid var(--iux-forest3)' : '1.5px solid rgba(0,0,0,0.12)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '10px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.18s',
                WebkitTapHighlightColor: 'transparent',
            }}
        >
            {isUserGroup && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    background: 'var(--iux-forest)',
                    fontFamily: "'DM Mono', monospace", fontSize: '8px', letterSpacing: '0.12em',
                    color: 'var(--iux-ochre2)', textAlign: 'center' as const, padding: '4px',
                }}>YOUR NATIONAL GROUP</div>
            )}
            <div style={{ marginTop: isUserGroup ? '14px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '22px', flexShrink: 0, marginTop: '1px' }}>{icon}</div>
                    <div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: 700, color: 'var(--iux-forest)', lineHeight: 1.2, marginBottom: '3px' }}>
                            {group.issue_text}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--iux-dust)', lineHeight: 1.45 }}>
                            {group.is_founding_group
                                ? 'Founding group'
                                : rank === 1 ? 'Leading national group' : 'Competing national group'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--iux-forest)', fontWeight: 500 }}>
                        {fmt(group.member_count)} members
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--iux-dust)' }}>{pct}% of issue</span>
                </div>
                <MemberBar pct={pct} color={scheme.bar} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <LeaderAvatar name={group.leader_name} bg={scheme.avBg} border={scheme.avBorder} color={scheme.avColor} />
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--iux-forest)' }}>
                                {electionLocked ? 'Leadership opens at 50 members' : (group.leader_name ?? 'No leader yet')}
                            </div>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--iux-ochre)' }}>
                                {electionLocked
                                    ? `${group.member_count}/50 members to open election`
                                    : `National Leader · ${group.leader_trust_votes} trust votes`}
                            </div>
                        </div>
                    </div>
                    <span
                        aria-hidden="true"
                        style={{
                            padding: '7px 16px', borderRadius: '5px', fontSize: '11px', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', letterSpacing: '0.03em',
                            background: isUserGroup ? 'var(--iux-forest)' : 'var(--iux-faint)',
                            color: isUserGroup ? 'var(--iux-ochre2)' : 'var(--iux-forest)',
                            ...(isUserGroup ? {} : { border: '1px solid rgba(0,0,0,0.12)' }),
                        }}
                    >
                        {isUserGroup ? 'Open →' : 'View'}
                    </span>
                </div>
            </div>
        </button>
    );
}

// ─── COMPETITION EXPLAINER ────────────────────────────────────────────────────

function CompetitionExplainer({ icon, title, body }: { icon: string; title: string; body: string }) {
    return (
        <div style={{
            background: 'var(--iux-ochre-pale)', border: '1px solid var(--iux-ochre-border)',
            borderRadius: '8px', padding: '11px 13px', marginBottom: '12px',
            display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
            <div style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>{icon}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--iux-forest2)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--iux-forest)', display: 'block', marginBottom: '1px', fontSize: '12px' }}>{title}</strong>
                {body}
            </div>
        </div>
    );
}

// ─── EMERGING LEADER BOX ──────────────────────────────────────────────────────

function EmergingLeaderBox({ leader, group, votes, why }: {
    leader: string | null; group: string; votes: number; why: string;
}) {
    return (
        <div style={{ background: 'var(--iux-forest)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8.5px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
                Emerging Leader — from Winning Group
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '16px', fontWeight: 700, flexShrink: 0,
                    background: 'var(--iux-forest3)', color: 'var(--iux-ochre2)', border: '2.5px solid var(--iux-ochre)',
                }}>
                    {initials(leader)}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>
                        {leader ?? 'No leader yet'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>{group}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'var(--iux-ochre2)', borderRadius: '2px', width: '100%' }} />
                        </div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--iux-ochre2)' }}>{formatTrustVotes(votes)}</div>
                    </div>
                </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '10.5px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                {why}
            </div>
        </div>
    );
}

// ─── WINNER CARD ──────────────────────────────────────────────────────────────

function WinnerCard({ group, pct, badgeLabel }: {
    group: SubGroupData; pct: number; badgeLabel: string;
}) {
    return (
        <Link
            href={`/party/${group.id}`}
            style={{
                display: 'block', textDecoration: 'none',
                background: 'var(--iux-win-pale)', border: '2px solid var(--iux-win)',
                borderRadius: '10px', padding: '14px', marginBottom: '10px', cursor: 'pointer',
                transition: 'all 0.18s', position: 'relative',
            }}>
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                background: 'var(--iux-win)', borderRadius: '8px 8px 0 0', padding: '4px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', letterSpacing: '0.13em', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px' }}>👑</span> {badgeLabel}
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', color: 'rgba(255,255,255,0.7)' }}>{pct}%</span>
            </div>
            <div style={{ marginTop: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: 'var(--iux-win)', flexShrink: 0, width: '24px', marginTop: '2px' }}>1</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '14px', fontWeight: 700, color: 'var(--iux-forest)', lineHeight: 1.25, marginBottom: '2px' }}>
                            {group.issue_text}
                        </div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--iux-dust)' }}>
                            {getScopedLocationLabel(group)}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--iux-forest)', fontWeight: 500 }}>{fmt(group.member_count)} members</span>
                    <span style={{ fontSize: '11px', color: 'var(--iux-dust)' }}>{pct}%</span>
                </div>
                <MemberBar pct={pct} color="var(--iux-win)" />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <LeaderAvatar name={group.leader_name} bg="#e4f0e8" border="var(--iux-win)" color="var(--iux-win)" size={22} />
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--iux-forest)' }}>{group.leader_name ?? 'No leader yet'}</div>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9.5px', color: 'var(--iux-ochre)' }}>
                                {group.leader_trust_votes} trust votes → Leader
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ─── SUB-GROUP CARD ───────────────────────────────────────────────────────────

function SubGroupCard({ group, rank, pct, isUser }: {
    group: SubGroupData; rank: number; pct: number; isUser?: boolean;
}) {
    const rankColors = ['var(--iux-win)', 'var(--iux-ochre)', 'var(--iux-muted)'];
    const barColors = ['var(--iux-win)', 'var(--iux-ochre)', 'var(--iux-blue)'];
    const avSchemes = [
        { bg: '#e4f0e8', border: 'var(--iux-win)', color: 'var(--iux-win)' },
        { bg: '#fef3e2', border: 'var(--iux-ochre2)', color: 'var(--iux-ochre)' },
        { bg: 'var(--iux-blue-pale)', border: 'var(--iux-blue)', color: 'var(--iux-blue)' },
    ];
    const idx = Math.min(rank - 1, 2);
    const av = avSchemes[idx];

    return (
        <Link
            href={`/party/${group.id}`}
            style={{
                display: 'block', textDecoration: 'none', color: 'inherit',
                background: 'var(--iux-white)',
                border: isUser ? `2px solid var(--iux-ochre)` : '1.5px solid rgba(0,0,0,0.12)',
                borderRadius: '10px', padding: '14px', marginBottom: '10px',
                cursor: 'pointer', transition: 'all 0.18s', position: 'relative',
            }}
        >
            {isUser && (
                <span style={{
                    position: 'absolute', top: 0, right: '12px',
                    fontFamily: "'DM Mono', monospace", fontSize: '7.5px', letterSpacing: '0.12em',
                    color: 'var(--iux-ochre)', background: 'var(--iux-ochre-pale)',
                    padding: '2px 7px', borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px',
                }}>YOUR GROUP</span>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: rankColors[idx], flexShrink: 0, width: '24px', marginTop: '2px' }}>
                    {rank}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '14px', fontWeight: 700, color: 'var(--iux-forest)', lineHeight: 1.25, marginBottom: '2px' }}>
                        {group.issue_text}
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--iux-dust)' }}>
                        {getScopedLocationLabel(group)}
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--iux-forest)', fontWeight: 500 }}>{fmt(group.member_count)} members</span>
                <span style={{ fontSize: '11px', color: 'var(--iux-dust)' }}>{pct}%</span>
            </div>
            <MemberBar pct={pct} color={barColors[idx]} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <LeaderAvatar name={group.leader_name} bg={av.bg} border={av.border} color={av.color} size={22} />
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--iux-forest)' }}>{group.leader_name ?? 'No leader'}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9.5px', color: 'var(--iux-ochre)' }}>{group.leader_name ? formatTrustVotes(group.leader_trust_votes) : 'Leadership open'}</div>
                    </div>
                </div>
                <span
                    style={{
                        padding: '5px 12px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600,
                        border: '1.5px solid rgba(0,0,0,0.12)',
                        background: isUser ? 'var(--iux-ochre-pale)' : 'transparent',
                        borderColor: isUser ? 'var(--iux-ochre)' : 'rgba(0,0,0,0.12)',
                        color: 'var(--iux-forest)',
                    }}
                >
                    {isUser ? '✓ Joined' : 'View →'}
                </span>
            </div>
        </Link>
    );
}

// ─── START NEW GROUP CTA ──────────────────────────────────────────────────────

function StartGroupCTA({ label, sub, href }: { label: string; sub: string; href: string }) {
    return (
        <Link
            href={href}
            style={{
                display: 'block',
                border: '1.5px dashed rgba(201,123,26,0.35)',
                borderRadius: '10px', padding: '16px', textAlign: 'center' as const,
                marginBottom: '14px', transition: 'all 0.2s', textDecoration: 'none',
            }}
        >
            <div style={{ fontSize: '22px', marginBottom: '6px' }}>＋</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--iux-forest)', marginBottom: '3px' }}>{label}</div>
            <div style={{ fontSize: '11px', color: 'var(--iux-dust)' }}>{sub}</div>
        </Link>
    );
}

// ─── GEO LOCATION PILL SELECTOR ──────────────────────────────────────────────

function GeoLocationPills({
    locations, selected, userLocation, onSelect,
}: {
    locations: { label: string; memberCount: number }[];
    selected: string;
    userLocation?: string | null;
    onSelect: (label: string) => void;
}) {
    if (locations.length === 0) return null;
    return (
        <div style={{ marginBottom: '12px' }}>
            <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: '8.5px', letterSpacing: '0.13em',
                textTransform: 'uppercase' as const, color: 'var(--iux-dust)', marginBottom: '8px',
            }}>
                Browse by location
            </div>
            <div style={{
                display: 'flex', gap: '7px', overflowX: 'auto', paddingBottom: '6px',
                scrollbarWidth: 'none',
            }}>
                {locations.map((loc) => {
                    const isActive = loc.label === selected;
                    const isUser = isLocationMatch(loc.label, userLocation);
                    return (
                        <button
                            key={loc.label}
                            type="button"
                            onClick={() => onSelect(loc.label)}
                            style={{
                                flexShrink: 0, padding: '7px 12px', borderRadius: '20px', cursor: 'pointer',
                                border: isActive ? '2px solid var(--iux-forest3)' : '1.5px solid rgba(0,0,0,0.12)',
                                background: isActive ? 'var(--iux-forest)' : isUser ? 'var(--iux-ochre-pale)' : 'var(--iux-white)',
                                transition: 'all 0.18s', WebkitTapHighlightColor: 'transparent',
                            }}
                        >
                            <div style={{
                                fontSize: '11px', fontWeight: 600,
                                color: isActive ? 'var(--iux-ochre2)' : 'var(--iux-forest)',
                                whiteSpace: 'nowrap',
                            }}>
                                {isUser && <span style={{ marginRight: '4px' }}>👤</span>}
                                {loc.label}
                            </div>
                            <div style={{
                                fontFamily: "'DM Mono', monospace", fontSize: '9px',
                                color: isActive ? 'rgba(255,255,255,0.55)' : 'var(--iux-dust)',
                                textAlign: 'center' as const, marginTop: '2px',
                            }}>
                                {loc.memberCount.toLocaleString()}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── GEO TAB CONTENT ─────────────────────────────────────────────────────────

function GeoTabContent({
    tab, nationalGroup, allNationalGroups, totalIssueMembers, userMemberPartyId, issueId,
    userStateName, userDistrictName, userVillageName, issueCategoryId,
}: {
    tab: GeoTab;
    nationalGroup: NationalGroupData;
    allNationalGroups: NationalGroupData[];
    totalIssueMembers: number;
    userMemberPartyId?: string | null;
    issueId: string;
    userStateName?: string | null;
    userDistrictName?: string | null;
    userVillageName?: string | null;
    issueCategoryId?: string | null;
}) {
    const sortedNationalGroups = sortByMemberCount(allNationalGroups);

    if (tab === 'national') {
        return (
            <div style={{ padding: '13px 14px 0' }}>
                <CompetitionExplainer
                    icon="🏛️"
                    title="National Competition"
                    body={`${nationalGroup.issue_text} competes with other national groups. Group with most members nationally wins. Their most trusted member becomes national leader.`}
                />
                <SectionHeader label="National Groups — this Issue" count={sortedNationalGroups.length} />
                {sortedNationalGroups.map((g, idx) => {
                    const pct = toPercent(g.member_count, totalIssueMembers);
                    const isWinner = idx === 0 && !(sortedNationalGroups.length === 1 && g.is_founding_group);
                    if (isWinner) {
                        const winnerSubGroup = toSubGroup(g);
                        return <WinnerCard key={g.id} group={winnerSubGroup} pct={pct} badgeLabel="WINNING NATIONAL GROUP" />;
                    }
                    const subGroup = toSubGroup(g);
                    return (
                        <SubGroupCard
                            key={g.id}
                            group={subGroup}
                            rank={idx + 1}
                            pct={pct}
                            isUser={userMemberPartyId === g.id}
                        />
                    );
                })}
            </div>
        );
    }

    if (tab === 'state') {
        const stateMap = groupByLocation(nationalGroup.stateChildren);
        const stateList = buildLocationList(stateMap);

        return (
            <StateTabInner
                stateList={stateList}
                stateMap={stateMap}
                userStateName={userStateName}
                userMemberPartyId={userMemberPartyId}
                nationalGroup={nationalGroup}
                issueId={issueId}
                issueCategoryId={issueCategoryId}
            />
        );
    }

    if (tab === 'district') {
        const districtMap = groupByLocation(nationalGroup.districtChildren);
        const districtList = buildLocationList(districtMap);

        return (
            <DistrictTabInner
                districtList={districtList}
                districtMap={districtMap}
                userDistrictName={userDistrictName}
                userMemberPartyId={userMemberPartyId}
                nationalGroup={nationalGroup}
                issueId={issueId}
                issueCategoryId={issueCategoryId}
                userStateName={userStateName}
            />
        );
    }

    const villageMap = groupByLocation(nationalGroup.villageChildren);
    const villageList = buildLocationList(villageMap);

    return (
        <VillageTabInner
            villageList={villageList}
            villageMap={villageMap}
            userMemberPartyId={userMemberPartyId}
            nationalGroup={nationalGroup}
            issueId={issueId}
            issueCategoryId={issueCategoryId}
            userVillageName={userVillageName}
        />
    );
}

// ─── GEO LEVEL INNER TABS (stateful, so hooks are not called conditionally) ───

function GeoLevelCompetitionView({
    levelLabel, groups, userMemberPartyId, winnerBadge, ctaLabel, ctaSub, ctaHref,
}: {
    levelLabel: string;
    groups: SubGroupData[];
    userMemberPartyId?: string | null;
    winnerBadge: string;
    ctaLabel: string;
    ctaSub: string;
    ctaHref: string;
}) {
    const sorted = sortByMemberCount(groups);
    const totalInLevel = sorted.reduce((s, g) => s + g.member_count, 0);
    const winner = sorted[0];
    return (
        <div>
            {winner && (
                <EmergingLeaderBox
                    leader={winner.leader_name}
                    group={`${winner.issue_text} — ${levelLabel}`}
                    votes={winner.leader_trust_votes}
                    why={`${winner.issue_text} has the most members in ${levelLabel}. ${winner.leader_name ?? 'No leader'} holds the most trust votes in that group.`}
                />
            )}
            <SectionHeader label={`Groups competing in ${levelLabel}`} count={sorted.length} />
            {sorted.map((g, idx) => {
                const pct = toPercent(g.member_count, totalInLevel);
                if (idx === 0 && sorted.length > 1) {
                    return <WinnerCard key={g.id} group={g} pct={pct} badgeLabel={winnerBadge} />;
                }
                return <SubGroupCard key={g.id} group={g} rank={idx + 1} pct={pct} isUser={userMemberPartyId === g.id} />;
            })}
            {sorted.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--iux-dust)', fontSize: '13px' }}>No groups yet in this location.</div>
            )}
            <StartGroupCTA label={ctaLabel} sub={ctaSub} href={ctaHref} />
        </div>
    );
}

function StateTabInner({
    stateList, stateMap, userStateName, userMemberPartyId, nationalGroup, issueId, issueCategoryId,
}: {
    stateList: { label: string; memberCount: number }[];
    stateMap: Record<string, SubGroupData[]>;
    userStateName?: string | null;
    userMemberPartyId?: string | null;
    nationalGroup: NationalGroupData;
    issueId: string;
    issueCategoryId?: string | null;
}) {
    const defaultState = getDefaultLocationSelection(stateList, userStateName);
    const [selectedState, setSelectedState] = useState(defaultState);
    const prefilledState = userStateName?.trim() || selectedState;
    const stateGroups = stateMap[selectedState] ?? [];
    return (
        <div style={{ padding: '13px 14px 0' }}>
            <CompetitionExplainer
                icon="⚔️"
                title="State-level competition"
                body="Groups compete within each state. The most-membered group's top trusted member becomes State Leader."
            />
            <GeoLocationPills
                locations={stateList}
                selected={selectedState}
                userLocation={userStateName}
                onSelect={setSelectedState}
            />
            <GeoLevelCompetitionView
                levelLabel={selectedState}
                groups={stateGroups}
                userMemberPartyId={userMemberPartyId}
                winnerBadge="LEADING IN THIS STATE"
                ctaLabel="Start a State Group Here"
                ctaSub={`Compete for state leadership of ${nationalGroup.issue_text} in ${selectedState}`}
                ctaHref={buildCreateHref({
                    location_scope: 'state',
                    parent: nationalGroup.id,
                    issue: nationalGroup.issue_text,
                    issue_id: issueId,
                    state_name: prefilledState,
                    category: issueCategoryId,
                    review: '1',
                })}
            />
        </div>
    );
}

function DistrictTabInner({
    districtList, districtMap, userDistrictName, userMemberPartyId, nationalGroup, issueId, issueCategoryId, userStateName,
}: {
    districtList: { label: string; memberCount: number }[];
    districtMap: Record<string, SubGroupData[]>;
    userDistrictName?: string | null;
    userMemberPartyId?: string | null;
    nationalGroup: NationalGroupData;
    issueId: string;
    issueCategoryId?: string | null;
    userStateName?: string | null;
}) {
    const defaultDistrict = getDefaultLocationSelection(districtList, userDistrictName);
    const [selectedDistrict, setSelectedDistrict] = useState(defaultDistrict);
    const prefilledDistrict = userDistrictName?.trim() || selectedDistrict;
    const districtGroups = districtMap[selectedDistrict] ?? [];
    return (
        <div style={{ padding: '13px 14px 0' }}>
            <CompetitionExplainer
                icon="🏙️"
                title="District-level competition"
                body="Groups compete within each district. The most-membered group's top trusted member becomes District Leader."
            />
            <GeoLocationPills
                locations={districtList}
                selected={selectedDistrict}
                userLocation={userDistrictName}
                onSelect={setSelectedDistrict}
            />
            <GeoLevelCompetitionView
                levelLabel={selectedDistrict}
                groups={districtGroups}
                userMemberPartyId={userMemberPartyId}
                winnerBadge="LEADING IN THIS DISTRICT"
                ctaLabel="Start a District Group Here"
                ctaSub={`Compete for district leadership of ${nationalGroup.issue_text} in ${selectedDistrict}`}
                ctaHref={buildCreateHref({
                    location_scope: 'district',
                    parent: nationalGroup.id,
                    issue: nationalGroup.issue_text,
                    issue_id: issueId,
                    state_name: userStateName,
                    district_name: prefilledDistrict,
                    category: issueCategoryId,
                    review: '1',
                })}
            />
        </div>
    );
}

function VillageTabInner({
    villageList, villageMap, userMemberPartyId, nationalGroup, issueId, issueCategoryId, userVillageName,
}: {
    villageList: { label: string; memberCount: number }[];
    villageMap: Record<string, SubGroupData[]>;
    userMemberPartyId?: string | null;
    nationalGroup: NationalGroupData;
    issueId: string;
    issueCategoryId?: string | null;
    userVillageName?: string | null;
}) {
    const defaultVillage = getDefaultLocationSelection(villageList, userVillageName);
    const [selectedVillage, setSelectedVillage] = useState(defaultVillage);
    const prefilledVillage = userVillageName?.trim() || selectedVillage;
    const villageGroups = villageMap[selectedVillage] ?? [];
    return (
        <div style={{ padding: '13px 14px 0' }}>
            <CompetitionExplainer
                icon="🏘️"
                title="Village-level competition"
                body="Groups compete within each village. The most-membered group's top trusted member becomes Village Leader."
            />
            <GeoLocationPills
                locations={villageList}
                selected={selectedVillage}
                userLocation={null}
                onSelect={setSelectedVillage}
            />
            <GeoLevelCompetitionView
                levelLabel={selectedVillage}
                groups={villageGroups}
                userMemberPartyId={userMemberPartyId}
                winnerBadge="LEADING IN THIS VILLAGE"
                ctaLabel="Start a Village Group Here"
                ctaSub={`Build local membership for ${nationalGroup.issue_text} in ${selectedVillage}`}
                ctaHref={buildCreateHref({
                    location_scope: 'village',
                    parent: nationalGroup.id,
                    issue: nationalGroup.issue_text,
                    issue_id: issueId,
                    village_name: prefilledVillage,
                    category: issueCategoryId,
                    review: '1',
                })}
            />
        </div>
    );
}

// ─── GROUP DETAIL VIEW ────────────────────────────────────────────────────────

function GroupDetailView({
    nationalGroup, allNationalGroups, totalIssueMembers, userMemberPartyId, issueName, issueId, activeTab, onBack, onTabChange,
    userStateName, userDistrictName, userVillageName, issueCategoryId,
}: {
    nationalGroup: NationalGroupData;
    allNationalGroups: NationalGroupData[];
    totalIssueMembers: number;
    userMemberPartyId?: string | null;
    issueName: string;
    issueId: string;
    activeTab: GeoTab;
    onBack: () => void;
    onTabChange: (tab: GeoTab) => void;
    userStateName?: string | null;
    userDistrictName?: string | null;
    userVillageName?: string | null;
    issueCategoryId?: string | null;
}) {
    const activeMemberCount = nationalGroup.member_count;
    const groupsInView = activeTab === 'national'
        ? allNationalGroups
        : activeTab === 'state'
            ? nationalGroup.stateChildren
            : activeTab === 'district'
                ? nationalGroup.districtChildren
                : nationalGroup.villageChildren;
    const groupsInViewLabel = activeTab === 'national'
        ? 'National groups in view'
        : `${GEO_TABS.find((tab) => tab.id === activeTab)?.label ?? 'Local'} groups in view`;

    return (
        <div>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(160deg, var(--iux-forest) 0%, var(--iux-forest2) 100%)',
                padding: '16px 16px 14px', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(232,151,30,0.08)' }} />
                <button
                    onClick={onBack}
                    style={{
                        fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.35)',
                        letterSpacing: '0.07em', marginBottom: '4px', display: 'flex', alignItems: 'center',
                        gap: '4px', cursor: 'pointer', background: 'none', border: 'none', padding: 0,
                    }}
                >
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>← Back</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>{issueName}</span>
                </button>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: '10px' }}>
                    {nationalGroup.issue_text}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' as const }}>
                    {[
                        { v: fmt(activeMemberCount), l: 'Total members' },
                        { v: String(groupsInView.length), l: groupsInViewLabel },
                        { v: String(nationalGroup.leader_trust_votes), l: 'Current leader votes' },
                    ].map(({ v, l }) => (
                        <div key={l} style={{ display: 'flex', flexDirection: 'column' as const, gap: '1px' }}>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: 'var(--iux-ochre2)' }}>{v}</div>
                            <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.4)' }}>{l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Geo Tabs */}
            <div style={{ padding: '13px 14px 0' }}>
                <div role="tablist" aria-label="Competition levels" style={{ display: 'flex', background: '#DDD7CC', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                    {GEO_TABS.map((t) => (
                        <button
                            type="button"
                            key={t.id}
                            id={`geo-tab-${t.id}`}
                            role="tab"
                            aria-selected={activeTab === t.id}
                            aria-controls={`geo-tabpanel-${t.id}`}
                            tabIndex={activeTab === t.id ? 0 : -1}
                            onClick={() => onTabChange(t.id)}
                            style={{
                                flex: 1, textAlign: 'center' as const, padding: '7px 3px',
                                fontFamily: "'DM Mono', monospace", fontSize: '9.5px', letterSpacing: '0.05em',
                                textTransform: 'uppercase' as const, borderRadius: '4px',
                                cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                                background: activeTab === t.id ? 'var(--iux-forest)' : 'transparent',
                                color: activeTab === t.id ? 'var(--iux-ochre2)' : 'var(--iux-dust)',
                                fontWeight: activeTab === t.id ? 500 : 400,
                                transition: 'all 0.2s',
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div id={`geo-tabpanel-${activeTab}`} role="tabpanel" aria-labelledby={`geo-tab-${activeTab}`}>
                <GeoTabContent
                    key={activeTab}
                    tab={activeTab}
                    nationalGroup={nationalGroup}
                    allNationalGroups={allNationalGroups}
                    totalIssueMembers={totalIssueMembers}
                    userMemberPartyId={userMemberPartyId}
                    issueId={issueId}
                    userStateName={userStateName}
                    userDistrictName={userDistrictName}
                    userVillageName={userVillageName}
                    issueCategoryId={issueCategoryId}
                />
            </div>
        </div>
    );
}

// ─── MAIN EXPORTED COMPONENT ──────────────────────────────────────────────────

export function IssueDetailClient({
    issueId,
    issueName,
    issueCategoryId,
    totalMembers,
    urgency,
    nationalGroups,
    userMemberPartyId,
    userStateName,
    userDistrictName,
    userVillageName,
    initialSelectedGroupId,
    initialTab,
}: IssueDetailClientProps) {
    const fallbackTab = parseGeoTab(initialTab);
    const [routeState, setRouteState] = useState<IssueDetailRouteState>({
        selectedGroupId: initialSelectedGroupId ?? null,
        activeTab: fallbackTab,
    });

    useEffect(() => {
        const syncFromUrl = () => {
            setRouteState(getRouteStateFromSearch(window.location.search, fallbackTab));
        };

        syncFromUrl();
        window.addEventListener('popstate', syncFromUrl);
        return () => window.removeEventListener('popstate', syncFromUrl);
    }, [fallbackTab]);

    const selectedGroup = nationalGroups.find((g) => g.id === routeState.selectedGroupId) ?? null;
    const foundingGroup = nationalGroups.find((g) => g.is_founding_group) ?? null;

    const updateRouteState = (nextState: IssueDetailRouteState, mode: 'push' | 'replace') => {
        const url = new URL(window.location.href);

        if (nextState.selectedGroupId) {
            url.searchParams.set('group', nextState.selectedGroupId);
            url.searchParams.set('tab', nextState.activeTab);
        } else {
            url.searchParams.delete('group');
            url.searchParams.delete('tab');
        }

        if (mode === 'push') {
            window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
        } else {
            window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
        }
        setRouteState(nextState);
    };

    return (
        <div
            style={{
                background: 'var(--iux-cream)',
                minHeight: '100vh',
                color: 'var(--iux-ink)',
                width: '100%',
                maxWidth: 'min(100%, 1040px)',
                margin: '0 auto',
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: '0 24px 70px rgba(21, 33, 23, 0.08)',
                borderRadius: '18px',
                overflow: 'hidden',
            }}
        >
            {!selectedGroup ? (
                // ── ISSUE VIEW ──────────────────────────────────────────────────
                <div style={{ paddingBottom: '24px' }}>
                    {/* Hero */}
                    <div style={{
                        background: 'var(--iux-forest)', padding: '16px 16px 14px',
                        position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{ position: 'absolute', right: '-40px', bottom: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(232,151,30,0.06)' }} />
                        <div style={{ position: 'absolute', right: '30px', bottom: '20px', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(232,151,30,0.04)' }} />
                        {/* Breadcrumb */}
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9.5px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Link href="/discover" style={{ color: 'inherit', textDecoration: 'none' }}>Issues</Link>
                            <span style={{ opacity: 0.3 }}>›</span>
                            <span style={{ color: 'var(--iux-ochre2)' }}>{issueName}</span>
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: '9px' }}>
                            {issueName}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const, alignItems: 'center' }}>
                            {totalMembers > 0 && (
                                <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.55)' }}>
                                    <strong style={{ color: '#fff' }}>{fmt(totalMembers)}</strong> citizens organizing
                                </span>
                            )}
                            <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.55)' }}>
                                <strong style={{ color: '#fff' }}>{nationalGroups.length}</strong> national group{nationalGroups.length !== 1 ? 's' : ''}
                            </span>
                            {urgency && (
                                <span style={{
                                    fontFamily: "'DM Mono', monospace", fontSize: '8.5px', letterSpacing: '0.1em',
                                    textTransform: 'uppercase' as const, background: 'rgba(184,48,37,0.22)', color: '#E05C50',
                                    padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(184,48,37,0.35)',
                                }}>{urgency}</span>
                            )}
                        </div>
                    </div>

                    {/* How it works */}
                    <div style={{ padding: '14px 14px 0' }}>
                        <HowItWorksBanner />
                    </div>

                    {/* National groups */}
                    <div style={{ padding: '14px 14px 0' }}>
                        <SectionHeader label="National Groups competing" count={nationalGroups.length} />
                        {nationalGroups.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--iux-dust)', fontSize: '13px' }}>
                                No national groups yet.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                                {sortByMemberCount(nationalGroups).map((g, idx) => (
                                    <NationalGroupCard
                                        key={g.id}
                                        group={g}
                                        totalMembers={totalMembers}
                                        isUserGroup={userMemberPartyId === g.id}
                                        rank={idx + 1}
                                        onOpen={() => updateRouteState({ selectedGroupId: g.id, activeTab: 'national' }, 'push')}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Start new national group CTA */}
                        <StartGroupCTA
                            label={foundingGroup ? 'Start an Alternative National Group' : 'Start a New National Group'}
                            sub={foundingGroup
                                ? 'Offer a different approach while the founding group stays neutral'
                                : 'Propose a different approach and build a competing national group'}
                            href={foundingGroup
                                ? `/party/create?fork_of=${foundingGroup.id}`
                                : `/party/create?location_scope=national&issue_id=${issueId}&issue=${encodeURIComponent(issueName)}`}
                        />
                    </div>
                </div>
            ) : (
                // ── GROUP DETAIL VIEW ────────────────────────────────────────────
                <div style={{ paddingBottom: '24px' }}>
                    <GroupDetailView
                        nationalGroup={selectedGroup}
                        allNationalGroups={nationalGroups}
                        totalIssueMembers={totalMembers}
                        userMemberPartyId={userMemberPartyId}
                        userStateName={userStateName}
                        userDistrictName={userDistrictName}
                        userVillageName={userVillageName}
                        issueCategoryId={issueCategoryId}
                        issueName={issueName}
                        issueId={issueId}
                        activeTab={routeState.activeTab}
                        onBack={() => updateRouteState({ selectedGroupId: null, activeTab: fallbackTab }, 'push')}
                        onTabChange={(tab) => updateRouteState({ selectedGroupId: selectedGroup.id, activeTab: tab }, 'replace')}
                    />
                </div>
            )}
        </div>
    );
}
