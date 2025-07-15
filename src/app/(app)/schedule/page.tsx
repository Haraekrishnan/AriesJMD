import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SchedulePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
       <Card>
        <CardHeader>
            <CardTitle>Schedule View</CardTitle>
            <CardDescription>Agenda-style view of events and notes.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will display an agenda-style list of events and daily notes for the next 30 days.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
