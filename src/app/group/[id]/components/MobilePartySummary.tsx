'use client';

interface MobilePartySummaryProps {
    totalBackers: number;
    leaderName: string | null;
}

export function MobilePartySummary({
    totalBackers,
    leaderName,
}: MobilePartySummaryProps) {
    return (
        <div className="lg:hidden mb-6 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-bg-card border border-border-primary flex flex-col items-center justify-center text-center">
                <span className="text-xs text-text-muted uppercase tracking-wider font-medium mb-1">Members</span>
                <span className="text-xl font-bold text-text-primary">{totalBackers}</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-card border border-border-primary flex flex-col items-center justify-center text-center">
                <span className="text-xs text-text-muted uppercase tracking-wider font-medium mb-1">Leader</span>
                <span className="text-base font-semibold text-text-primary truncate w-full px-2">
                    {leaderName || 'None'}
                </span>
            </div>
        </div>
    );
}
