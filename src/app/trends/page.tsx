import { TrendsDashboard } from '@/components/TrendsDashboard';
import { DistributionDashboard } from '@/components/DistributionDashboard';

export const metadata = {
  title: 'Mood of the Nation - Open Politics',
  description: 'Track how groups are growing or declining over time. See which issues are gaining momentum and which are losing support.',
};

export default function TrendsPage() {
  return (
    <div className="min-h-screen">
      <section className="editorial-page editorial-page--wide py-6 sm:py-8">
        <div className="editorial-hero">
          <p className="editorial-hero__eyebrow">Participation, not polling</p>
          <h1 className="editorial-hero__title text-3xl sm:text-5xl">Mood of the nation</h1>
          <p className="editorial-hero__body">
            Track which issues are gaining momentum, where support is stalling, and how issue distribution changes across locations.
          </p>
        </div>
      </section>

      <div className="editorial-page editorial-page--wide space-y-8 py-2 pb-8">
        <TrendsDashboard />
        <DistributionDashboard />
      </div>
    </div>
  );
}
