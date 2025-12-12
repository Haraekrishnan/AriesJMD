
'use client';
import { useMemo, useState } from 'react';
import { useConsumable } from '@/contexts/consumable-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/dashboard/stat-card';
import { Package, PackageCheck, PackageX, PlusCircle, Edit, Trash2, TrendingDown, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import AddConsumableDialog from '@/components/requests/AddConsumableDialog';
import EditConsumableDialog from '@/components/requests/EditConsumableDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem, Role } from '@/lib/types';
import ConsumableIssueList from '@/components/requests/ConsumableIssueList';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { isThisMonth, parseISO } from 'date-fns';

export default function ConsumablesPage() {
  const { consumableItems, deleteConsumableItem } = useConsumable();
  const { can, user, internalRequests } = useAppContext();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const canManageConsumables = useMemo(() => {
    if (!user) return false;
    const allowedRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller', 'Store in Charge', 'Assistant Store Incharge'];
    return allowedRoles.includes(user.role);
  }, [user]);

  const { dailyConsumables, jobConsumables, summary, consumptionMetrics } = useMemo(() => {
    const daily: any[] = [];
    const job: any[] = [];
    let lowStockItems = 0;
    
    consumableItems.forEach(item => {
      if ((item.quantity || 0) <= 5) { // Assuming low stock is 5 or less
        lowStockItems++;
      }
      if (item.category === 'Daily Consumable') {
        daily.push(item);
      } else if (item.category === 'Job Consumable') {
        job.push(item);
      }
    });
    
    const consumableItemIds = new Set(consumableItems.map(i => i.id));
    let consumptionThisMonth = 0;
    let overallConsumption = 0;

    internalRequests.forEach(req => {
        if (!req.items) return;
        req.items.forEach(item => {
            if (item.inventoryItemId && consumableItemIds.has(item.inventoryItemId) && item.status === 'Issued') {
                const issuedQuantity = item.quantity || 0;
                overallConsumption += issuedQuantity;
                
                const issuedDate = (item as any).issuedDate;
                if (issuedDate && isThisMonth(parseISO(issuedDate))) {
                    consumptionThisMonth += issuedQuantity;
                }
            }
        });
    });

    return {
      dailyConsumables: daily,
      jobConsumables: job,
      summary: { lowStockItems },
      consumptionMetrics: { consumptionThisMonth, overallConsumption }
    };
  }, [consumableItems, internalRequests]);

  const handleDelete = (item: InventoryItem) => {
    deleteConsumableItem(item.id);
    toast({ variant: 'destructive', title: 'Consumable Deleted', description: `${item.name} has been removed.` });
  };
  
   if (!canManageConsumables) {
        return (
           <Card className="w-full max-w-md mx-auto mt-20">
               <CardHeader className="text-center items-center">
                   <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                       <AlertTriangle className="h-10 w-10 text-destructive" />
                   </div>
                   <CardTitle>Access Denied</CardTitle>
                   <CardDescription>You do not have permission to view the Consumables page.</CardDescription>
               </CardHeader>
           </Card>
       );
   }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consumable Items</h1>
          <p className="text-muted-foreground">Manage stock levels for daily and job-specific consumables.</p>
        </div>
        {canManageConsumables && (
            <Button onClick={() => setIsAddOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Consumable
            </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard 
            title="Consumption This Month"
            value={consumptionMetrics.consumptionThisMonth}
            icon={TrendingDown}
            description="Total quantity of items issued this month."
        />
        <StatCard 
            title="Overall Consumption"
            value={consumptionMetrics.overallConsumption}
            icon={ShoppingCart}
            description="Total quantity of all items issued historically."
        />
        <StatCard 
            title="Low Stock Items"
            value={summary.lowStockItems}
            icon={PackageX}
            description="Items with quantity of 5 or less."
            className={summary.lowStockItems > 0 ? "border-destructive" : ""}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Consumables</CardTitle>
          <CardDescription>Items used on a daily basis, tracked by quantity.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Remarks</TableHead>
                {canManageConsumables && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyConsumables.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant={(item.quantity || 0) <= 5 ? 'destructive' : 'secondary'}>{item.quantity || 0}</Badge>
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.remarks}</TableCell>
                  {canManageConsumables && (
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}><Edit className="h-4 w-4"/></Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete {item.name}.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(item)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Consumables</CardTitle>
          <CardDescription>Items used for specific jobs, tracked by quantity.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Remarks</TableHead>
                {canManageConsumables && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobConsumables.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                     <Badge variant={(item.quantity || 0) <= 5 ? 'destructive' : 'secondary'}>{item.quantity || 0}</Badge>
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.remarks}</TableCell>
                   {canManageConsumables && (
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}><Edit className="h-4 w-4"/></Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete {item.name}.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(item)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-lg font-semibold bg-muted/50 p-4 rounded-t-lg hover:no-underline">Issued Consumables History</AccordionTrigger>
          <AccordionContent className="border border-t-0 rounded-b-lg p-4">
            <ConsumableIssueList />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {canManageConsumables && (
        <>
            <AddConsumableDialog isOpen={isAddOpen} setIsOpen={setIsAddOpen} />
            {editingItem && <EditConsumableDialog isOpen={!!editingItem} setIsOpen={() => setEditingItem(null)} item={editingItem} />}
        </>
      )}
    </div>
  );
}
