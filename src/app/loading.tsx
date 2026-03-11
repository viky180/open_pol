export default function Loading() {
    return (
        <div className="min-h-screen">
            <div className="border-b border-border-primary bg-bg-secondary">
                <div className="container mx-auto px-4 py-6 max-w-2xl">
                    <div className="skeleton-shimmer h-7 w-44 mb-2" />
                    <div className="skeleton-shimmer h-4 w-72" />
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6 sm:space-y-8">
                <div className="glass-panel p-5 space-y-3">
                    <div className="skeleton-shimmer h-4 w-36" />
                    <div className="skeleton-shimmer h-5 w-3/4" />
                    <div className="skeleton-shimmer h-10 w-44 rounded-xl" />
                </div>

                <div className="glass-panel p-4 sm:p-5 space-y-4">
                    <div className="flex gap-3 sm:gap-4">
                        <div className="skeleton-shimmer h-11 w-11 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <div className="skeleton-shimmer h-4 w-40" />
                            <div className="skeleton-shimmer h-20 w-full rounded-xl" />
                        </div>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border-primary/50">
                        <div className="skeleton-shimmer h-3 w-20" />
                        <div className="skeleton-shimmer h-10 w-28 rounded-lg" />
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-success/60" />
                        <div className="skeleton-shimmer h-6 w-44" />
                    </div>

                    <div className="space-y-2">
                        <div className="skeleton-shimmer h-3 w-28" />
                        <div className="flex gap-2 overflow-hidden">
                            {[1, 2, 3, 4, 5].map((pill) => (
                                <div key={pill} className="skeleton-shimmer h-10 w-24 rounded-full flex-shrink-0" />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        {[1, 2, 3, 4].map((card) => (
                            <div key={card} className="glass-panel p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="skeleton-shimmer h-4 w-40" />
                                    <div className="skeleton-shimmer h-3 w-20" />
                                </div>
                                <div className="skeleton-shimmer h-5 w-11/12" />
                                <div className="skeleton-shimmer h-4 w-4/5" />
                                <div className="skeleton-shimmer h-10 w-24 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
