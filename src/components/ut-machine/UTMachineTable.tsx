'use client';
import { useAppContext } from '@/hooks/use-app-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, List, FilePlus } from 'lucide-react';
import type { UTMachine } from '@/types';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';

type UTMachineTableProps = {
    onEdit: (machine: UTMachine) => void;
    onLogManager: (machine: UTMachine) => void;
};

export default function UTMachineTable({ onEdit, onLogManager }: UTMachineTableProps) {
    const { can, utMachines, deleteUTMachine } = useAppContext();
    
    if (utMachines.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No UT machines found.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Machine Name</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Calibration Due</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {utMachines.map(machine => (
                    <TableRow key={machine.id}>
                        <TableCell className="font-medium">{machine.machineName}</TableCell>
                        <TableCell>{machine.serialNumber}</TableCell>
                        <TableCell>{format(new Date(machine.calibrationDueDate), 'dd MMM, yyyy')}</TableCell>
                        <TableCell className="text-right space-x-2">
                             <Button variant="outline" size="sm" onClick={() => onLogManager(machine)}>
                                <List className="mr-1 h-3 w-3" /> Logs
                            </Button>
                            {can.manage_equipment_status && (
                                <>
                                    <Button variant="ghost" size="sm">
                                        <FilePlus className="mr-1 h-3 w-3"/> Request Cert.
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => onEdit(machine)}>
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
                                                <AlertDialogTitle>Delete {machine.machineName}?</AlertDialogTitle>
                                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteUTMachine(machine.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}