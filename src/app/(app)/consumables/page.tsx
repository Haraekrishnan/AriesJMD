
'use client';
import { useMemo, useState, useEffect } from 'react';
import { useConsumable } from '@/contexts/consumable-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/dashboard/stat-card';
import { Package, PackageCheck, PackageX, PlusCircle, Edit, Trash2, TrendingDown, ShoppingCart, AlertTriangle, Inbox, Search, FileDown, Upload } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import AddConsumableDialog from '@/components/requests/AddConsumableDialog';
import EditConsumableDialog from '@/components/requests/EditConsumableDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem, Role, ConsumableInwardRecord } from '@/lib/types';
import ConsumableIssueList from '@/components/requests/ConsumableIssueList';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { isThisMonth, parseISO, isValid, format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Input } from '@/components/ui/input';
import EditConsumableInwardDialog from '@/components/requests/EditConsumableInwardDialog';
import { Separator } from '@/components/ui/separator';
import ConsumableReportDownloads from '@/components/requests/ConsumableReportDownloads';
import ImportConsumablesDialog from '@/components/requests/ImportConsumablesDialog';

const inwardSchema = z.object({
  itemId: z.string().min(1, 'Please select an item.'),
  date: z.date({ required_error: "Date is required" }),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
});

type InwardFormValues = z.infer<typeof inwardSchema>;


