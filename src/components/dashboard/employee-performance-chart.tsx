
'use client';
import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useAuth } from '@/contexts/auth-provider';
import { useTask } from '@/contexts/task-provider';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmployeePerformanceChart() {
  const { tasks } = useTask();
  const { users } = useAuth();

  const chartData = useMemo(() => {
    return users.map(user => {
      const userTasks = tasks.filter(task => task.assigneeIds.includes(user.id));
      const done = userTasks.filter(t => t.status === 'Done').length;
      const inProgress = userTasks.filter(t => t.status === 'In Progress').length;
      const inReview = userTasks.filter(t => t.status === 'In Review').length;
      const todo = userTasks.filter(t => t.status === 'To Do').length;
      
      return { 
        name: user.name.split(' ')[0], // Use first name for brevity
        'To Do': todo,
        'In Progress': inProgress,
        'In Review': inReview,
        'Done': done,
        total: userTasks.length
      };
    });
  }, [tasks, users]);

  return (
    <Card>
        <CardHeader>
            <CardTitle>Team Task Distribution</CardTitle>
        </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)'
                    }}
                />
                <Legend wrapperStyle={{fontSize: "14px"}}/>
                <Bar dataKey="To Do" stackId="a" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="In Progress" stackId="a" fill="hsl(var(--chart-2))" />
                <Bar dataKey="In Review" stackId="a" fill="hsl(var(--chart-3))" />
                <Bar dataKey="Done" stackId="a" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  );
}
