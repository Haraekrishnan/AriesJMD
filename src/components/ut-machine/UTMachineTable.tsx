'use client';

import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, FileText, BadgeHelp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format, isAfter } from 'date-fns';
import { UTMachine } from '@/lib/types';
import NewCertificateRequestDialog from '../inventory/NewCertificateRequestDialog';

interface UTMachineTableProps {
  onEdit: (machine: UTMachine) => void;
  onLogManager: (machine: UTMachine) => void;
}

export default function UTMachineTable({ onEdit, onLogManager }: UTMachineTableProps) {
  const { can, utMachines, deleteUTMachine } = useAppContext();
  const { toast } = useToast();
  const [isCertRequestOpen, setIsCertRequestOpen] = useState(false);
  const [selectedMachineForCert, setSelectedMachineForCert] = useState<UTMachine | null>(null);

  const handleDelete = (machineId: string) => {
    deleteUTMachine(machineId);
    toast({
      variant: 'destructive',
      title: 'UT Machine Deleted',
      description: 'The machine has been removed from the system.',
    });
  };

  const handleCertRequest = (machine: UTMachine) => {
      setSelectedMachineForCert(machine);
      setIsCertRequestOpen(true);
  }
  
  const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const isExpired = isAfter(new Date(), date);
      return <span className={isExpired ? 'text-destructive' : ''}>{format(date, 'dd-MM-yyyy')}</span>
  }

  if (utMachines.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
            No UT machines found.
        </div>
      )
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Machine Name</TableHead>
          <TableHead>Serial Number</TableHead>
          <TableHead>Calibration Due</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {utMachines.map(machine => (
          <TableRow key={machine.id}>
            <TableCell className="font-medium">{machine.machineName}</TableCell>
            <TableCell>{machine.serialNumber}</TableCell>
            <TableCell>{formatDate(machine.calibrationDueDate)}</TableCell>
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
                      <DropdownMenuItem onSelect={() => onLogManager(machine)}><FileText className="mr-2 h-4 w-4"/> View/Add Logs</DropdownMenuItem>
                       <DropdownMenuItem onSelect={() => handleCertRequest(machine)}><BadgeHelp className="mr-2 h-4 w-4"/> Request Certificate</DropdownMenuItem>
                      {can.manage_equipment_status && <DropdownMenuItem onSelect={() => onEdit(machine)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>}
                      {can.manage_equipment_status && <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></AlertDialogTrigger>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the machine {machine.machineName}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(machine.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
     {selectedMachineForCert && <NewCertificateRequestDialog isOpen={isCertRequestOpen} setIsOpen={setIsCertRequestOpen} utMachine={selectedMachineForCert} />}
    </>
  );
}
