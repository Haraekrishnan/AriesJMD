
'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MoreHorizontal, Edit, Trash2, BookMarked, FileText, BadgeHelp, Link as LinkIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import type { UTMachine } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import NewCertificateRequestDialog from '../inventory/NewCertificateRequestDialog';

interface UTMachineTableProps {
  items: UTMachine[];
  onEdit: (machine: UTMachine) => void;
  onLogManager: (machine: UTMachine) => void;
}

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" => {
    switch (status) {
        case 'In Service': return 'success';
        case 'Idle': return 'warning';
        case 'Damaged': return 'destructive';
        case 'Out of Service': return 'destructive';
        default: return 'outline';
    }
}

export default function UTMachineTable({ items, onEdit, onLogManager }: UTMachineTableProps) {
    const { can, projects, deleteUTMachine } = useAppContext();
    const { toast } = useToast();
    const [isCertRequestOpen, setIsCertRequestOpen] = useState(false);
    const [selectedMachineForCert, setSelectedMachineForCert] = useState<UTMachine | null>(null);

    const machinesWithProject = useMemo(() => {
        return items.map(machine => ({
            ...machine,
            projectName: projects.find(p => p.id === machine.projectId)?.name || 'N/A'
        }));
    }, [items, projects]);
    
  const getDateStyles = (dateString?: string): string => {
    if (!dateString) return '';
    const date = parseISO(dateString);
    if (isPast(date)) {
        return 'text-destructive font-bold';
    }
    if (differenceInDays(date, new Date()) <= 30) {
        return 'text-orange-500 font-semibold';
    }
    return '';
  };

  const handleDelete = (machineId: string) => {
    deleteUTMachine(machineId);
    toast({ variant: 'destructive', title: 'Machine Deleted' });
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
    <div className="overflow-x-auto">
      <TooltipProvider>
      <Table>
          <TableHeader>
              <TableRow>
                  <TableHead>Machine Name</TableHead>
                  <TableHead>Aries ID</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Calibration Due</TableHead>
                  <TableHead>TP Insp. Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {machinesWithProject.map(machine => (
                  <TableRow key={machine.id}>
                      <TableCell className="font-medium">{machine.machineName}</TableCell>
                      <TableCell>{machine.ariesId || 'N/A'}</TableCell>
                      <TableCell>{machine.serialNumber}</TableCell>
                      <TableCell>{machine.projectName}</TableCell>
                      <TableCell className={cn(getDateStyles(machine.calibrationDueDate))}>
                          {format(new Date(machine.calibrationDueDate), 'dd-MM-yyyy')}
                      </TableCell>
                      <TableCell className={cn(getDateStyles(machine.tpInspectionDueDate))}>
                        {machine.tpInspectionDueDate ? format(new Date(machine.tpInspectionDueDate), 'dd-MM-yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell><Badge variant={getStatusVariant(machine.status)}>{machine.status}</Badge></TableCell>
                      <TableCell>
                          {machine.certificateUrl && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="ghost" size="icon">
                                        <a href={machine.certificateUrl} target="_blank" rel="noopener noreferrer"><LinkIcon className="h-4 w-4" /></a>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Certificate</TooltipContent>
                            </Tooltip>
                          )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{machine.remarks || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onLogManager(machine)}><FileText className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>View/Add Logs</p></TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleCertRequest(machine)}><BadgeHelp className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>Request Certificate</p></TooltipContent></Tooltip>
                              {can.manage_equipment_status && (
                                  <>
                                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onEdit(machine)}><Edit className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>Edit</p></TooltipContent></Tooltip>
                                  <AlertDialog>
                                      <Tooltip><TooltipTrigger asChild><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger></TooltipTrigger><TooltipContent><p>Delete</p></TooltipContent></Tooltip>
                                      <AlertDialogContent>
                                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the machine {machine.machineName}.</AlertDialogDescription></AlertDialogHeader>
                                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(machine.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                                  </>
                              )}
                          </div>
                      </TableCell>
                  </TableRow>
              ))}
          </TableBody>
      </Table>
      </TooltipProvider>
    </div>
    {selectedMachineForCert && <NewCertificateRequestDialog isOpen={isCertRequestOpen} setIsOpen={setIsCertRequestOpen} utMachine={selectedMachineForCert} />}
    </>
  );
}
