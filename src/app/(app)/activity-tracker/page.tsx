import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ActivityTrackerPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Activity Tracker</h1>
       <Card>
        <CardHeader>
            <CardTitle>User Activity Log</CardTitle>
            <CardDescription>Admin-only view of user activities.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will display a log of user activities, such as logins and major actions, visible only to administrators.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
