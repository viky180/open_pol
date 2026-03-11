'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Level = 'state' | 'district' | 'block' | 'panchayat' | 'village';

type Winner = 'S1' | 'S2' | 'tie';

interface SimNode {
    id: string;
    name: string;
    level: Level;
    /** Breadcrumb path from state down to this node (inclusive) */
    path: string[];
    /** Total population of this node (sum of village populations below it) */
    population: number;
    /** Active members = population × participation% */
    activeMembers: number;
    /** S1 active members */
    s1: number;
    /** S2 active members */
    s2: number;
    winner: Winner;
    children: SimNode[];
}

interface SimConfig {
    population: number;
    participationPct: number;
    districtCount: number;
    blocksPerDistrict: number;
    panchayatsPerBlock: number;
    villagesPerPanchayat: number;
    /** S1 share at state level in % (0–100). S2 = 100 – s1StatePct */
    s1StatePct: number;
    /** Numeric seed for deterministic PRNG */
    seed: number;
}

const DEFAULTS: SimConfig = {
    population: 100_000,
    participationPct: 20,
    districtCount: 4,
    blocksPerDistrict: 5,
    panchayatsPerBlock: 5,
    villagesPerPanchayat: 5,
    s1StatePct: 57.5,
    seed: 42,
};

// ─────────────────────────────────────────────────────────────────────────────
// Seeded PRNG — mulberry32 algorithm; returns values in [0, 1)
// ─────────────────────────────────────────────────────────────────────────────
function makePrng(seed: number): () => number {
    let s = seed >>> 0; // ensure unsigned 32-bit int
    return function () {
        s |= 0;
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation core
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine the winner for a single node based on its S1 / S2 counts.
 */
function computeWinner(s1: number, s2: number): Winner {
    if (s1 > s2) return 'S1';
    if (s2 > s1) return 'S2';
    return 'tie';
}

/**
 * Build the full hierarchy from config.
 * Villages are created first with deterministic per-district bias;
 * parent nodes are then aggregated bottom-up.
 */
function buildHierarchy(cfg: SimConfig): SimNode {
    const rand = makePrng(cfg.seed);

    // Total number of villages in the simulation
    const totalVillages =
        cfg.districtCount *
        cfg.blocksPerDistrict *
        cfg.panchayatsPerBlock *
        cfg.villagesPerPanchayat;

    // Each village gets an even share of the total population
    const villagePopulation = Math.round(cfg.population / totalVillages);

    // Helper: determine S1 split for a single village given a local bias.
    // Applies ±12% noise so individual villages can flip even within a leaning district.
    function villageS1Share(localBias: number): number {
        const noise = (rand() - 0.5) * 24; // ±12 % village-level noise
        const pct = Math.min(100, Math.max(0, localBias + noise));
        return pct / 100;
    }

    /**
     * Recursively create a leaf village node.
     */
    function makeVillage(
        districtIdx: number,
        blockIdx: number,
        panchayatIdx: number,
        villageIdx: number,
        path: string[],
        districtBias: number,
    ): SimNode {
        const id = `V${districtIdx + 1}.${blockIdx + 1}.${panchayatIdx + 1}.${villageIdx + 1}`;
        const name = `Village ${villageIdx + 1}`;
        const activeMembers = Math.round(
            villagePopulation * (cfg.participationPct / 100),
        );
        const s1Ratio = villageS1Share(districtBias);
        const s1 = Math.round(activeMembers * s1Ratio);
        const s2 = activeMembers - s1;
        return {
            id,
            name,
            level: 'village',
            path: [...path, name],
            population: villagePopulation,
            activeMembers,
            s1,
            s2,
            winner: computeWinner(s1, s2),
            children: [],
        };
    }

    /**
     * Aggregate a parent node by summing all leaf descendants.
     * population, activeMembers, s1, s2 are sums of children; winner is re-derived.
     */
    function aggregateFromChildren(
        node: Omit<SimNode, 'population' | 'activeMembers' | 's1' | 's2' | 'winner'> & {
            children: SimNode[];
        },
    ): SimNode {
        const population = node.children.reduce((sum, c) => sum + c.population, 0);
        const activeMembers = node.children.reduce(
            (sum, c) => sum + c.activeMembers,
            0,
        );
        const s1 = node.children.reduce((sum, c) => sum + c.s1, 0);
        const s2 = activeMembers - s1;
        return {
            ...node,
            population,
            activeMembers,
            s1,
            s2,
            winner: computeWinner(s1, s2),
        };
    }

    // Build from the bottom up: villages → panchayats → blocks → districts → state

    const districts: SimNode[] = Array.from(
        { length: cfg.districtCount },
        (_, di) => {
            const districtName = `District ${di + 1}`;
            const districtPath = ['Madhya Pradesh', districtName];

            // Per-district bias: ±22% swing around the state tilt.
            // This ensures the range crosses 50%, so some districts genuinely lean S2
            // even when the state default is 57.5%.
            const districtBias = cfg.s1StatePct + (rand() - 0.5) * 44;

            const blocks: SimNode[] = Array.from(
                { length: cfg.blocksPerDistrict },
                (_, bi) => {
                    const blockName = `Block ${bi + 1}`;
                    const blockPath = [...districtPath, blockName];

                    // Per-block secondary bias: ±6% on top of the district bias.
                    // Allows blocks within the same district to differ meaningfully.
                    const blockBias = districtBias + (rand() - 0.5) * 12;

                    const panchayats: SimNode[] = Array.from(
                        { length: cfg.panchayatsPerBlock },
                        (_, pi) => {
                            const panchayatName = `Panchayat ${pi + 1}`;
                            const panchayatPath = [...blockPath, panchayatName];

                            const villages: SimNode[] = Array.from(
                                { length: cfg.villagesPerPanchayat },
                                (_, vi) =>
                                    makeVillage(
                                        di,
                                        bi,
                                        pi,
                                        vi,
                                        panchayatPath,
                                        blockBias, // pass block-level bias to village
                                    ),
                            );

                            return aggregateFromChildren({
                                id: `P${di + 1}.${bi + 1}.${pi + 1}`,
                                name: panchayatName,
                                level: 'panchayat',
                                path: panchayatPath,
                                children: villages,
                            });
                        },
                    );

                    return aggregateFromChildren({
                        id: `B${di + 1}.${bi + 1}`,
                        name: blockName,
                        level: 'block',
                        path: blockPath,
                        children: panchayats,
                    });
                },
            );

            return aggregateFromChildren({
                id: `D${di + 1}`,
                name: districtName,
                level: 'district',
                path: districtPath,
                children: blocks,
            });
        },
    );

    return aggregateFromChildren({
        id: 'STATE',
        name: 'Madhya Pradesh',
        level: 'state',
        path: ['Madhya Pradesh'],
        children: districts,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Fake leader name derived deterministically from node id + winner
// ─────────────────────────────────────────────────────────────────────────────
const S1_NAMES = [
    'Arjun Sharma', 'Kavita Singh', 'Ramesh Patel', 'Sunita Verma',
    'Deepak Rao', 'Meera Tiwari', 'Sanjay Gupta', 'Pooja Mishra',
    'Vikas Dubey', 'Anita Joshi',
];
const S2_NAMES = [
    'Rahul Mehta', 'Priya Nair', 'Suresh Kumar', 'Nandini Yadav',
    'Kiran Bose', 'Amit Choudhary', 'Lata Pandey', 'Mohan Das',
    'Rekha Iyer', 'Santosh Pillai',
];

/** Pick a fake leader name deterministically from the node id hash */
function leaderName(nodeId: string, winner: Winner): string {
    if (winner === 'tie') return 'No leader (tied)';
    const pool = winner === 'S1' ? S1_NAMES : S2_NAMES;
    // Simple string hash so the same node always gets the same name
    let h = 0;
    for (let i = 0; i < nodeId.length; i++) {
        h = (h * 31 + nodeId.charCodeAt(i)) >>> 0;
    }
    return pool[h % pool.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree Node component (recursive)
// ─────────────────────────────────────────────────────────────────────────────

interface TreeNodeProps {
    node: SimNode;
    selectedId: string | null;
    expandedIds: Set<string>;
    onSelect: (node: SimNode) => void;
    onToggle: (id: string) => void;
    depth: number;
}

function TreeNodeRow({
    node,
    selectedId,
    expandedIds,
    onSelect,
    onToggle,
    depth,
}: TreeNodeProps) {
    const isSelected = selectedId === node.id;
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;

    const winnerCls =
        node.winner === 'S1'
            ? 'bg-primary/10 text-primary border-primary/20'
            : node.winner === 'S2'
                ? 'bg-accent/10 text-accent border-accent/20'
                : 'bg-warning/10 text-warning border-warning/20';

    return (
        <div style={{ paddingLeft: depth * 12 }}>
            <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors mb-1 ${isSelected
                    ? 'bg-primary/5 border-primary ring-1 ring-primary/20'
                    : 'bg-bg-secondary border-border-primary hover:border-primary/40 hover:bg-bg-hover'
                    }`}
                onClick={() => onSelect(node)}
            >
                {/* Expand/collapse toggle */}
                {hasChildren ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle(node.id);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-text-primary flex-shrink-0 text-[11px]"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                        {isExpanded ? '▾' : '▸'}
                    </button>
                ) : (
                    <span className="w-5 flex-shrink-0" />
                )}

                {/* Node name */}
                <span className="flex-1 text-sm font-medium text-text-primary truncate">
                    {node.name}
                </span>

                {/* Compact stats */}
                <span className="hidden sm:flex items-center gap-2 text-xs text-text-muted flex-shrink-0">
                    <span title="Active members">{node.activeMembers.toLocaleString('en-IN')}</span>
                    <span className="text-primary font-semibold">{node.s1.toLocaleString('en-IN')}</span>
                    <span className="text-accent font-semibold">{node.s2.toLocaleString('en-IN')}</span>
                </span>

                {/* Winner badge */}
                <span
                    className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0 ${winnerCls}`}
                >
                    {node.winner}
                </span>
            </div>

            {/* Recursively render children if expanded */}
            {hasChildren && isExpanded && (
                <div>
                    {node.children.map((child) => (
                        <TreeNodeRow
                            key={child.id}
                            node={child}
                            selectedId={selectedId}
                            expandedIds={expandedIds}
                            onSelect={onSelect}
                            onToggle={onToggle}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SimulationPage() {
    // ── Config state (what the user is editing in the controls) ──────────────
    const [draftConfig, setDraftConfig] = useState<SimConfig>(DEFAULTS);

    // ── Committed config — simulation only re-runs when user clicks "Run" ───
    const [activeConfig, setActiveConfig] = useState<SimConfig>(DEFAULTS);

    // ── Simulation result ─────────────────────────────────────────────────────
    const stateNode = useMemo(() => buildHierarchy(activeConfig), [activeConfig]);

    // ── Tree UI state ─────────────────────────────────────────────────────────
    const [expandedIds, setExpandedIds] = useState<Set<string>>(
        () => new Set(['STATE']), // start with state expanded
    );
    // Keep selected node in sync when simulation re-runs
    const [selectedId, setSelectedId] = useState<string>('STATE');

    // Re-derive selected node after simulation re-run by walking the new tree
    const resolvedSelected = useMemo(() => {
        function findById(node: SimNode, id: string): SimNode | null {
            if (node.id === id) return node;
            for (const child of node.children) {
                const found = findById(child, id);
                if (found) return found;
            }
            return null;
        }
        return findById(stateNode, selectedId) ?? stateNode;
    }, [stateNode, selectedId]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSelect = useCallback((node: SimNode) => {
        setSelectedId(node.id);
    }, []);

    const handleToggle = useCallback((id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleRunSimulation = useCallback(() => {
        setActiveConfig({ ...draftConfig });
        // Reset expanded state to show state root
        setExpandedIds(new Set(['STATE']));
        setSelectedId('STATE');
    }, [draftConfig]);

    const handleRandomize = useCallback(() => {
        const newSeed = Math.floor(Math.random() * 1_000_000);
        const next = { ...draftConfig, seed: newSeed };
        setDraftConfig(next);
        setActiveConfig(next);
        setExpandedIds(new Set(['STATE']));
        setSelectedId('STATE');
    }, [draftConfig]);

    const handleReset = useCallback(() => {
        setDraftConfig(DEFAULTS);
        setActiveConfig(DEFAULTS);
        setExpandedIds(new Set(['STATE']));
        setSelectedId('STATE');
    }, []);

    function setField<K extends keyof SimConfig>(key: K, raw: string) {
        const value = parseFloat(raw);
        if (!isNaN(value)) {
            setDraftConfig((prev) => ({ ...prev, [key]: value }));
        }
    }

    // ── Detail panel helpers ──────────────────────────────────────────────────
    const node = resolvedSelected;
    const total = node.activeMembers;
    const s1Pct = total > 0 ? ((node.s1 / total) * 100).toFixed(1) : '–';
    const s2Pct = total > 0 ? ((node.s2 / total) * 100).toFixed(1) : '–';

    const winnerBadge =
        node.winner === 'S1'
            ? 'bg-primary/10 text-primary border-primary/20'
            : node.winner === 'S2'
                ? 'bg-accent/10 text-accent border-accent/20'
                : 'bg-warning/10 text-warning border-warning/20';

    const totalVillages =
        activeConfig.districtCount *
        activeConfig.blocksPerDistrict *
        activeConfig.panchayatsPerBlock *
        activeConfig.villagesPerPanchayat;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <section className="brand-surface min-h-screen">
            <div className="container mx-auto max-w-[1400px] px-4 py-6 sm:py-8">

                {/* Top bar */}
                <div className="brand-panel p-4 sm:p-5 mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/demo"
                                className="text-sm text-text-muted hover:text-primary transition-colors"
                            >
                                ← Demo 1
                            </Link>
                            <span className="text-border-secondary">|</span>
                            <Link
                                href="/demo-3"
                                className="text-sm text-text-muted hover:text-primary transition-colors"
                            >
                                Demo 3 →
                            </Link>
                        </div>
                        <span className="brand-kicker">Open Politics Simulation</span>
                    </div>
                    <div className="mt-3">
                        <h1
                            className="text-2xl sm:text-3xl font-bold text-text-primary"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            S1 vs S2 — Hierarchy Simulation
                        </h1>
                        <p className="text-sm text-text-secondary mt-1">
                            Simulate political competition across{' '}
                            <strong>State → District → Block → Panchayat → Village</strong>.
                            Results are deterministic for a given seed.
                        </p>
                    </div>
                </div>

                {/* Summary stats bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {(
                        [
                            { label: 'Total Villages', value: totalVillages.toLocaleString('en-IN') },
                            { label: 'Population', value: activeConfig.population.toLocaleString('en-IN') },
                            {
                                label: 'Active Members',
                                value: stateNode.activeMembers.toLocaleString('en-IN'),
                            },
                            {
                                label: 'State Winner',
                                value: stateNode.winner,
                                highlight: true,
                                winner: stateNode.winner,
                            },
                        ] as Array<{
                            label: string;
                            value: string;
                            highlight?: boolean;
                            winner?: Winner;
                        }>
                    ).map((s) => (
                        <div key={s.label} className="stat-card">
                            <div className="stat-label">{s.label}</div>
                            <div
                                className={`stat-value mt-1 ${s.highlight
                                    ? s.winner === 'S1'
                                        ? 'text-primary'
                                        : s.winner === 'S2'
                                            ? 'text-accent'
                                            : 'text-warning'
                                    : 'text-text-primary'
                                    }`}
                            >
                                {s.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 3-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 items-start">

                    {/* ────── LEFT: Controls ──────────────────────────────────────────── */}
                    <div className="brand-panel p-4 sm:p-5 space-y-4">
                        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-[0.12em]">
                            Configuration
                        </h2>

                        {/* Numeric fields */}
                        {(
                            [
                                { key: 'population', label: 'Population', min: 1000, step: 1000 },
                                {
                                    key: 'participationPct',
                                    label: 'Participation %',
                                    min: 1,
                                    max: 100,
                                    step: 1,
                                },
                                {
                                    key: 'districtCount',
                                    label: 'Districts',
                                    min: 1,
                                    max: 30,
                                    step: 1,
                                },
                                {
                                    key: 'blocksPerDistrict',
                                    label: 'Blocks / District',
                                    min: 1,
                                    max: 20,
                                    step: 1,
                                },
                                {
                                    key: 'panchayatsPerBlock',
                                    label: 'Panchayats / Block',
                                    min: 1,
                                    max: 20,
                                    step: 1,
                                },
                                {
                                    key: 'villagesPerPanchayat',
                                    label: 'Villages / Panchayat',
                                    min: 1,
                                    max: 20,
                                    step: 1,
                                },
                                { key: 'seed', label: 'Seed', min: 0, step: 1 },
                            ] as Array<{
                                key: keyof SimConfig;
                                label: string;
                                min?: number;
                                max?: number;
                                step?: number;
                            }>
                        ).map(({ key, label, min, max, step }) => (
                            <div key={key} className="form-group !mb-0">
                                <label className="label" htmlFor={`cfg-${key}`}>
                                    {label}
                                </label>
                                <input
                                    id={`cfg-${key}`}
                                    type="number"
                                    className="input"
                                    value={draftConfig[key]}
                                    min={min}
                                    max={max}
                                    step={step}
                                    onChange={(e) => setField(key, e.target.value)}
                                />
                            </div>
                        ))}

                        {/* State tilt slider */}
                        <div className="form-group !mb-0">
                            <label className="label" htmlFor="cfg-tilt">
                                State Tilt
                            </label>
                            <div className="flex justify-between text-xs text-text-muted mb-1">
                                <span className="text-primary font-medium">
                                    S1 {draftConfig.s1StatePct.toFixed(1)}%
                                </span>
                                <span className="text-accent font-medium">
                                    S2 {(100 - draftConfig.s1StatePct).toFixed(1)}%
                                </span>
                            </div>
                            <input
                                id="cfg-tilt"
                                type="range"
                                min={0}
                                max={100}
                                step={0.5}
                                value={draftConfig.s1StatePct}
                                onChange={(e) => setField('s1StatePct', e.target.value)}
                                className="w-full accent-primary"
                            />
                            {/* Visual bar */}
                            <div className="mt-1 h-1.5 rounded-full overflow-hidden flex">
                                <div
                                    className="bg-primary transition-all duration-300"
                                    style={{ width: `${draftConfig.s1StatePct}%` }}
                                />
                                <div
                                    className="bg-accent transition-all duration-300"
                                    style={{ width: `${100 - draftConfig.s1StatePct}%` }}
                                />
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-border-primary">
                            <button
                                type="button"
                                className="btn btn-primary w-full"
                                onClick={handleRunSimulation}
                            >
                                ▶ Run Simulation
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary w-full"
                                onClick={handleRandomize}
                            >
                                🎲 Randomize
                            </button>
                            <button
                                type="button"
                                className="btn btn-ghost w-full"
                                onClick={handleReset}
                            >
                                ↺ Reset
                            </button>
                        </div>
                    </div>

                    {/* ────── CENTER: Tree ────────────────────────────────────────────── */}
                    <div className="brand-panel p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-[0.12em]">
                                Hierarchy Tree
                            </h2>
                            {/* Legend */}
                            <div className="flex items-center gap-3 text-xs">
                                <span className="text-text-muted">Active</span>
                                <span className="font-semibold text-primary">S1</span>
                                <span className="font-semibold text-accent">S2</span>
                            </div>
                        </div>

                        {/* Column headers (desktop) */}
                        <div className="hidden sm:flex items-center gap-2 px-3 mb-1 text-[10px] uppercase tracking-wide text-text-muted">
                            <span className="w-5 flex-shrink-0" />
                            <span className="flex-1">Node</span>
                            <span className="w-20 text-right">Active</span>
                            <span className="w-12 text-right">S1</span>
                            <span className="w-12 text-right">S2</span>
                            <span className="w-10 text-center">Win</span>
                        </div>

                        {/* Scrollable tree */}
                        <div className="max-h-[600px] overflow-y-auto pr-1">
                            <TreeNodeRow
                                node={stateNode}
                                selectedId={selectedId}
                                expandedIds={expandedIds}
                                onSelect={handleSelect}
                                onToggle={handleToggle}
                                depth={0}
                            />
                        </div>
                    </div>

                    {/* ────── RIGHT: Details ──────────────────────────────────────────── */}
                    <div className="space-y-3">

                        {/* Breadcrumb */}
                        <div className="brand-panel p-4">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
                                Selected Path
                            </p>
                            <nav className="flex flex-wrap items-center gap-1 text-sm">
                                {node.path.map((segment, i) => (
                                    <span key={i} className="flex items-center gap-1">
                                        {i > 0 && <span className="text-text-muted">›</span>}
                                        <span
                                            className={
                                                i === node.path.length - 1
                                                    ? 'font-semibold text-text-primary'
                                                    : 'text-text-muted'
                                            }
                                        >
                                            {segment}
                                        </span>
                                    </span>
                                ))}
                            </nav>
                        </div>

                        {/* Node stats */}
                        <div className="brand-panel p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-text-primary">{node.name}</h3>
                                <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${winnerBadge}`}
                                >
                                    {node.winner === 'tie' ? 'Tied' : `${node.winner} Wins`}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="qa-metric">
                                    <div className="qa-metric-value">{node.population.toLocaleString('en-IN')}</div>
                                    <div className="qa-metric-label">Population</div>
                                </div>
                                <div className="qa-metric">
                                    <div className="qa-metric-value">{node.activeMembers.toLocaleString('en-IN')}</div>
                                    <div className="qa-metric-label">Active</div>
                                </div>
                                <div className="qa-metric">
                                    <div className="qa-metric-value qa-metric-value--accent" style={{ color: 'var(--color-primary)' }}>
                                        {node.s1.toLocaleString('en-IN')}
                                    </div>
                                    <div className="qa-metric-label">S1 ({s1Pct}%)</div>
                                </div>
                                <div className="qa-metric">
                                    <div className="qa-metric-value" style={{ color: 'var(--color-accent)' }}>
                                        {node.s2.toLocaleString('en-IN')}
                                    </div>
                                    <div className="qa-metric-label">S2 ({s2Pct}%)</div>
                                </div>
                            </div>

                            {/* S1 vs S2 bar */}
                            {total > 0 && (
                                <div>
                                    <div className="h-2 rounded-full overflow-hidden flex">
                                        <div
                                            className="bg-primary transition-all duration-500"
                                            style={{ width: `${(node.s1 / total) * 100}%` }}
                                        />
                                        <div
                                            className="bg-accent transition-all duration-500"
                                            style={{ width: `${(node.s2 / total) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-text-muted mt-1">
                                        <span>S1</span>
                                        <span>S2</span>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-text-muted">
                                Level: <span className="font-medium text-text-secondary capitalize">{node.level}</span>
                                {node.children.length > 0 && (
                                    <> · {node.children.length} child {node.level === 'district' ? 'blocks' : node.level === 'block' ? 'panchayats' : node.level === 'panchayat' ? 'villages' : 'districts'}</>
                                )}
                            </p>
                        </div>

                        {/* Leader card */}
                        <div className="brand-panel p-4">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted mb-3">
                                Constituency Leader
                            </p>
                            <div className="flex items-center gap-3">
                                {/* Avatar placeholder derived from leader name */}
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${node.winner === 'S1'
                                        ? 'bg-primary'
                                        : node.winner === 'S2'
                                            ? 'bg-accent'
                                            : 'bg-border-secondary'
                                        }`}
                                >
                                    {leaderName(node.id, node.winner)
                                        .split(' ')
                                        .slice(0, 2)
                                        .map((w) => w[0])
                                        .join('')}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-semibold text-text-primary text-sm truncate">
                                        {leaderName(node.id, node.winner)}
                                    </div>
                                    <div className="text-xs text-text-muted">
                                        {node.winner !== 'tie' ? `${node.winner} · ` : ''}
                                        {node.name}
                                    </div>
                                </div>
                            </div>
                            <p className="mt-3 text-[10px] text-text-muted italic">
                                * Simulated leader — determined by node id hash.
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}
