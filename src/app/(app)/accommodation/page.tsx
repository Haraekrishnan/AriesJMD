import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AccommodationPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Accommodation</h1>
       <Card>
        <CardHeader>
            <CardTitle>Accommodation Management</CardTitle>
            <CardDescription>Manage buildings, rooms, and bed assignments.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will feature a visual layout to manage personnel accommodation assignments.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
