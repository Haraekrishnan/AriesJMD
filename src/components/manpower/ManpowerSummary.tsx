
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Users, UserCheck, UserX } from 'lucide-react';
import StatCard from '../dashboard/stat-card';

export default function ManpowerSummary() {
  const { workingManpowerCount, onLeaveManpowerCount } = useAppContext();

  const activeManpower = workingManpowerCount - onLeaveManpowerCount;

  return (
    <div className="grid gap-6 md:grid-cols-3">
       <StatCard 
          title="Total Working" 
          value={workingManpowerCount} 
          icon={Users} 
          description="Total manpower count for today"
        />
        <StatCard 
          title="Today's Active" 
          value={activeManpower}
          icon={UserCheck} 
          description="Working manpower minus those on leave"
        />
        <StatCard 
          title="Today's Leave" 
          value={onLeaveManpowerCount} 
          icon={UserX} 
          description="Manpower on leave today"
        />
    </div>
  );
}