export default function ConsumablesPage() {
  const { consumableItems, deleteConsumableItem, consumableInwardHistory, addConsumableInwardRecord, deleteConsumableInwardRecord } = useConsumable();
  const { can, user, internalRequests, users } = useAppContext();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingInwardRecord, setEditingInwardRecord] = useState<ConsumableInwardRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const inwardForm = useForm<InwardFormValues>({
    resolver: zodResolver(inwardSchema),
    defaultValues: { date: new Date(), quantity: 1 }
  });

  const canManageConsumables = useMemo(() => {
    if (!user) return false;
    const allowedRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller', 'Store in Charge', 'Assistant Store Incharge'];
    return allowedRoles.includes(user.role);
  }, [user]);

  const { dailyConsumables, jobConsumables, summary, consumptionMetrics } = useMemo(() => {
    let lowStockItems = 0;
    
    const filteredItems = searchTerm 
      ? consumableItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : consumableItems;

    const daily: any[] = [];
    const job: any[] = [];

    filteredItems.forEach(item => {
      if (item.category === 'Daily Consumable') {
        daily.push(item);
      } else if (item.category === 'Job Consumable') {
        job.push(item);
      }
    });

    // Low stock count should be based on all items, not just filtered ones
    consumableItems.forEach(item => {
      if ((item.quantity || 0) <= 5) { 
        lowStockItems++;
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
  }, [consumableItems, internalRequests, searchTerm]);

  const handleDelete = (item: InventoryItem) => {
    deleteConsumableItem(item.id);
    toast({ variant: 'destructive', title: 'Consumable Deleted', description: `${item.name} has been removed.` });
  };

  const handleInwardSubmit = (data: InwardFormValues) => {
    addConsumableInwardRecord(data.itemId, data.quantity, data.date);
    toast({ title: 'Stock Added', description: 'Inward stock has been added and stock levels updated.' });
    inwardForm.reset({ date: new Date(), quantity: 1, itemId: '' });
  };
  
  const handleDeleteInwardRecord = (record: ConsumableInwardRecord) => {
    deleteConsumableInwardRecord(record);
    toast({ variant: 'destructive', title: 'Record Deleted', description: 'The inward stock record has been removed and stock levels adjusted.' });
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
        <div className="flex items-center gap-2">
            <ConsumableReportDownloads />
            {canManageConsumables && (
              <>
                <Button onClick={() => setIsImportOpen(true)} variant="outline"><Upload className="mr-2 h-4 w-4"/> Import</Button>
                <Button onClick={() => setIsAddOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add Consumable
                </Button>
              </>
            )}
        </div>
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search consumable items by name..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {canManageConsumables && (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="inward-register">
                <Card className="border-0">
                    <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline rounded-t-lg text-lg font-semibold">
                       <div className="flex items-center gap-2">
                           <Inbox/> Inward Register
                       </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 rounded-b-lg border border-t-0">
                        <form onSubmit={inwardForm.handleSubmit(handleInwardSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>Consumable Item</Label>
                                    <Controller name="itemId" control={inwardForm.control} render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select item"/></SelectTrigger>
                                            <SelectContent>{consumableItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    )} />
                                    {inwardForm.formState.errors.itemId && <p className="text-xs text-destructive">{inwardForm.formState.errors.itemId.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Quantity Added</Label>
                                    <Input type="number" {...inwardForm.register('quantity')} />
                                    {inwardForm.formState.errors.quantity && <p className="text-xs text-destructive">{inwardForm.formState.errors.quantity.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Controller name="date" control={inwardForm.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                                    {inwardForm.formState.errors.date && <p className="text-xs text-destructive">{inwardForm.formState.errors.date.message}</p>}
                                </div>
                            </div>
                            <Button type="submit">Add to Stock</Button>
                        </form>
                        <Separator className="my-6" />
                         <h4 className="font-semibold text-md mb-2">Inward History</h4>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Item</TableHead>
                                      <TableHead>Quantity</TableHead>
                                      <TableHead>Added By</TableHead>
                                      {user?.role === 'Admin' && <TableHead className="text-right">Actions</TableHead>}
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {(consumableInwardHistory || []).sort((a, b) => {
                                      const dateA = a?.date ? new Date(a.date).getTime() : 0;
                                      const dateB = b?.date ? new Date(b.date).getTime() : 0;
                                      return dateB - dateA;
                                  }).map(record => {
                                      const date = record.date ? parseISO(record.date) : null;
                                      const addedBy = users.find(u => u.id === record.addedByUserId);
                                      const item = consumableItems.find(i => i.id === record.itemId);
                                      return (
                                      <TableRow key={record.id}>
                                          <TableCell>{date && isValid(date) ? format(date, 'dd MMM, yyyy') : 'Invalid Date'}</TableCell>
                                          <TableCell>{item?.name || 'Unknown Item'}</TableCell>
                                          <TableCell>{record.quantity}</TableCell>
                                          <TableCell>{addedBy?.name || 'Unknown'}</TableCell>
                                          {user?.role === 'Admin' && (
                                              <TableCell className="text-right">
                                                  <Button variant="ghost" size="icon" onClick={() => setEditingInwardRecord(record)}><Edit className="h-4 w-4"/></Button>
                                                  <AlertDialog>
                                                      <AlertDialogTrigger asChild>
                                                          <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                                      </AlertDialogTrigger>
                                                      <AlertDialogContent>
                                                          <AlertDialogHeader>
                                                              <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                                              <AlertDialogDescription>This will permanently delete this inward record and update the stock levels. This action cannot be undone.</AlertDialogDescription>
                                                          </AlertDialogHeader>
                                                          <AlertDialogFooter>
                                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                              <AlertDialogAction onClick={() => handleDeleteInwardRecord(record)}>Delete</AlertDialogAction>
                                                          </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                  </AlertDialog>
                                              </TableCell>
                                          )}
                                      </TableRow>
                                  )})}
                              </TableBody>
                          </Table>
                          {(consumableInwardHistory || []).length === 0 && <p className="text-center text-muted-foreground py-4">No inward history found.</p>}
                    </AccordionContent>
                </Card>
            </AccordionItem>
        </Accordion>
      )}

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
           {dailyConsumables.length === 0 && <p className="text-center py-4 text-muted-foreground">No daily consumables found.</p>}
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
          {jobConsumables.length === 0 && <p className="text-center py-4 text-muted-foreground">No job consumables found.</p>}
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
            {editingInwardRecord && <EditConsumableInwardDialog isOpen={!!editingInwardRecord} setIsOpen={() => setEditingInwardRecord(null)} record={editingInwardRecord} />}
            <ImportConsumablesDialog isOpen={isImportOpen} setIsOpen={setIsImportOpen} />
        </>
      )}
    </div>
  );
}
