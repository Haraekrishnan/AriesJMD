
'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

interface PerformanceChartProps {
  data: any[];
}

export default function EmployeePerformanceChart({ data }: PerformanceChartProps) {
  return (
    <div className="h-[450px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 30, right: 20, left: -10, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" />
          <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip 
            cursor={{fill: 'hsl(var(--muted))'}}
            contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)'
            }}
          />
          <Legend verticalAlign="top" wrapperStyle={{fontSize: "14px", paddingBottom: "10px"}}/>
          <Bar dataKey="todo" fill="hsl(var(--chart-1))" name="To Do" radius={[4, 4, 0, 0]} />
          <Bar dataKey="inProgress" fill="hsl(var(--chart-3))" name="In Progress" radius={[4, 4, 0, 0]} />
          <Bar dataKey="completed" fill="hsl(var(--chart-2))" name="Completed" radius={[4, 4, 0, 0]} />
          <Bar dataKey="overdue" fill="hsl(var(--destructive))" name="Overdue" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
