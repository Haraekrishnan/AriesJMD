'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-provider';
import { useTask } from '@/contexts/task-provider';
import { useManpower } from '@/contexts/manpower-provider';
import { useGeneral } from '@/contexts/general-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import StatCard from '@/components/dashboard/stat-card';
import { Users, CheckCircle, ListTodo, ShieldAlert } from 'lucide-react';
import TasksCompletedChart from '@/components/dashboard/tasks-completed-chart';
import TeamTaskDistributionChart from '@/components/dashboard/team-task-distribution-chart';
import AnnouncementFeed from '@/components/announcements/AnnouncementFeed';
import RecentPlannerActivity from '@/components/planner/RecentActivity';
import DelegatedEventFeed from '@/components/planner/DelegatedEventFeed';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DashboardPage() {
  const { user, getVisibleUsers, markFeatureAsViewed, can } = useAuth();
  const { tasks: allTasks } = useTask();
  const { lastManpowerUpdate, manpowerLogs } = useManpower();
  const { projects } = useGeneral();
  const { jobSchedules } = usePlanner();

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
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const scheduleForToday = jobSchedules.find(s => s.date === todayStr);

    let working = 0;
    let onLeave = 0;

    projects.forEach(project => {
      const latestLogForDay = manpowerLogs
        .filter(log => log.projectId === project.id && log.date === todayStr)
        .sort((a,b) => parseISO(b.updatedAt).getTime() - parseISO(a.updatedAt).getTime())[0];
      
      const scheduledCount = scheduleForToday?.items?.filter(item => item.projectId === project.id)
          .reduce((sum, item) => sum + (item.manpowerIds?.length || 0), 0) || 0;

      const openingManpower = latestLogForDay?.openingManpower ?? scheduledCount;
      
      const countIn = latestLogForDay?.countIn || 0;
      const countOut = latestLogForDay?.countOut || 0;
      const dayTotal = openingManpower + countIn - countOut;

      working += dayTotal;
      onLeave += (latestLogForDay?.countOnLeave || 0);
    });
    return { totalWorking: working, totalOnLeave: onLeave };
  }, [manpowerLogs, projects, jobSchedules]);


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

  const showEhsNotice = can.access_ehs_portal && !user?.viewedFeatures?.ehs;

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name}!</h1>
            <p className="text-muted-foreground">Here's a summary of your team's activity.</p>
        </div>
      </div>

      {showEhsNotice && (
        <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 animate-in fade-in slide-in-from-top-2 duration-500">
          <ShieldAlert className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
            <div>
                <AlertTitle className="text-emerald-900 dark:text-emerald-200 font-bold">New Feature: EHS Portal</AlertTitle>
                <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                    We've introduced a comprehensive Environment, Health, and Safety (EHS) portal. 
                    Manage site audits, report incidents, conduct risk assessments, and access the safety library all in one secure place.
                </AlertDescription>
            </div>
            <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" onClick={() => markFeatureAsViewed('ehs')}>
                    Dismiss
                </Button>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Link href="/ehs">Explore Portal</Link>
                </Button>
            </div>
          </div>
        </Alert>
      )}

      <DelegatedEventFeed />
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
