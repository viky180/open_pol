export default function Loading() {
    return (
        <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
            <div className="skeleton-shimmer h-4 w-36 mb-6" />

            <div className="border-b border-border-primary pb-8 mb-6">
                <div className="skeleton-shimmer h-3 w-20 mb-3" />
                <div className="skeleton-shimmer h-10 w-4/5 mb-5" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                    <div className="skeleton-shimmer h-4 w-40" />
                    <div className="skeleton-shimmer h-4 w-44" />
                    <div className="skeleton-shimmer h-4 w-32" />
                    <div className="skeleton-shimmer h-4 w-36" />
                </div>
                <div className="skeleton-shimmer h-12 w-64 rounded-xl" />
            </div>

            <div className="flex gap-3 mb-6">
                <div className="skeleton-shimmer h-10 w-24 rounded-xl" />
                <div className="skeleton-shimmer h-10 w-24 rounded-xl" />
                <div className="skeleton-shimmer h-10 w-24 rounded-xl" />
                <div className="skeleton-shimmer h-10 w-24 rounded-xl" />
            </div>

            <div className="space-y-6">
                <div className="skeleton-shimmer h-28 rounded-xl" />
                <div className="skeleton-shimmer h-28 rounded-xl" />
                <div className="skeleton-shimmer h-32 rounded-xl" />
                <div className="skeleton-shimmer h-40 rounded-xl" />
            </div>
        </div>
    );
}
