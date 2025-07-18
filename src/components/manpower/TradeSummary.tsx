
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { HardHat, Users } from 'lucide-react';
import StatCard from '../dashboard/stat-card';
import { TRADES } from '@/lib/mock-data';

export default function TradeSummary() {
  const { manpowerProfiles } = useAppContext();

  const tradeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const activeProfiles = manpowerProfiles.filter(p => p.status === 'Working' || p.status === 'On Leave');
    
    activeProfiles.forEach(profile => {
        counts.set(profile.trade, (counts.get(profile.trade) || 0) + 1);
    });

    return counts;
  }, [manpowerProfiles]);

  const totalManpower = useMemo(() => {
      return Array.from(tradeCounts.values()).reduce((sum, count) => sum + count, 0);
  }, [tradeCounts]);

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
       <StatCard 
          title="Total Manpower" 
          value={totalManpower} 
          icon={Users} 
          description="Total active workforce"
        />
        {TRADES.filter(trade => tradeCounts.has(trade)).map(trade => (
             <StatCard 
                key={trade}
                title={trade}
                value={tradeCounts.get(trade) || 0}
                icon={HardHat}
                description={`Total in ${trade} trade`}
            />
        ))}
    </div>
  );
}
