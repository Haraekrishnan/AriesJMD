import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function IncidentReportingPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Incident Reporting</h1>
       <Card>
        <CardHeader>
            <CardTitle>Workplace Incident Log</CardTitle>
            <CardDescription>Report and track incidents.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will contain a system for logging and tracking workplace incidents.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
