
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Users, UserCheck, UserX, AlertCircle } from 'lucide-react';
import StatCard from '../dashboard/stat-card';
import { format, isBefore, parseISO, startOfDay, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ManpowerSummary() {
  const { 
    manpowerLogs, 
    projects, 
    isManpowerUpdatedToday, 
    lastManpowerUpdate 
  } = useAppContext();

  const { totalWorking, totalOnLeave, totalActive } = useMemo(() => {
    const today = new Date();
    const dateStr = format(today, 'yyyy-MM-dd');
    
    let totalWorking = 0;
    let totalOnLeave = 0;

    projects.forEach(project => {
        const logsForProjectDay = manpowerLogs.filter(log => log.date === dateStr && log.projectId === project.id);
        const latestLogForDay = logsForProjectDay.length > 0
            ? logsForProjectDay.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
            : null;

        const previousLogs = manpowerLogs
            .filter(l => l.projectId === project.id && isBefore(parseISO(l.date), startOfDay(today)))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
        const mostRecentPreviousLog = previousLogs[0];
        
        const openingManpower = latestLogForDay?.openingManpower ?? mostRecentPreviousLog?.total ?? 0;
        const countIn = latestLogForDay?.countIn || 0;
        const countOut = latestLogForDay?.countOut || 0;
        const dayTotal = openingManpower + countIn - countOut;
        const onLeave = latestLogForDay?.countOnLeave || 0;

        totalWorking += dayTotal;
        totalOnLeave += onLeave;
    });
    
    const totalActive = totalWorking - totalOnLeave;
    
    return { totalWorking, totalOnLeave, totalActive };
  }, [manpowerLogs, projects]);

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
