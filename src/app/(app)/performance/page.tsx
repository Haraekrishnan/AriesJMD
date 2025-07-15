import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
            <p className="text-muted-foreground">
                This page will display bar charts of task distribution and a detailed statistics table for each employee.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
