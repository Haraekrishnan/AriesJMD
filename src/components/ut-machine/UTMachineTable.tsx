
'use client';

import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, FileText, BadgeHelp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format, isPast } from 'date-fns';
import { UTMachine } from '@/lib/types';
import NewCertificateRequestDialog from '../inventory/NewCertificateRequestDialog';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface UTMachineTableProps {
  onEdit: (machine: UTMachine) => void;
  onLogManager: (machine: UTMachine) => void;
}

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "success" => {
    switch (status) {
        case 'In Service': return 'success';
        case 'Under Maintenance': return 'secondary';
        case 'Damaged': return 'destructive';
        case 'Out of Service': return 'destructive';
        default: return 'outline';
    }
}

export default function UTMachineTable({ onEdit, onLogManager }: UTMachineTableProps) {
  const { can, utMachines, projects, deleteUTMachine } = useAppContext();
  const { toast } = useToast();
  const [isCertRequestOpen, setIsCertRequestOpen] = useState(false);
  const [selectedMachineForCert, setSelectedMachineForCert] = useState<UTMachine | null>(null);

  const machinesWithProject = useMemo(() => {
    return utMachines.map(machine => ({
        ...machine,
        projectName: projects.find(p => p.id === machine.projectId)?.name || 'N/A'
    }));
  }, [utMachines, projects]);
    
  const isDatePast = (date: string) => isPast(new Date(date));

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

  if (machinesWithProject.length === 0) {
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
            <TableCell><Badge variant={getStatusVariant(machine.status)}>{machine.status}</Badge></TableCell>
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
