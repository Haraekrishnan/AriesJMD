
'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, getYear, getMonth, parseISO } from 'date-fns';
import type { Task } from '@/lib/types';

interface TasksCompletedChartProps {
    tasks: Task[];
}

export default function TasksCompletedChart({ tasks }: TasksCompletedChartProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const availableYears = useMemo(() => {
    const years = new Set(tasks.map(t => getYear(parseISO(t.dueDate))));
    if (!years.has(new Date().getFullYear())) {
      years.add(new Date().getFullYear());
    }
    return Array.from(years).sort((a,b) => b - a);
  }, [tasks]);

  const chartData = useMemo(() => {
    const year = parseInt(selectedYear, 10);
    const completedTasks = tasks.filter(t => t.status === 'Done' && t.completionDate && getYear(parseISO(t.completionDate)) === year);

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: format(new Date(year, i), 'MMM'),
      'Tasks Completed': 0,
    }));

    completedTasks.forEach(task => {
      const monthIndex = getMonth(parseISO(task.completionDate!));
      monthlyData[monthIndex]['Tasks Completed']++;
    });

    return monthlyData;
  }, [tasks, selectedYear]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Tasks Completed per Month</CardTitle>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="line"/>
              <Line type="monotone" dataKey="Tasks Completed" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
