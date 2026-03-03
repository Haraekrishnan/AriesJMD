
'use client';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, Link as LinkIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { OtherEquipment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';

interface OtherEquipmentTableProps {
  items: OtherEquipment[];
  onEdit: (item: OtherEquipment) => void;
}

export default function OtherEquipmentTable({ items, onEdit }: OtherEquipmentTableProps) {
  const { can, projects, deleteOtherEquipment } = useAppContext();
  const { toast } = useToast();

  const handleDelete = (itemId: string) => {
    deleteOtherEquipment(itemId);
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
    return <p className="text-muted-foreground text-center py-8">No other equipments found.</p>;
  }

  return (
    <ScrollArea className="h-96">
      <div className="overflow-x-auto">
        <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sl. No.</TableHead>
              <TableHead>Equipment Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Aries ID</TableHead>
              <TableHead>Project</TableHead>
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
                        <TableCell><p className="font-medium">{item.equipmentName}</p></TableCell>
                        <TableCell>{item.category || 'N/A'}</TableCell>
                        <TableCell>{item.serialNumber}</TableCell>
                        <TableCell>{item.ariesId || 'N/A'}</TableCell>
                        <TableCell>{project?.name || 'N/A'}</TableCell>
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
                            <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => onEdit(item)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this entry.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                        )}
                    </TableRow>
                )
            })}
          </TableBody>
        </Table>
        </TooltipProvider>
      </div>
    </ScrollArea>
  );
}
