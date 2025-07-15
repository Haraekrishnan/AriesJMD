
'use client';

import { useState, useMemo } from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMonth, getYear, parseISO, format } from 'date-fns';
import type { Task } from '@/types';

type TasksCompletedChartProps = {
  tasks: Task[];
};

export function TasksCompletedChart({ tasks }: TasksCompletedChartProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const chartData = useMemo(() => {
    const data: { name: string; 'Tasks Completed': number }[] = [
      { name: 'Jan', 'Tasks Completed': 0 }, { name: 'Feb', 'Tasks Completed': 0 }, { name: 'Mar', 'Tasks Completed': 0 },
      { name: 'Apr', 'Tasks Completed': 0 }, { name: 'May', 'Tasks Completed': 0 }, { name: 'Jun', 'Tasks Completed': 0 },
      { name: 'Jul', 'Tasks Completed': 0 }, { name: 'Aug', 'Tasks Completed': 0 }, { name: 'Sep', 'Tasks Completed': 0 },
      { name: 'Oct', 'Tasks Completed': 0 }, { name: 'Nov', 'Tasks Completed': 0 }, { name: 'Dec', 'Tasks Completed': 0 },
    ];

    tasks.forEach(task => {
      if (task.status === 'Completed' || task.status === 'Done') {
        const taskDate = parseISO(task.dueDate);
        if (getYear(taskDate).toString() === selectedYear) {
          const monthIndex = getMonth(taskDate);
          data[monthIndex]['Tasks Completed'] += 1;
        }
      }
    });

    return data;
  }, [tasks, selectedYear]);
  
  const availableYears = useMemo(() => {
    if (!tasks) return [new Date().getFullYear()];
    const years = new Set(tasks.map(t => getYear(parseISO(t.dueDate))));
    if (!years.has(new Date().getFullYear())) {
        years.add(new Date().getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [tasks]);


  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tasks Completed</CardTitle>
            <CardDescription>Monthly task completion for {selectedYear}.</CardDescription>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
              }}
            />
            <Legend wrapperStyle={{fontSize: "14px"}}/>
            <Line type="monotone" dataKey="Tasks Completed" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
