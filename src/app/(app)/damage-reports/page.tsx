'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer, PlusCircle } from 'lucide-react';
import NewDamageReportDialog from '@/components/damage-reports/NewDamageReportDialog';
import DamageReportList from '@/components/damage-reports/DamageReportList';

export default function DamageReportsPage() {
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Hammer /> Damage Reports
          </h1>
          <p className="text-muted-foreground">Report and track damaged equipment.</p>
        </div>
        <Button onClick={() => setIsNewReportOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Damage Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submitted Reports</CardTitle>
          <CardDescription>A list of all submitted damage reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <DamageReportList />
        </CardContent>
      </Card>

      <NewDamageReportDialog isOpen={isNewReportOpen} setIsOpen={setIsNewReportOpen} />
    </div>
  );
}
