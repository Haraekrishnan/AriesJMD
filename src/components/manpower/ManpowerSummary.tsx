
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Users, Plane, UserX, UserMinus } from 'lucide-react';
import StatCard from '../dashboard/stat-card';

export default function ManpowerSummary() {
  const { manpowerProfiles } = useAppContext();

  const statusCounts = useMemo(() => {
    const counts = {
      Working: 0,
      'On Leave': 0,
      Resigned: 0,
      Terminated: 0
    };
    manpowerProfiles.forEach(p => {
        if (p.status in counts) {
            counts[p.status as keyof typeof counts]++;
        }
    });
    return counts;
  }, [manpowerProfiles]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
       <StatCard 
          title="Total Working" 
          value={statusCounts.Working} 
          icon={Users} 
          description="Current active manpower count"
        />
        <StatCard 
          title="On Leave" 
          value={statusCounts['On Leave']}
          icon={Plane} 
          description="Manpower currently on leave"
        />
        <StatCard 
          title="Resigned" 
          value={statusCounts.Resigned} 
          icon={UserMinus} 
          description="Total resigned manpower"
        />
        <StatCard 
          title="Terminated" 
          value={statusCounts.Terminated} 
          icon={UserX} 
          description="Total terminated manpower"
        />
    </div>
  );
}
