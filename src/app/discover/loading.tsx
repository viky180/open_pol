export default function Loading() {
    return (
        <div className="min-h-screen">
            {/* Hero Section Skeleton */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10">
                <div className="relative z-10 container mx-auto px-4 py-12 sm:py-16 max-w-3xl text-center">
                    <div className="h-10 w-64 bg-primary/10 rounded-lg mx-auto mb-4 animate-pulse" />
                    <div className="h-6 w-96 bg-primary/5 rounded-lg mx-auto mb-6 animate-pulse" />

                    {/* Quick stats skeleton */}
                    <div className="flex justify-center gap-8 mb-8">
                        <div className="text-center">
                            <div className="h-8 w-16 bg-primary/10 rounded-lg mx-auto mb-1 animate-pulse" />
                            <div className="h-4 w-20 bg-primary/5 rounded mx-auto animate-pulse" />
                        </div>
                        <div className="hidden sm:block w-px h-12 bg-border-secondary" />
                        <div className="text-center">
                            <div className="h-8 w-16 bg-accent/10 rounded-lg mx-auto mb-1 animate-pulse" />
                            <div className="h-4 w-20 bg-primary/5 rounded mx-auto animate-pulse" />
                        </div>
                    </div>

                    {/* CTA skeleton */}
                    <div className="h-12 w-48 bg-primary/20 rounded-xl mx-auto animate-pulse" />
                </div>
            </div>

            {/* Groups List Skeleton */}
            <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
                {/* Search Bar Skeleton */}
                <div className="h-14 w-full bg-bg-secondary rounded-xl animate-pulse" />

                {/* Filter Pills Skeleton */}
                <div className="flex gap-2 overflow-hidden">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-9 w-24 bg-bg-secondary rounded-full animate-pulse flex-shrink-0" />
                    ))}
                </div>

                {/* List Items Skeleton */}
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-32 w-full bg-bg-secondary rounded-2xl animate-pulse border border-border-primary/50" />
                    ))}
                </div>
            </div>
        </div>
    );
}
