'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MoreHorizontal, Edit, Trash2, BookMarked } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import type { DftMachine } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface DftMachineTableProps {
  onEdit: (machine: DftMachine) => void;
  onLogManager: (machine: DftMachine) => void;
}

export default function DftMachineTable({ onEdit, onLogManager }: DftMachineTableProps) {
    const { can, dftMachines, projects, deleteDftMachine } = useAppContext();
    const { toast } = useToast();

    const machinesWithProject = useMemo(() => {
        return dftMachines.map(machine => ({
            ...machine,
            projectName: projects.find(p => p.id === machine.projectId)?.name || 'N/A'
        }));
    }, [dftMachines, projects]);
    
    const isDatePast = (date: string) => isPast(new Date(date));

    const handleDelete = (machineId: string) => {
        deleteDftMachine(machineId);
        toast({ variant: 'destructive', title: 'Machine Deleted' });
    };

    if (machinesWithProject.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No DFT machines found.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Machine Name</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Calibration Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {machinesWithProject.map(machine => (
                    <TableRow key={machine.id}>
                        <TableCell className="font-medium">{machine.machineName}</TableCell>
                        <TableCell>{machine.serialNumber}</TableCell>
                        <TableCell>{machine.projectName}</TableCell>
                        <TableCell className={cn(isDatePast(machine.calibrationDueDate) && 'text-destructive font-bold')}>
                            {format(new Date(machine.calibrationDueDate), 'dd-MM-yyyy')}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{machine.status}</Badge></TableCell>
                        <TableCell className="text-right">
                             <AlertDialog>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => onLogManager(machine)}><BookMarked className="mr-2 h-4 w-4"/>Usage Log</DropdownMenuItem>
                                        {can.manage_equipment_status && <DropdownMenuItem onSelect={() => onEdit(machine)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>}
                                        {can.manage_equipment_status && <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem></AlertDialogTrigger>}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the machine record.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(machine.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
