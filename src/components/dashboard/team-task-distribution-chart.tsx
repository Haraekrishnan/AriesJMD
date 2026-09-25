'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Task, Role } from '@/lib/types';
import { isAfter, endOfDay, parseISO, isValid } from 'date-fns';

const COLORS: Record<string, string> = {
  'To Do': 'hsl(var(--chart-1))',
  'In Progress': 'hsl(var(--chart-3))',
  'Completed': '#14be60',
  'Overdue': '#f43e51',
};

interface TeamTaskDistributionChartProps {
    tasks: Task[];
}

export default function TeamTaskDistributionChart({ tasks }: TeamTaskDistributionChartProps) {
  const { user, getVisibleUsers } = useAuth();

  const visibleUsers = useMemo(() => {
    return getVisibleUsers().filter(u => u.role !== 'Manager');
  }, [getVisibleUsers]);

  const canSelectAll = useMemo(() => {
    if (!user) return false;
    const managementRoles: Role[] = ['Admin', 'Manager', 'Project Coordinator'];
    if (managementRoles.includes(user.role)) {
        return true;
    }
    return visibleUsers.some(u => u.id !== user.id);
  }, [user, visibleUsers]);

  const [selectedUserId, setSelectedUserId] = useState(() => {
    if (!user) return 'all';
    return canSelectAll ? 'all' : user.id;
  });

  const selectedUserName = useMemo(() => {
    if (selectedUserId === 'all') return 'All Visible Members';
    return visibleUsers.find(u => u.id === selectedUserId)?.name || 'Selected User';
  }, [selectedUserId, visibleUsers]);

  const chartData = useMemo(() => {
    const relevantTasks = selectedUserId === 'all'
      ? tasks
      : tasks.filter(t => t.assigneeIds.includes(selectedUserId));

    const isOverdue = (task: Task) => {
        if (task.status === 'Done' || task.status === 'Completed') return false;
        if (!task.dueDate) return false;
        const dueDate = parseISO(task.dueDate);
        if (!isValid(dueDate)) return false;
        return isAfter(new Date(), endOfDay(dueDate));
    };

    const counts = {
      'To Do': relevantTasks.filter(t => t.status === 'To Do' && !isOverdue(t)).length,
      'In Progress': relevantTasks.filter(t => (t.status === 'In Progress' || t.status === 'In Review' || t.status === 'Pending Approval') && !isOverdue(t)).length,
      'Completed': relevantTasks.filter(t => t.status === 'Done' || t.status === 'Completed').length,
      'Overdue': relevantTasks.filter(t => isOverdue(t)).length,
    };
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0);
  }, [tasks, selectedUserId]);


  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const completed = chartData.find(item => item.name === 'Completed')?.value || 0;
  const completionRate = total ? Math.round(completed / total * 100) : 0;
  return <Card>
    <CardHeader className="p-4 pb-2"><div className="flex flex-wrap items-center justify-between gap-2">
      <CardTitle className="text-base font-semibold">Task Distribution</CardTitle>
      <Select value={selectedUserId} onValueChange={setSelectedUserId}><SelectTrigger className="h-8 w-[180px]" aria-label="Filter task distribution by member"><SelectValue /></SelectTrigger><SelectContent>
        {canSelectAll && <SelectItem value="all">All Visible Members</SelectItem>}
        {visibleUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
      </SelectContent></Select>
    </div></CardHeader>
    <CardContent className="p-4 pt-0">
      {total ? <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="relative h-[190px] w-[190px] shrink-0">
          <ResponsiveContainer width="100%" height="100%"><PieChart><Tooltip /><Pie data={chartData} innerRadius={57} outerRadius={78} paddingAngle={3} dataKey="value" nameKey="name">{chartData.map(entry => <Cell key={entry.name} fill={COLORS[entry.name]} />)}</Pie></PieChart></ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl">{completionRate}%</strong><span className="text-xs text-muted-foreground">Completed</span></div>
        </div>
        <ul className="min-w-[150px] flex-1 divide-y" aria-label="Task distribution values">{chartData.map(item => <li key={item.name} className="flex items-center gap-3 py-2 text-xs"><span className="h-3 w-3 rounded-full" style={{background: COLORS[item.name]}} /><div className="flex-1"><strong>{item.name}</strong><p className="text-muted-foreground">{item.value} tasks</p></div><strong>{Math.round(item.value / total * 100)}%</strong></li>)}</ul>
      </div> : <div className="flex h-[190px] items-center justify-center text-center text-sm text-muted-foreground">No tasks found for {selectedUserName}.</div>}
    </CardContent>
  </Card>;
}
