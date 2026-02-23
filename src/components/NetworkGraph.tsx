'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { NetworkGraphData, GraphNode } from '@/app/api/network-graph/route';

type NodePosition = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    node: GraphNode;
};

export function NetworkGraph() {
    const [data, setData] = useState<NetworkGraphData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const positionsRef = useRef<Map<string, NodePosition>>(new Map());
    const animationRef = useRef<number | null>(null);
    const router = useRouter();

    const draw = useCallback((graphData: NetworkGraphData) => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = container.clientWidth;
        const height = container.clientHeight;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        const positions = positionsRef.current;

        // Draw links
        graphData.links.forEach(link => {
            const source = positions.get(link.source);
            const target = positions.get(link.target);
            if (!source || !target) return;

            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);

            if (link.type === 'support') {
                ctx.strokeStyle = link.supportType === 'explicit' ? '#22c55e' : '#86efac';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 5]);
            } else if (link.type === 'hierarchy') {
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 2;
                ctx.setLineDash([2, 4]);
            }

            ctx.stroke();
            ctx.setLineDash([]);

            // Draw arrow for support links
            if (link.type === 'support') {
                const angle = Math.atan2(target.y - source.y, target.x - source.x);
                const arrowLen = 10;
                const midX = (source.x + target.x) / 2;
                const midY = (source.y + target.y) / 2;

                ctx.beginPath();
                ctx.moveTo(midX, midY);
                ctx.lineTo(
                    midX - arrowLen * Math.cos(angle - Math.PI / 6),
                    midY - arrowLen * Math.sin(angle - Math.PI / 6)
                );
                ctx.moveTo(midX, midY);
                ctx.lineTo(
                    midX - arrowLen * Math.cos(angle + Math.PI / 6),
                    midY - arrowLen * Math.sin(angle + Math.PI / 6)
                );
                ctx.strokeStyle = link.supportType === 'explicit' ? '#22c55e' : '#86efac';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        });

        // Draw nodes
        const levelColors: Record<number, string> = {
            1: '#6b7280',
            2: '#3b82f6',
            3: '#f59e0b',
            4: '#ef4444',
        };

        positions.forEach(pos => {
            const radius = 8 + pos.node.memberCount * 0.5;
            const clampedRadius = Math.min(radius, 30);

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, clampedRadius, 0, Math.PI * 2);
            ctx.fillStyle = levelColors[pos.node.level] || '#6b7280';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw level label
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`L${pos.node.level}`, pos.x, pos.y);
        });
    }, []);

    const startSimulation = useCallback((graphData: NetworkGraphData) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        const simulate = () => {
            const positions = positionsRef.current;
            const container = containerRef.current;
            if (!container || positions.size === 0) return;

            const width = container.clientWidth;
            const height = container.clientHeight;
            const centerX = width / 2;
            const centerY = height / 2;

            // Apply forces
            positions.forEach((pos1, id1) => {
                // Center gravity
                pos1.vx += (centerX - pos1.x) * 0.001;
                pos1.vy += (centerY - pos1.y) * 0.001;

                // Repulsion from other nodes
                positions.forEach((pos2, id2) => {
                    if (id1 === id2) return;
                    const dx = pos1.x - pos2.x;
                    const dy = pos1.y - pos2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = 5000 / (dist * dist);
                    pos1.vx += (dx / dist) * force;
                    pos1.vy += (dy / dist) * force;
                });
            });

            // Apply link forces
            graphData.links.forEach(link => {
                const source = positions.get(link.source);
                const target = positions.get(link.target);
                if (!source || !target) return;

                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const targetDist = 150;
                const force = (dist - targetDist) * 0.01;

                source.vx += (dx / dist) * force;
                source.vy += (dy / dist) * force;
                target.vx -= (dx / dist) * force;
                target.vy -= (dy / dist) * force;
            });

            // Update positions with damping
            positions.forEach(pos => {
                pos.vx *= 0.9;
                pos.vy *= 0.9;
                pos.x += pos.vx;
                pos.y += pos.vy;

                // Keep within bounds
                const padding = 50;
                pos.x = Math.max(padding, Math.min(width - padding, pos.x));
                pos.y = Math.max(padding, Math.min(height - padding, pos.y));
            });

            draw(graphData);
            animationRef.current = requestAnimationFrame(simulate);
        };

        simulate();
    }, [draw]);

    const initializePositions = useCallback((nodes: GraphNode[], graphData: NetworkGraphData) => {
        const container = containerRef.current;
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;
        const positions = new Map<string, NodePosition>();

        nodes.forEach((node, i) => {
            const angle = (2 * Math.PI * i) / nodes.length;
            const radius = Math.min(width, height) * 0.35;
            positions.set(node.id, {
                x: width / 2 + Math.cos(angle) * radius,
                y: height / 2 + Math.sin(angle) * radius,
                vx: 0,
                vy: 0,
                node,
            });
        });

        positionsRef.current = positions;
        startSimulation(graphData);
    }, [startSimulation]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await fetch('/api/network-graph');
                if (!res.ok) throw new Error('Failed to load network data');
                const graphData: NetworkGraphData = await res.json();
                setData(graphData);
                initializePositions(graphData.nodes, graphData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [initializePositions]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePos({ x: e.clientX, y: e.clientY });

        // Find hovered node
        let found: GraphNode | null = null;
        positionsRef.current.forEach(pos => {
            const dx = x - pos.x;
            const dy = y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const radius = Math.min(8 + pos.node.memberCount * 0.5, 30);
            if (dist < radius) {
                found = pos.node;
            }
        });
        setHoveredNode(found);
    };

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        positionsRef.current.forEach(pos => {
            const dx = x - pos.x;
            const dy = y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const radius = Math.min(8 + pos.node.memberCount * 0.5, 30);
            if (dist < radius) {
                router.push(`/party/${pos.node.id}`);
            }
        });
    };

    if (isLoading) {
        return (
            <div className="network-graph-container animate-pulse">
                <div className="flex items-center justify-center h-full">
                    <p className="text-text-muted">Loading network...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="network-graph-container">
                <div className="flex items-center justify-center h-full">
                    <p className="text-red-500">{error}</p>
                </div>
            </div>
        );
    }

    if (!data || data.nodes.length === 0) {
        return (
            <div className="network-graph-container">
                <div className="flex items-center justify-center h-full">
                    <p className="text-text-muted">No parties found</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="network-graph-container">
            <canvas
                ref={canvasRef}
                className="network-graph-canvas"
                onMouseMove={handleMouseMove}
                onClick={handleClick}
                style={{ cursor: hoveredNode ? 'pointer' : 'default' }}
            />
            {hoveredNode && (
                <div
                    className="network-tooltip"
                    style={{
                        left: mousePos.x + 15,
                        top: mousePos.y + 15,
                    }}
                >
                    <p className="font-semibold">{hoveredNode.label}</p>
                    <p className="text-xs text-text-muted">
                        Level {hoveredNode.level} • {hoveredNode.memberCount} members
                    </p>
                    <p className="text-xs text-primary mt-1">Click to view</p>
                </div>
            )}
        </div>
    );
}
