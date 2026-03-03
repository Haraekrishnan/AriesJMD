
'use client';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Link as LinkIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { WeldingMachine } from '@/lib/types';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface WeldingMachineTableProps {
  items: WeldingMachine[];
  onEdit: (item: WeldingMachine) => void;
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

export default function WeldingMachineTable({ items, onEdit }: WeldingMachineTableProps) {
  const { can, projects, deleteWeldingMachine } = useAppContext();
  const { toast } = useToast();

  const handleDelete = (itemId: string) => {
    deleteWeldingMachine(itemId);
    toast({
      variant: 'destructive',
      title: 'Item Deleted',
      description: 'The equipment entry has been removed.',
    });
  };

  const getDateStyles = (dateString?: string | null): string => {
    if (!dateString) return '';
    const date = parseISO(dateString);
    if (isPast(date)) return 'text-destructive font-bold';
    if (differenceInDays(date, new Date()) <= 30) return 'text-orange-500 font-semibold';
    return '';
  };
  
  if (items.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No welding machines found.</p>;
  }

  return (
    <ScrollArea className="h-96">
      <TooltipProvider>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sl. No.</TableHead>
              <TableHead>Make & Model</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Aries ID</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>TP Due Date</TableHead>
              <TableHead>Certificate</TableHead>
              <TableHead>Remarks</TableHead>
              {can.manage_equipment_status && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
                const project = projects.find(p => p.id === item.projectId);
                return (
                    <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <p className="font-medium">{item.make || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{item.model || 'N/A'}</p>
                        </TableCell>
                        <TableCell>{item.serialNumber}</TableCell>
                        <TableCell>{item.ariesId || 'N/A'}</TableCell>
                        <TableCell>{project?.name || 'N/A'}</TableCell>
                        <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
                        <TableCell className={cn(getDateStyles(item.tpInspectionDueDate))}>
                          {item.tpInspectionDueDate ? format(new Date(item.tpInspectionDueDate), 'dd-MM-yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {item.certificateUrl && (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                  <Button asChild variant="ghost" size="icon">
                                      <a href={item.certificateUrl} target="_blank" rel="noopener noreferrer"><LinkIcon className="h-4 w-4" /></a>
                                  </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Certificate</TooltipContent>
                              </Tooltip>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.remarks || 'N/A'}</TableCell>
                        {can.manage_equipment_status && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Edit className="h-4 w-4" /></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this entry.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                        )}
                    </TableRow>
                )
            })}
          </TableBody>
        </Table>
      </div>
      </TooltipProvider>
    </ScrollArea>
  );
}
