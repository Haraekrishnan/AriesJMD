import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PlannerPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Monthly Planner</h1>
       <Card>
        <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Full-page calendar view for events.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will feature a full-page calendar for event planning and daily notes.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
