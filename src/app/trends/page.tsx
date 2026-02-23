import { TrendsDashboard } from '@/components/TrendsDashboard';
import { DistributionDashboard } from '@/components/DistributionDashboard';

export const metadata = {
    title: 'Mood of the Nation — Open Politics',
    description: 'Track how groups are growing or declining over time. See which issues are gaining momentum and which are losing support.',
};

export default function TrendsPage() {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10">
                {/* Decorative circles */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 container mx-auto px-4 py-12 sm:py-16 max-w-3xl text-center">
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                        <span className="bg-gradient-to-r from-text-primary via-primary to-accent bg-clip-text text-transparent">
                            Mood of the Nation
                        </span>
                    </h1>
                    <p className="text-text-secondary text-lg max-w-xl mx-auto mb-2">
                        Track which issues are gaining momentum and which are losing ground.
                    </p>
                    <p className="text-text-muted text-sm max-w-lg mx-auto">
                        Real-time sentiment powered by actual participation — not polls.
                    </p>
                </div>
            </div>

            {/* Dashboard */}
            <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
                <TrendsDashboard />
                <DistributionDashboard />
            </div>
        </div>
    );
}
