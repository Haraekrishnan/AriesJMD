
'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Task, User, Role } from '@/lib/types';

const COLORS: Record<string, string> = {
  'To Do': 'hsl(var(--chart-1))',
  'In Progress': 'hsl(var(--chart-3))',
  'In Review': 'hsl(var(--chart-4))',
  'Completed': 'hsl(var(--chart-2))',
  'Overdue': 'hsl(var(--destructive))',
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

    const statuses = {
      'To Do': relevantTasks.filter(t => t.status === 'To Do').length,
      'In Progress': relevantTasks.filter(t => t.status === 'In Progress').length,
      'In Review': relevantTasks.filter(t => t.status === 'In Review').length,
      'Completed': relevantTasks.filter(t => t.status === 'Done').length,
      'Overdue': relevantTasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'Done').length,
    };
    
    return Object.entries(statuses)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0);
  }, [tasks, selectedUserId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Distribution</CardTitle>
        <div className="flex flex-col gap-2 pt-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[240px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {canSelectAll && <SelectItem key="all" value="all">All Visible Members</SelectItem>}
                {visibleUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
            </SelectContent>
            </Select>
            <CardDescription>Showing task distribution for {selectedUserName}.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  cursor={{fill: 'hsl(var(--muted))'}}
                  contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)'
                  }}
                />
                <Legend verticalAlign="bottom" height={36}/>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  innerRadius={80}
                  outerRadius={120}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                No tasks found for {selectedUserName}.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
