'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Party, LocationScope } from '@/types/database';
import { getLocationScopeConfig } from '@/types/database';

export type HierarchyNode = {
    party_id: string;
    issue_text: string;
    node_type: 'community' | 'sub_community' | 'group';
    location_scope: LocationScope;
    member_count: number;
    aggregated_member_count: number;
    level: 1 | 2 | 3 | 4;
    is_current: boolean;
    children: HierarchyNode[];
};

type HierarchyViewMode = 'simple' | 'detailed' | 'graphical';

const NODE_TYPE_CONFIG = {
    community: { icon: '🌐', label: 'Community' },
    sub_community: { icon: '📁', label: 'Sub-community' },
    group: { icon: '👥', label: 'Group' },
} as const;

type PartyHierarchyTreeProps = {
    partyId: string;
    initialHierarchy?: HierarchyNode | null;
};

export function PartyHierarchyTree({ partyId, initialHierarchy }: PartyHierarchyTreeProps) {
    const [hierarchy, setHierarchy] = useState<HierarchyNode | null>(initialHierarchy || null);
    const [isLoading, setIsLoading] = useState(!initialHierarchy);
    const [isExpanded, setIsExpanded] = useState(true);
    const [viewMode, setViewMode] = useState<HierarchyViewMode>('simple');
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

    const initializeExpandedNodes = (root: HierarchyNode): Record<string, boolean> => {
        const map: Record<string, boolean> = {};

        const walk = (node: HierarchyNode, parentExpanded: boolean) => {
            const shouldExpand = node.is_current || node.level <= 2 || parentExpanded;
            map[node.party_id] = shouldExpand;
            node.children.forEach((child) => walk(child, node.is_current || node.level <= 2));
        };

        walk(root, true);
        return map;
    };

    useEffect(() => {
        if (initialHierarchy) return;

        let isMounted = true;
        const loadHierarchy = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/parties/${partyId}/hierarchy`, {
                    cache: 'no-store',
                });
                if (!isMounted) return;
                if (res.ok) {
                    const data = await res.json();
                    setHierarchy(data.hierarchy);
                    if (data.hierarchy) {
                        setExpandedNodes(initializeExpandedNodes(data.hierarchy));
                    }
                }
            } catch {
                // Ignore errors
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void loadHierarchy();
        return () => {
            isMounted = false;
        };
    }, [partyId, initialHierarchy]);

    useEffect(() => {
        if (!initialHierarchy) return;
        setExpandedNodes(initializeExpandedNodes(initialHierarchy));
    }, [initialHierarchy]);

    if (isLoading) {
        return (
            <div className="org-tree-container animate-pulse">
                <div className="h-24 bg-bg-tertiary rounded-xl"></div>
            </div>
        );
    }

    if (!hierarchy) {
        return null;
    }

    // Check if there's any hierarchy to show (more than just the current party)
    const hasHierarchy = hierarchy.children.length > 0 || !hierarchy.is_current;

    if (!hasHierarchy) {
        return null;
    }

    return (
        <div className="org-tree-section">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-text-secondary flex items-center gap-2">
                    <span>🏛️</span>
                    Group hierarchy
                </h3>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="btn btn-secondary btn-sm"
                >
                    {isExpanded ? '▲ Collapse' : '▼ Expand'}
                </button>
            </div>

            {isExpanded && (
                <div className="space-y-3">
                    <div className="rounded-xl border border-border-primary bg-bg-card p-3">
                        <p className="text-xs text-text-muted mb-3">
                            Start with a simple folder view. Open detailed or graphical view anytime.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setViewMode('simple')}
                                className={`btn btn-sm ${viewMode === 'simple' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                📁 Simple
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('detailed')}
                                className={`btn btn-sm ${viewMode === 'detailed' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                🧾 Detailed
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('graphical')}
                                className={`btn btn-sm ${viewMode === 'graphical' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                🌳 Graphical
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border-primary bg-bg-card p-3 sm:p-4">
                        {viewMode === 'simple' && (
                            <SimpleHierarchyNode
                                node={hierarchy}
                                expandedNodes={expandedNodes}
                                onToggle={(nodeId) => {
                                    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
                                }}
                            />
                        )}

                        {viewMode === 'detailed' && (
                            <DetailedHierarchyNode
                                node={hierarchy}
                                expandedNodes={expandedNodes}
                                onToggle={(nodeId) => {
                                    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
                                }}
                            />
                        )}

                        {viewMode === 'graphical' && (
                            <div className="org-tree-container overflow-x-auto pb-4">
                                <div className="org-tree min-w-max">
                                    <GraphicalTreeNode node={hierarchy} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

type TreeNodeProps = {
    node: HierarchyNode;
};

type ExpandableHierarchyNodeProps = {
    node: HierarchyNode;
    expandedNodes: Record<string, boolean>;
    onToggle: (nodeId: string) => void;
    depth?: number;
};

function SimpleHierarchyNode({ node, expandedNodes, onToggle, depth = 0 }: ExpandableHierarchyNodeProps) {
    const hasChildren = node.children.length > 0;
    const isExpanded = !!expandedNodes[node.party_id];
    const folderIcon = hasChildren ? (isExpanded ? '📂' : '📁') : '📄';

    return (
        <div>
            <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${depth * 16}px` }}>
                {hasChildren ? (
                    <button
                        type="button"
                        onClick={() => onToggle(node.party_id)}
                        className="w-5 h-5 rounded border border-border-primary text-xs text-text-muted hover:text-text-primary hover:border-border-secondary"
                        aria-label={isExpanded ? 'Collapse node' : 'Expand node'}
                    >
                        {isExpanded ? '−' : '+'}
                    </button>
                ) : (
                    <span className="w-5" />
                )}

                <span>{folderIcon}</span>
                <Link
                    href={`/party/${node.party_id}`}
                    className={`text-sm hover:underline ${node.is_current ? 'text-primary font-semibold' : 'text-text-primary'}`}
                >
                    {node.issue_text.length > 70 ? `${node.issue_text.slice(0, 70)}...` : node.issue_text}
                </Link>
                {node.is_current && (
                    <span className="badge text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary">
                        You are here
                    </span>
                )}
            </div>

            {hasChildren && isExpanded && (
                <div className="border-l border-border-primary/60 ml-2">
                    {node.children.map((child) => (
                        <SimpleHierarchyNode
                            key={child.party_id}
                            node={child}
                            expandedNodes={expandedNodes}
                            onToggle={onToggle}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function DetailedHierarchyNode({ node, expandedNodes, onToggle, depth = 0 }: ExpandableHierarchyNodeProps) {
    const hasChildren = node.children.length > 0;
    const isExpanded = !!expandedNodes[node.party_id];
    const nodeConfig = NODE_TYPE_CONFIG[node.node_type] || NODE_TYPE_CONFIG.group;
    const scopeConfig = getLocationScopeConfig(node.location_scope || 'district');

    return (
        <div className="space-y-2">
            <div
                className={`rounded-lg border p-3 ${node.is_current ? 'border-primary/40 bg-primary/5' : 'border-border-primary bg-bg-secondary/30'}`}
                style={{ marginLeft: `${depth * 16}px` }}
            >
                <div className="flex flex-wrap items-center gap-2">
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => onToggle(node.party_id)}
                            className="w-5 h-5 rounded border border-border-primary text-xs text-text-muted hover:text-text-primary hover:border-border-secondary"
                            aria-label={isExpanded ? 'Collapse node' : 'Expand node'}
                        >
                            {isExpanded ? '−' : '+'}
                        </button>
                    ) : (
                        <span className="w-5" />
                    )}

                    <span className="text-sm" title={nodeConfig.label}>{nodeConfig.icon}</span>
                    <Link
                        href={`/party/${node.party_id}`}
                        className={`text-sm hover:underline ${node.is_current ? 'text-primary font-semibold' : 'text-text-primary'}`}
                    >
                        {node.issue_text.length > 80 ? `${node.issue_text.slice(0, 80)}...` : node.issue_text}
                    </Link>
                    {node.is_current && <span className="badge badge-level-1 text-[10px] px-1.5 py-0.5">Current</span>}
                </div>

                <div className="mt-2 pl-7 flex flex-wrap gap-2 text-xs text-text-muted">
                    <span className="badge text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary">
                        {scopeConfig.icon} {scopeConfig.label}
                    </span>
                    <span className="badge text-[10px] px-1.5 py-0.5">
                        Level {node.level}
                    </span>
                    <span className="badge text-[10px] px-1.5 py-0.5">
                        👥 {node.aggregated_member_count}
                    </span>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="space-y-2">
                    {node.children.map((child) => (
                        <DetailedHierarchyNode
                            key={child.party_id}
                            node={child}
                            expandedNodes={expandedNodes}
                            onToggle={onToggle}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function GraphicalTreeNode({ node }: TreeNodeProps) {
    const levelLabels: Record<number, string> = {
        1: 'L1',
        2: 'L2',
        3: 'L3',
        4: 'L4',
    };

    const nodeConfig = NODE_TYPE_CONFIG[node.node_type] || NODE_TYPE_CONFIG.group;
    const scopeConfig = getLocationScopeConfig(node.location_scope || 'district');

    return (
        <div className="org-tree-branch">
            {/* Node */}
            <div className="org-tree-node-wrapper">
                <Link
                    href={`/party/${node.party_id}`}
                    className={`org-tree-node ${node.is_current ? 'org-tree-node--current' : ''}`}
                >
                    <div className="org-tree-node-header">
                        <span className="text-sm" title={nodeConfig.label}>{nodeConfig.icon}</span>
                        <span className={`badge badge-level-${node.level} text-[10px] px-1.5 py-0.5`}>
                            {levelLabels[node.level]}
                        </span>
                        <span className="badge text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary" title={scopeConfig.label}>
                            {scopeConfig.icon} {scopeConfig.label}
                        </span>
                        <span
                            className="text-xs text-text-muted"
                            title={
                                node.aggregated_member_count !== node.member_count
                                    ? `${node.member_count} direct + ${node.aggregated_member_count - node.member_count} from sub-groups`
                                    : `${node.aggregated_member_count} direct members`
                            }
                        >
                            👥 {node.aggregated_member_count}
                            {node.aggregated_member_count !== node.member_count && (
                                <span className="text-[10px] ml-1 opacity-70">
                                    ({node.member_count} + {node.aggregated_member_count - node.member_count})
                                </span>
                            )}
                        </span>
                    </div>
                    <p className="org-tree-node-text">
                        {node.issue_text.length > 60
                            ? node.issue_text.slice(0, 60) + '...'
                            : node.issue_text}
                    </p>
                    {node.is_current && (
                        <div className="org-tree-node-badge">
                            ← You are here
                        </div>
                    )}
                </Link>
            </div>

            {/* Children */}
            {node.children.length > 0 && (
                <div className="org-tree-children">
                    {/* Vertical connector from parent */}
                    <div className="org-tree-connector-vertical"></div>

                    {/* Horizontal connector bar */}
                    {node.children.length > 1 && (
                        <div className="org-tree-connector-horizontal"></div>
                    )}

                    {/* Child nodes */}
                    <div className="org-tree-children-nodes">
                        {node.children.map((child) => (
                            <div key={child.party_id} className="org-tree-child">
                                {/* Vertical connector to child */}
                                <div className="org-tree-connector-down"></div>
                                <GraphicalTreeNode node={child} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Compact inline hierarchy display for party cards
type InlineHierarchyProps = {
    parentParty: Party | null;
    childCount: number;
};

export function InlineHierarchy({ parentParty, childCount }: InlineHierarchyProps) {
    if (!parentParty && childCount === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-2 text-xs text-text-muted">
            {parentParty && (
                <span className="flex items-center gap-1">
                    <span>↑</span>
                    <Link
                        href={`/party/${parentParty.id}`}
                        className="text-primary hover:underline"
                    >
                        Part of parent community
                    </Link>
                </span>
            )}
            {childCount > 0 && (
                <span className="flex items-center gap-1">
                    <span>↓</span>
                    <span>{childCount} connected {childCount === 1 ? 'group' : 'groups'}</span>
                </span>
            )}
        </div>
    );
}
