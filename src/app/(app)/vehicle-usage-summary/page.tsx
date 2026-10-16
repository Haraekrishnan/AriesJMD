
'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import VehicleUsageSheet from '@/components/vehicle-usage-summary/VehicleUsageSheet';
import { AlertTriangle, Notebook } from 'lucide-react';

export default function VehicleUsageSummaryPage() {
    const { can } = useAuth();

    if (!can.manage_vehicle_usage && !can.view_all) {
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
    
    return <VehicleUsageSheet />;
}
