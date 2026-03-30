
'use client';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, PlusCircle, AlertTriangle } from 'lucide-react';
import NewObservationReportDialog from '@/components/observation-reports/NewObservationReportDialog';
import ObservationReportList from '@/components/observation-reports/ObservationReportList';

export default function ObservationReportsPage() {
  const { can } = useAppContext();
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);

  if (!can.manage_safety_observations) {
    return (
      <Card className="w-full max-w-md mx-auto mt-20">
        <CardHeader className="text-center items-center">
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You do not have permission to view this page.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShieldCheck /> Safety Observation Reports
          </h1>
          <p className="text-muted-foreground">Log and review safety observations from various sites.</p>
        </div>
        <Button onClick={() => setIsNewReportOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submitted Reports</CardTitle>
          <CardDescription>A log of all observation reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <ObservationReportList />
        </CardContent>
      </Card>

      <NewObservationReportDialog isOpen={isNewReportOpen} setIsOpen={setIsNewReportOpen} />
    </div>
  );
}

    