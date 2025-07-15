'use client';

import { useContext, useMemo, useState } from 'react';
import { AppContext } from '@/contexts/app-provider';
import { useAuth } from '@/hooks/use-auth';
import { StatCard } from '@/components/dashboard/stat-card';
import { TasksCompletedChart } from '@/components/dashboard/tasks-completed-chart';
import { TeamTaskDistributionChart } from '@/components/dashboard/team-task-distribution-chart';
import {
  CheckCircle,
  ListTodo,
  Users,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const context = useContext(AppContext);
  const { user } = useAuth();
  const [visibleAnnouncements, setVisibleAnnouncements] = useState<string[]>(
    context?.announcements.map(a => a.id) || []
  );

  const stats = useMemo(() => {
    const completed = context?.tasks.filter(t => t.status === 'Completed').length || 0;
    const open = context?.tasks.filter(t => t.status === 'To Do' || t.status === 'In Progress').length || 0;
    const avgTasks = context?.users.length
      ? (context.tasks.length / context.users.filter(u => u.role === 'Employee').length).toFixed(1)
      : 0;
    return { completed, open, avgTasks };
  }, [context?.tasks, context?.users]);

  const handleDismiss = (id: string) => {
    setVisibleAnnouncements(prev => prev.filter(annoId => annoId !== id));
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name}!
        </h2>
      </div>

      <div className="space-y-4">
        {context?.announcements.map(
          (announcement) =>
            visibleAnnouncements.includes(announcement.id) && (
              <Alert key={announcement.id} className="relative">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{announcement.title}</AlertTitle>
                <AlertDescription>{announcement.content}</AlertDescription>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => handleDismiss(announcement.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Alert>
            )
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Completed Tasks"
          value={stats.completed}
          icon={CheckCircle}
          description="Total tasks marked as completed."
        />
        <StatCard
          title="Open Tasks"
          value={stats.open}
          icon={ListTodo}
          description="Tasks currently in progress or to do."
        />
        <StatCard
          title="Average Tasks Per Person"
          value={stats.avgTasks}
          icon={Users}
          description="Average tasks assigned to an employee."
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <TasksCompletedChart />
        <TeamTaskDistributionChart />
      </div>
    </div>
  );
}
