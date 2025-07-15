import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ManpowerPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Manpower</h1>
       <Card>
        <CardHeader>
            <CardTitle>Daily Manpower Summary</CardTitle>
            <CardDescription>Log and view daily manpower counts per project.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will show a daily summary of manpower and allow authorized users to log numbers.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
