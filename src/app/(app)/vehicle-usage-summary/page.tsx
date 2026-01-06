'use client';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Notebook } from 'lucide-react';
import VehicleUsageSheet from '@/components/vehicle/VehicleUsageSheet';

export default function VehicleUsageSummaryPage() {
    const { can } = useAppContext();

    if (!can.manage_vehicle_usage) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
               <CardHeader className="text-center items-center">
                   <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                       <Notebook className="h-10 w-10 text-destructive" />
                   </div>
                   <CardTitle>Access Denied</CardTitle>
                   <CardDescription>You do not have permission to view vehicle usage summaries.</CardDescription>
               </CardHeader>
           </Card>
        );
    }
    
    return (
        <div className="h-[calc(100vh-10rem)] flex flex-col space-y-4">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Vehicle Usage Summary</h1>
                <p className="text-muted-foreground">
                    Track monthly vehicle usage, kilometers, and overtime.
                </p>
            </div>
            <div className="flex-1 min-h-0">
                <VehicleUsageSheet />
            </div>
        </div>
    );
}
