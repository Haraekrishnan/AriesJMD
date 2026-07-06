'use client';
import { useMemo } from 'react';
import { useManpower } from '@/contexts/manpower-provider';
import { useGeneral } from '@/contexts/general-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { Users, UserCheck, UserX } from 'lucide-react';
import StatCard from '../dashboard/stat-card';
import { format, formatDistanceToNow } from 'date-fns';

export default function ManpowerSummary() {
  const { 
    manpowerLogs, 
    lastManpowerUpdate 
  } = useManpower();
  const { projects } = useGeneral();
  const { jobSchedules } = usePlanner();

  const { totalWorking, totalOnLeave, totalActive } = useMemo(() => {
    const today = new Date();
    const dateStr = format(today, 'yyyy-MM-dd');
    const scheduleForDate = jobSchedules.find(s => s.date === dateStr);
    
    let totalWorkingCount = 0;
    let totalOnLeaveCount = 0;

    projects.forEach(project => {
        const logsForProjectDay = manpowerLogs.filter(log => log.date === dateStr && log.projectId === project.id);
        const latestLogForDay = logsForProjectDay.length > 0
            ? logsForProjectDay.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
            : null;

        // Sync with schedule:
        const scheduledCount = scheduleForDate?.items?.filter(item => item.projectId === project.id)
            .reduce((sum, item) => sum + (item.manpowerIds?.length || 0), 0) || 0;

        // If no log exists for today, we use the schedule count. 
        // If that is also missing, it is 0 (per user request).
        const openingManpower = latestLogForDay?.openingManpower ?? scheduledCount;
        
        const countIn = latestLogForDay?.countIn || 0;
        const countOut = latestLogForDay?.countOut || 0;
        const dayTotal = openingManpower + countIn - countOut;
        const onLeave = latestLogForDay?.countOnLeave || 0;

        totalWorkingCount += dayTotal;
        totalOnLeaveCount += onLeave;
    });
    
    const totalActiveCount = totalWorkingCount - totalOnLeaveCount;
    
    return { totalWorking: totalWorkingCount, totalOnLeave: totalOnLeaveCount, totalActive: totalActiveCount };
  }, [manpowerLogs, projects, jobSchedules]);

  const lastUpdateText = `Last update: ${lastManpowerUpdate ? formatDistanceToNow(new Date(lastManpowerUpdate), { addSuffix: true }) : 'never'}`;
  
  const workingDescription = (
    <>
      <span>Total manpower count.</span>
      <span className="block mt-1">{lastUpdateText}</span>
    </>
  );
  
  const activeDescription = (
    <>
      <span>Working minus on leave.</span>
      <span className="block mt-1">{lastUpdateText}</span>
    </>
  );

  const leaveDescription = (
    <>
      <span>Manpower on leave.</span>
      <span className="block mt-1">{lastUpdateText}</span>
    </>
  );

  return (
    <div className="grid gap-6 md:grid-cols-3">
       <StatCard 
          title="Total Working" 
          value={totalWorking}
          icon={Users} 
          description={workingDescription}
        />
        <StatCard 
          title="Today's Active" 
          value={totalActive}
          icon={UserCheck} 
          description={activeDescription}
        />
        <StatCard 
          title="Today's Leave" 
          value={totalOnLeave}
          icon={UserX} 
          description={leaveDescription}
        />
    </div>
  );
}
