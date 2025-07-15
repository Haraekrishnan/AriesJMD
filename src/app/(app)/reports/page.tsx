import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
       <Card>
        <CardHeader>
            <CardTitle>Generate Reports</CardTitle>
            <CardDescription>Create and download custom task reports.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will provide functionality to generate and download filtered reports.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
