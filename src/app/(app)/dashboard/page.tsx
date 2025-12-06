
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-provider';
import { useTask } from '@/contexts/task-provider';
import { useManpower } from '@/contexts/manpower-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import StatCard from '@/components/dashboard/stat-card';
import { FileText, Users, CheckCircle, ListTodo, Megaphone, PlusCircle, UserMinus, AlertCircle } from 'lucide-react';
import TasksCompletedChart from '@/components/dashboard/tasks-completed-chart';
import TeamTaskDistributionChart from '@/components/dashboard/team-task-distribution-chart';
import AnnouncementFeed from '@/components/announcements/AnnouncementFeed';
import NewAnnouncementDialog from '@/components/announcements/NewAnnouncementDialog';
import RecentPlannerActivity from '@/components/planner/RecentActivity';
import { startOfMonth, formatDistanceToNow, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, getVisibleUsers } = useAuth();
  const { tasks: allTasks } = useTask();
  const { isManpowerUpdatedToday, lastManpowerUpdate, manpowerLogs } = useManpower();
  const { projects } = useGeneral();

  const [selectedPlannerDate, setSelectedPlannerDate] = useState<Date | undefined>(new Date());
  const [currentPlannerMonth, setCurrentPlannerMonth] = useState(startOfMonth(new Date()));
  const [selectedPlannerUser, setSelectedPlannerUser] = useState<string>(user!.id);

  const visibleUserIds = useMemo(() => {
    const visibleUsers = getVisibleUsers();
    return new Set(visibleUsers.map(u => u.id));
  }, [getVisibleUsers]);

  const visibleTasks = useMemo(() => {
    return allTasks.filter(task => {
        if (!task.assigneeIds) return false;
        return task.assigneeIds.some(id => visibleUserIds.has(id));
    });
  }, [allTasks, visibleUserIds]);

  const { totalWorking, totalOnLeave } = useMemo(() => {
    if (!projects || !manpowerLogs) return { totalWorking: 0, totalOnLeave: 0 };
    const todayStr = new Date().toISOString().split('T')[0];
    let working = 0;
    let onLeave = 0;
    projects.forEach(project => {
      const latestLog = manpowerLogs
        .filter(log => log.projectId === project.id && log.date <= todayStr)
        .sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];
      
      if(latestLog) {
        working += latestLog.total;
        onLeave += latestLog.countOnLeave;
      }
    });
    return { totalWorking: working, totalOnLeave: onLeave };
  }, [manpowerLogs, projects]);


  const completedTasks = useMemo(() => visibleTasks.filter(t => t.status === 'Done').length, [visibleTasks]);
  const openTasks = useMemo(() => visibleTasks.length - completedTasks, [visibleTasks, completedTasks]);
  
  const avgTasksPerPerson = useMemo(() => {
      const visibleUsers = getVisibleUsers();
      const employees = visibleUsers.filter(u => u.role === 'Team Member' || u.role.includes('Junior'));
      if (employees.length === 0) return '0';
      return (visibleTasks.length / employees.length).toFixed(1);
  }, [visibleTasks, getVisibleUsers]);
  
  const activeManpowerToday = totalWorking - totalOnLeave;

  const manpowerDescription = useMemo(() => {
    const lastUpdateString = lastManpowerUpdate
      ? `Last update: ${formatDistanceToNow(new Date(lastManpowerUpdate), { addSuffix: true })}`
      : 'No recent updates';

    return (
        <>
            <span>{activeManpowerToday} active, {totalOnLeave} on leave.</span>
            <span className="block mt-1">{lastUpdateString}</span>
        </>
    )
  }, [lastManpowerUpdate, activeManpowerToday, totalOnLeave]);


  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name}!</h1>
            <p className="text-muted-foreground">Here's a summary of your team's activity.</p>
        </div>
      </div>

      <AnnouncementFeed />
      
      <RecentPlannerActivity />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Completed Tasks" 
          value={completedTasks.toString()} 
          icon={CheckCircle} 
          description="Total tasks marked as done by your team"
        />
        <StatCard 
          title="Open Tasks" 
          value={openTasks.toString()}
          icon={ListTodo}
          description="Tasks currently in-progress or to-do"
        />
        <StatCard 
          title="Avg. Tasks / Person" 
          value={avgTasksPerPerson} 
          icon={Users}
          description="Average tasks across your team"
        />
        <StatCard 
          title="Manpower" 
          value={totalWorking.toString()}
          icon={Users}
          description={manpowerDescription}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <TasksCompletedChart tasks={visibleTasks} />
        <TeamTaskDistributionChart tasks={visibleTasks} />
      </div>
    </div>
  );
}
