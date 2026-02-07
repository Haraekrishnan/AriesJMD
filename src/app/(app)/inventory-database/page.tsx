'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventorySheet from '@/components/inventory/InventorySheet';
import { useAppContext } from '@/contexts/app-provider';
import { AlertTriangle } from 'lucide-react';

export default function InventoryDatabasePage() {
    const { can } = useAppContext();
    const [activeTab, setActiveTab] = useState('harness');

    if (!can.view_inventory_database) {
        return (
             <Card className="w-full max-w-md mx-auto mt-20">
                <CardHeader className="text-center items-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to view the inventory database.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const inventoryCategories = ['harness', 'tripod', 'lifeline', 'gas_detectors'];

    return (
        <div className="h-full flex flex-col space-y-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Inventory Database</h1>
                <p className="text-muted-foreground">
                    Directly edit inventory items in a spreadsheet-like interface. All changes are saved automatically.
                </p>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList>
                    {inventoryCategories.map(cat => (
                        <TabsTrigger key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}</TabsTrigger>
                    ))}
                </TabsList>
                {inventoryCategories.map(cat => (
                    <TabsContent key={cat} value={cat} className="flex-1 mt-4">
                        <InventorySheet category={cat as any} />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
