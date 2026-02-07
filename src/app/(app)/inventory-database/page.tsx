'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import InventorySheet from '@/components/inventory/InventorySheet';

export default function InventoryDatabasePage() {
    const { can } = useAppContext();

    if (!can.view_inventory_database) {
        return (
           <Card className="w-full max-w-md mx-auto mt-20">
               <CardHeader className="text-center items-center">
                   <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                       <AlertTriangle className="h-10 w-10 text-destructive" />
                   </div>
                   <CardTitle>Access Denied</CardTitle>
                   <CardDescription>You do not have permission to view the Inventory Database.</CardDescription>
               </CardHeader>
           </Card>
       );
   }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Inventory Database</h1>
                <p className="text-muted-foreground">Directly edit inventory records in a spreadsheet-like interface. All changes are saved automatically.</p>
            </div>
            <Tabs defaultValue="harness">
                <TabsList>
                    <TabsTrigger value="harness">Harness</TabsTrigger>
                    <TabsTrigger value="tripod">Tripod</TabsTrigger>
                    <TabsTrigger value="lifeline">Lifeline</TabsTrigger>
                    <TabsTrigger value="gas_detectors">Gas Detectors</TabsTrigger>
                </TabsList>
                <TabsContent value="harness">
                    <InventorySheet category="harness" />
                </TabsContent>
                <TabsContent value="tripod">
                    <InventorySheet category="tripod" />
                </TabsContent>
                <TabsContent value="lifeline">
                    <InventorySheet category="lifeline" />
                </TabsContent>
                <TabsContent value="gas_detectors">
                    <InventorySheet category="gas_detectors" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
