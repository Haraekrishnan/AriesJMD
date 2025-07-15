import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function VehicleStatusPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
       <Card>
        <CardHeader>
            <CardTitle>Vehicle & Driver Status</CardTitle>
            <CardDescription>Track vehicle documents and driver licenses.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will provide a tabbed interface for managing the company's vehicle fleet and driver information.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
