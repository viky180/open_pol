import { NetworkGraph } from '@/components/NetworkGraph';

export const dynamic = 'force-dynamic';

export default function NetworkPage() {
    return (
        <main className="min-h-screen bg-bg-primary">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-text-primary mb-2">
                        🌐 Political Network
                    </h1>
                    <p className="text-text-secondary">
                        Visualize how parties are connected through alliances, support, and merges.
                    </p>
                </div>

                {/* Legend */}
                <div className="card mb-6">
                    <div className="flex flex-wrap items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-0.5 bg-blue-500"></div>
                            <span className="text-text-muted">Alliance</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-0.5 bg-green-500" style={{ borderTop: '2px dashed #22c55e' }}></div>
                            <span className="text-text-muted">Support</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-0.5 bg-purple-500" style={{ borderTop: '2px dotted #a855f7' }}></div>
                            <span className="text-text-muted">Merge</span>
                        </div>
                        <div className="border-l border-border-primary pl-6 flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                                <span className="text-text-muted">L1</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                                <span className="text-text-muted">L2</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                                <span className="text-text-muted">L3</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                                <span className="text-text-muted">L4</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Graph Container */}
                <div className="card p-0 overflow-hidden" style={{ height: '70vh' }}>
                    <NetworkGraph />
                </div>

                <p className="text-xs text-text-muted mt-4 text-center">
                    Click on a node to view party details. Drag to explore the network.
                </p>
            </div>
        </main>
    );
}
