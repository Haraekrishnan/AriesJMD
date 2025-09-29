
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import StatCard from '@/components/dashboard/stat-card';
import { FileText, Users, CheckCircle, ListTodo, Megaphone, PlusCircle, UserMinus } from 'lucide-react';
import TasksCompletedChart from '@/components/dashboard/tasks-completed-chart';
import TeamTaskDistributionChart from '@/components/dashboard/team-task-distribution-chart';
import AnnouncementFeed from '@/components/announcements/AnnouncementFeed';
import NewAnnouncementDialog from '@/components/announcements/NewAnnouncementDialog';
import BroadcastTicker from '../announcements/BroadcastTicker';

export default function DashboardPage() {
  const { user, getVisibleUsers, tasks: allTasks, workingManpowerCount, onLeaveManpowerCount } = useAppContext();

  const visibleUserIds = useMemo(() => {
    const visibleUsers = getVisibleUsers();
    return new Set(visibleUsers.map(u => u.id));
  }, [getVisibleUsers]);

  const visibleTasks = useMemo(() => {
    return allTasks.filter(task => {
        if (!task.assigneeIds) return false;
        // The filtering logic for the Store in Charge is now implicitly handled by getVisibleUsers,
        // so we just need to check if any assignee is in the visible list.
        return task.assigneeIds.some(id => visibleUserIds.has(id));
    });
  }, [allTasks, visibleUserIds]);


  const completedTasks = useMemo(() => visibleTasks.filter(t => t.status === 'Done').length, [visibleTasks]);
  const openTasks = useMemo(() => visibleTasks.length - completedTasks, [visibleTasks, completedTasks]);
  
  const avgTasksPerPerson = useMemo(() => {
      const visibleUsers = getVisibleUsers();
      const employees = visibleUsers.filter(u => u.role === 'Team Member' || u.role.includes('Junior'));
      if (employees.length === 0) return '0';
      return (visibleTasks.length / employees.length).toFixed(1);
  }, [visibleTasks, getVisibleUsers]);
  
  const activeManpowerToday = workingManpowerCount - onLeaveManpowerCount;

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name}!</h1>
            <p className="text-muted-foreground">Here's a summary of your team's activity.</p>
        </div>
      </div>

      <BroadcastTicker />
      <AnnouncementFeed />

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
          value={workingManpowerCount.toString()}
          icon={Users}
          description={`${activeManpowerToday} active, ${onLeaveManpowerCount} on leave`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <TasksCompletedChart tasks={visibleTasks} />
        <TeamTaskDistributionChart tasks={visibleTasks} />
      </div>
    </div>
  );
}
