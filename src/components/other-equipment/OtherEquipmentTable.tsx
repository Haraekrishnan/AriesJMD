'use client';
import { useAppContext } from '@/hooks/use-app-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { OtherEquipment } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';

type OtherEquipmentTableProps = {
    onEdit: (item: OtherEquipment) => void;
};

export default function OtherEquipmentTable({ onEdit }: OtherEquipmentTableProps) {
    const { can, otherEquipments, users, deleteOtherEquipment } = useAppContext();

    const getUserName = (userId: string) => {
        return users.find(u => u.id === userId)?.name || 'N/A';
    };
    
    if (otherEquipments.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No other equipment found.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Equipment Name</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Allotted To</TableHead>
                    <TableHead>Remarks</TableHead>
                    {can.manage_equipment_status && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {otherEquipments.map(item => (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.equipmentName}</TableCell>
                        <TableCell>{item.serialNumber}</TableCell>
                        <TableCell>{getUserName(item.allottedTo)}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.remarks}</TableCell>
                        {can.manage_equipment_status && (
                            <TableCell className="text-right space-x-2">
                                <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                                    <Edit className="mr-1 h-3 w-3" /> Edit
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="mr-1 h-3 w-3" /> Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete {item.equipmentName}?</AlertDialogTitle>
                                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteOtherEquipment(item.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}