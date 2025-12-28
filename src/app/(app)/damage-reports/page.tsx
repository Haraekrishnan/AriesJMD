'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import NewDamageReportDialog from '@/components/damage-reports/NewDamageReportDialog';
import DamageReportList from '@/components/damage-reports/DamageReportList';
import { useAppContext } from '@/contexts/app-provider';

export default function DamageReportsPage() {
    const { can } = useAppContext();
    const [isNewReportOpen, setIsNewReportOpen] = useState(false);

    if (!can.manage_inventory) {
         return (
            <Card className="w-full max-w-md mx-auto mt-20">
               <CardHeader className="text-center items-center">
                   <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                       <AlertTriangle className="h-10 w-10 text-destructive" />
                   </div>
                   <CardTitle>Access Denied</CardTitle>
                   <CardDescription>You do not have permission to view damage reports.</CardDescription>
               </CardHeader>
           </Card>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Damage Reports</h1>
                    <p className="text-muted-foreground">Report and track damaged equipment and items.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Submitted Reports</CardTitle>
                    <CardDescription>A log of all damage reports submitted across projects.</CardDescription>
                </CardHeader>
                <CardContent>
                    <DamageReportList />
                </CardContent>
            </Card>

            <NewDamageReportDialog isOpen={isNewReportOpen} setIsOpen={setIsNewReportOpen} />
        </div>
    );
}
