'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Users, Briefcase, Plane } from 'lucide-react';
import StatCard from '../dashboard/stat-card';

export default function ManpowerSummary() {
  const { workingManpowerCount, onLeaveManpowerCount } = useAppContext();

  const totalStrength = useMemo(() => {
    return workingManpowerCount + onLeaveManpowerCount;
  }, [workingManpowerCount, onLeaveManpowerCount]);

  return (
    <div className="grid gap-6 md:grid-cols-3">
       <StatCard 
          title="Total Working" 
          value={workingManpowerCount} 
          icon={Users} 
          description="Current active manpower count"
        />
        <StatCard 
          title="On Leave" 
          value={onLeaveManpowerCount}
          icon={Plane} 
          description="Manpower currently on leave"
        />
        <StatCard 
          title="Total Strength" 
          value={totalStrength} 
          icon={Briefcase} 
          description="Total manpower including on leave"
        />
    </div>
  );
}
