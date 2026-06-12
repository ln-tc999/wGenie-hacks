import { OverviewCard } from '@/wgenie-cfo/components/dashboard/overview-card';
import { HoldingsCard } from '@/wgenie-cfo/components/dashboard/holdings-card';
import { TreasuryChart } from '@/wgenie-cfo/components/dashboard/treasury-chart';
import { RecentActivityCard } from '@/wgenie-cfo/components/dashboard/recent-activity-card';

export default function CfoDashboardPage() {
  return (
    <div className="h-full space-y-6 overflow-y-auto p-6">
      {/* Top row: overview + holdings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <OverviewCard />
        </div>
        <div className="lg:col-span-8">
          <HoldingsCard />
        </div>
      </div>

      {/* Bottom row: chart + activity */}
      <div className="grid grid-cols-1 gap-6 pb-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <TreasuryChart />
        </div>
        <div className="lg:col-span-4">
          <RecentActivityCard />
        </div>
      </div>
    </div>
  );
}
