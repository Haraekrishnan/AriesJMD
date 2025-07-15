'use client';

import { useState, useMemo, useContext } from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppContext } from '@/context/app-context';
import { getMonth, getYear, parseISO } from 'date-fns';

export function TasksCompletedChart() {
  const context = useContext(AppContext);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const chartData = useMemo(() => {
    const data: { name: string; completed: number }[] = [
      { name: 'Jan', completed: 0 }, { name: 'Feb', completed: 0 }, { name: 'Mar', completed: 0 },
      { name: 'Apr', completed: 0 }, { name: 'May', completed: 0 }, { name: 'Jun', completed: 0 },
      { name: 'Jul', completed: 0 }, { name: 'Aug', completed: 0 }, { name: 'Sep', completed: 0 },
      { name: 'Oct', completed: 0 }, { name: 'Nov', completed: 0 }, { name: 'Dec', completed: 0 },
    ];

    context?.tasks.forEach(task => {
      if (task.status === 'Completed') {
        const taskDate = parseISO(task.dueDate);
        if (getYear(taskDate).toString() === selectedYear) {
          const monthIndex = getMonth(taskDate);
          data[monthIndex].completed += 1;
        }
      }
    });

    return data;
  }, [context?.tasks, selectedYear]);
  
  const availableYears = useMemo(() => {
    const years = new Set(context?.tasks.map(t => getYear(parseISO(t.dueDate))));
    return Array.from(years).sort((a, b) => b - a);
  }, [context?.tasks]);


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
            <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
