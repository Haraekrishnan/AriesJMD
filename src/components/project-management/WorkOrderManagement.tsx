'use client';
import { useState, useMemo } from 'react';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { WorkOrder } from '@/lib/types';
import AddWorkOrderDialog from './AddWorkOrderDialog';
import EditWorkOrderDialog from './EditWorkOrderDialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';

export default function WorkOrderManagement() {
    const { workOrders, deleteWorkOrder } = useGeneral();
    const { toast } = useToast();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);

    const { woNumbers, arcOtcNumbers } = useMemo(() => {
        const wo: WorkOrder[] = [];
        const arc: WorkOrder[] = [];
        (workOrders || []).forEach(w => {
            if (w.type === 'WO') wo.push(w);
            else arc.push(w);
        });
        return { woNumbers: wo, arcOtcNumbers: arc };
    }, [workOrders]);

    const handleDelete = (id: string, number: string) => {
        deleteWorkOrder(id);
        toast({ title: 'Work Order Deleted', description: `Number ${number} has been removed.`, variant: 'destructive' });
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsAddOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Work Order No.
                </Button>
            </div>
            <Tabs defaultValue="wo">
                <TabsList>
                    <TabsTrigger value="wo">WO Numbers</TabsTrigger>
                    <TabsTrigger value="arc-otc">ARC/OTC WO Numbers</TabsTrigger>
                </TabsList>
                <TabsContent value="wo" className="mt-4">
                    <WorkOrderTable 
                        orders={woNumbers} 
                        onEdit={setEditingWorkOrder}
                        onDelete={handleDelete}
                    />
                </TabsContent>
                <TabsContent value="arc-otc" className="mt-4">
                     <WorkOrderTable 
                        orders={arcOtcNumbers} 
                        onEdit={setEditingWorkOrder}
                        onDelete={handleDelete}
                    />
                </TabsContent>
            </Tabs>
            <AddWorkOrderDialog isOpen={isAddOpen} setIsOpen={setIsAddOpen} />
            {editingWorkOrder && (
                <EditWorkOrderDialog 
                    isOpen={!!editingWorkOrder} 
                    setIsOpen={() => setEditingWorkOrder(null)} 
                    workOrder={editingWorkOrder}
                />
            )}
        </>
    );
}


function WorkOrderTable({ orders, onEdit, onDelete }: { orders: WorkOrder[], onEdit: (wo: WorkOrder) => void, onDelete: (id: string, num: string) => void }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map(order => (
                    <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.number}</TableCell>
                        <TableCell className="text-right">
                             <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => onEdit(order)}>
                                    <Edit className="h-4 w-4"/>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete this work order number.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(order.id, order.number)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
                {orders.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={2} className="text-center h-24">No work order numbers found.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
