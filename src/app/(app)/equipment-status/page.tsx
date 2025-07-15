import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function EquipmentStatusPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Equipment Status</h1>
       <Card>
        <CardHeader>
            <CardTitle>Equipment Tracking</CardTitle>
            <CardDescription>Manage UT/DFT machines and other assets.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will have a tabbed interface to track status and calibration for all company equipment.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
