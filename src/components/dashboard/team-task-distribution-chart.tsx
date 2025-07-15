'use client';

import { useState, useMemo, useContext } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppContext } from '@/contexts/app-provider';
import { TaskStatus } from '@/types';

const COLORS: Record<TaskStatus, string> = {
  'To Do': 'hsl(var(--chart-4))',
  'In Progress': 'hsl(var(--chart-5))',
  Completed: 'hsl(var(--chart-2))',
  Overdue: 'hsl(var(--destructive))',
  'Pending Approval': '#8884d8',
  'Done': 'hsl(var(--chart-1))',
};

export function TeamTaskDistributionChart() {
  const context = useContext(AppContext);
  const [selectedMember, setSelectedMember] = useState('all');

  const chartData = useMemo(() => {
    const filteredTasks = selectedMember === 'all'
      ? context?.tasks
      : context?.tasks.filter(t => t.assigneeId === selectedMember);

    const statusCounts: Record<string, number> = {
      'To Do': 0,
      'In Progress': 0,
      'Completed': 0,
      'Overdue': 0,
    };

    filteredTasks?.forEach(task => {
        if(task.status in statusCounts) {
            statusCounts[task.status] += 1;
        }
    });

    return Object.entries(statusCounts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [context?.tasks, selectedMember]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
              <CardTitle>Task Distribution</CardTitle>
              <CardDescription>Breakdown of tasks by status.</CardDescription>
            </div>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Member" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Entire Team</SelectItem>
                    {context?.users.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                  return (
                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as TaskStatus]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                }}
              />
              <Legend wrapperStyle={{fontSize: "14px"}}/>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No task data available.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
