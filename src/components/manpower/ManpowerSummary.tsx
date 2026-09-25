'use client';
import { useMemo } from 'react';
import { useManpower } from '@/contexts/manpower-provider';
import { useGeneral } from '@/contexts/general-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { Users, UserCheck, UserX } from 'lucide-react';
import styles from './manpower-page.module.css';
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

  const chartActive = Math.max(0, totalActive);
  const chartLeave = Math.max(0, totalOnLeave);
  const chartTotal = chartActive + chartLeave;
  const activePercent = chartTotal ? Math.round(chartActive / chartTotal * 100) : 0;

  return (
    <section className={styles.metrics} aria-label="Today's manpower totals">
      {[
        { title: 'Total Working', value: totalWorking, icon: Users, description: workingDescription, tone: 'blue' },
        { title: "Today's Active", value: totalActive, icon: UserCheck, description: activeDescription, tone: 'green' },
        { title: "Today's Leave", value: totalOnLeave, icon: UserX, description: leaveDescription, tone: 'rose' },
      ].map(({title,value,icon:Icon,description,tone}) => <article key={title} className={styles.metric+' '+styles[tone]}>
        <span className={styles.metricIcon}><Icon aria-hidden="true"/></span>
        <div><h2>{title}</h2><strong>{value.toLocaleString()}</strong><div className={styles.description}>{description}</div></div>
      </article>)}
      <article className={styles.distribution} aria-label="Today's active and on-leave manpower">
        <div className={styles.ring} role="img" aria-label={'Active: '+totalActive+', on leave: '+totalOnLeave} style={{background: chartTotal ? 'conic-gradient(#1264ff 0% '+activePercent+'%, #fa3657 '+activePercent+'% 100%)' : '#e6edf7'}}>
          <div><strong>{totalWorking.toLocaleString()}</strong><span>Total working</span></div>
        </div>
        <div className={styles.legend}><div><i className={styles.activeDot}/>Active <strong>{totalActive}</strong><span>{chartTotal ? activePercent+'%' : '—'}</span></div><div><i className={styles.leaveDot}/>On leave <strong>{totalOnLeave}</strong><span>{chartTotal ? (100-activePercent)+'%' : '—'}</span></div><small>{chartTotal ? 'Today’s workforce distribution' : 'No manpower recorded today'}</small></div>
      </article>
    </section>
  );
}
