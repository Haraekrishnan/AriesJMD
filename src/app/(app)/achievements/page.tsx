import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AchievementsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Achievements</h1>
       <Card>
        <CardHeader>
            <CardTitle>Performance Index & Awards</CardTitle>
            <CardDescription>Rank employees and manage manual awards.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will show the employee performance index and a table for managing manual awards.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
