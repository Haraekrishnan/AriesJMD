'use client';
import { useState, useMemo } from 'react';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { WorkOrder } from '@/lib/types';
import AddWorkOrderDialog from './AddWorkOrderDialog';
import EditWorkOrderDialog from './EditWorkOrderDialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { Badge } from '../ui/badge';

export default function WorkOrderManagement() {
    const { workOrders, deleteWorkOrder } = useGeneral();
    const { toast } = useToast();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);

    const sortedWorkOrders = useMemo(() => {
      if (!workOrders) return [];
      return [...workOrders].sort((a, b) => a.number.localeCompare(b.number));
    }, [workOrders]);

    const handleDelete = (id: string, number: string) => {
        deleteWorkOrder(id);
        toast({ title: 'ARC Number Deleted', description: `Number ${number} has been removed.`, variant: 'destructive' });
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsAddOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add ARC Number
                </Button>
            </div>
            <WorkOrderTable 
                orders={sortedWorkOrders} 
                onEdit={setEditingWorkOrder}
                onDelete={handleDelete}
            />
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
                    <TableHead>ARC Number</TableHead>
                    <TableHead>Associated FO Numbers</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map(order => (
                    <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.number}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {order.foNumbers?.map((fo, index) => (
                              <Badge key={index} variant="secondary">{fo}</Badge>
                            ))}
                            {(!order.foNumbers || order.foNumbers.length === 0) && (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
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
                                            <AlertDialogDescription>This will permanently delete this ARC number and all associated FO numbers.</AlertDialogDescription>
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
                        <TableCell colSpan={3} className="text-center h-24">No ARC numbers found.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}