'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/hooks/use-app-context';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/stat-card';
import { FileText, Users, CheckCircle, ListTodo } from 'lucide-react';
import TasksCompletedChart from '@/components/dashboard/tasks-completed-chart';
import TeamTaskDistributionChart from '@/components/dashboard/team-task-distribution-chart';
import { AnnouncementFeed } from '@/components/announcements/announcement-feed';

export default function DashboardPage() {
  const { user, getVisibleUsers, tasks: allTasks, can } = useAppContext();
  const [isNewAnnouncementDialogOpen, setIsNewAnnouncementDialogOpen] = useState(false);

  const visibleUsers = useMemo(() => getVisibleUsers(), [getVisibleUsers]);
  const visibleUserIds = useMemo(() => new Set(visibleUsers.map(u => u.id)), [visibleUsers]);

  const visibleTasks = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.filter(task => task.assigneeIds.some(id => visibleUserIds.has(id)));
  }, [allTasks, visibleUserIds]);

  const { completedTasks, openTasks } = useMemo(() => {
    const completed = visibleTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
    const open = visibleTasks.length - completed;
    return { completedTasks: completed, openTasks: open };
  }, [visibleTasks]);
  
  const avgTasksPerPerson = useMemo(() => {
      const employees = visibleUsers.filter(u => u.role === 'Team Member' || u.role.includes('Junior'));
      if (employees.length === 0 || visibleTasks.length === 0) return '0';
      return (visibleTasks.length / employees.length).toFixed(1);
  }, [visibleTasks, visibleUsers]);

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name}!</h1>
            <p className="text-muted-foreground">Here's a summary of your team's activity.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/reports">
                    <FileText />
                    <span>Generate Report</span>
                </Link>
            </Button>
        </div>
      </div>

      <AnnouncementFeed />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TasksCompletedChart tasks={visibleTasks} />
        </div>
        <div className="lg:col-span-1">
          <TeamTaskDistributionChart tasks={visibleTasks} users={visibleUsers} />
        </div>
      </div>
    </div>
  );
}
