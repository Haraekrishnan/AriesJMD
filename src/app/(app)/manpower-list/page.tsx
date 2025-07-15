import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ManpowerListPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Manpower List</h1>
       <Card>
        <CardHeader>
            <CardTitle>All Manpower Profiles</CardTitle>
            <CardDescription>A comprehensive list of all personnel.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will contain a detailed, filterable table of all manpower profiles.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
