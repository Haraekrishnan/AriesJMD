'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import InventorySheet from '@/components/inventory/InventorySheet';
import { AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function InventoryDatabasePage() {
    const { can, inventoryItems } = useAppContext();

    const inventoryCategories = useMemo(() => {
        if (!inventoryItems) return [];
        const categories = new Set(
            inventoryItems
                .filter(item => item.category === 'General' && !item.isArchived)
                .map(item => item.name)
        );
        return Array.from(categories).sort();
    }, [inventoryItems]);

    const [activeTab, setActiveTab] = useState<string | undefined>();

    useEffect(() => {
        if (inventoryCategories.length > 0 && !activeTab) {
            setActiveTab(inventoryCategories[0]);
        }
    }, [inventoryCategories, activeTab]);


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

    return (
        <div className="h-full flex flex-col space-y-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Inventory Database</h1>
                <p className="text-muted-foreground">
                    Directly edit inventory items in a spreadsheet-like interface. All changes are saved automatically.
                </p>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <TabsList className="inline-flex h-auto p-1">
                        {inventoryCategories.map(cat => (
                            <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                        ))}
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                {inventoryCategories.map(cat => (
                    <TabsContent key={cat} value={cat} className="flex-1 mt-4">
                        <InventorySheet category={cat} />
                    </TabsContent>
                ))}
                {inventoryCategories.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        No general inventory items found.
                    </div>
                )}
            </Tabs>
        </div>
    );
}
