export default function Loading() {
    return (
        <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8 animate-pulse">
            <div className="h-4 w-36 bg-gray-200 rounded mb-6" />

            <div className="border-b border-gray-200 pb-8 mb-6">
                <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                <div className="h-10 w-4/5 bg-gray-200 rounded mb-5" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                    <div className="h-4 w-40 bg-gray-200 rounded" />
                    <div className="h-4 w-44 bg-gray-200 rounded" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-4 w-36 bg-gray-200 rounded" />
                </div>
                <div className="h-12 w-64 bg-gray-200 rounded-xl" />
            </div>

            <div className="flex gap-3 mb-6">
                <div className="h-10 w-24 bg-gray-200 rounded-xl" />
                <div className="h-10 w-24 bg-gray-200 rounded-xl" />
                <div className="h-10 w-24 bg-gray-200 rounded-xl" />
                <div className="h-10 w-24 bg-gray-200 rounded-xl" />
            </div>

            <div className="space-y-6">
                <div className="h-28 bg-gray-100 rounded-xl" />
                <div className="h-28 bg-gray-100 rounded-xl" />
                <div className="h-32 bg-gray-100 rounded-xl" />
                <div className="h-40 bg-gray-100 rounded-xl" />
            </div>
        </div>
    );
}
