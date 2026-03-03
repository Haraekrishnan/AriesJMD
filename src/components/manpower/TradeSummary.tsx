

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
    const activeProfiles = manpowerProfiles.filter(p => p.status === 'Working');
    
    activeProfiles.forEach(profile => {
        const tradeKey = TRADES.includes(profile.trade) ? profile.trade : 'Others';
        counts.set(tradeKey, (counts.get(tradeKey) || 0) + 1);
    });

    return counts;
  }, [manpowerProfiles]);

  const totalWorkingManpower = useMemo(() => {
      return Array.from(tradeCounts.values()).reduce((sum, count) => sum + count, 0);
  }, [tradeCounts]);
  
  const allTradesToDisplay = [...TRADES];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
       <StatCard 
          title="Total Working" 
          value={totalWorkingManpower} 
          icon={Users} 
          description="Total active workforce"
        />
        {allTradesToDisplay.filter(trade => tradeCounts.has(trade)).map(trade => (
             <StatCard 
                key={trade}
                title={trade}
                value={tradeCounts.get(trade) || 0}
                icon={HardHat}
                description={`Total working in ${trade} trade`}
            />
        ))}
    </div>
  );
}
