'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import EmployeePerformanceChart from "@/components/performance/EmployeePerformanceChart";

export default function PerformancePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
       <Card>
        <CardHeader>
            <CardTitle>Employee Performance</CardTitle>
            <CardDescription>Track task distribution and employee statistics.</CardDescription>
        </CardHeader>
        <CardContent>
            <EmployeePerformanceChart />
        </CardContent>
      </Card>
    </div>
  );
}
