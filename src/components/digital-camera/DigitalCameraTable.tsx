
'use client';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DigitalCamera } from '@/lib/types';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface DigitalCameraTableProps {
  items: DigitalCamera[];
  onEdit: (item: DigitalCamera) => void;
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

export default function DigitalCameraTable({ items, onEdit }: DigitalCameraTableProps) {
  const { can, projects, deleteDigitalCamera } = useAppContext();
  const { toast } = useToast();

  const handleDelete = (itemId: string) => {
    deleteDigitalCamera(itemId);
    toast({
      variant: 'destructive',
      title: 'Item Deleted',
      description: 'The equipment entry has been removed.',
    });
  };
  
  if (items.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No digital cameras found.</p>;
  }

  return (
    <ScrollArea className="h-96">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Make & Model</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              {can.manage_equipment_status && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => {
                const project = projects.find(p => p.id === item.projectId);
                return (
                    <TableRow key={item.id}>
                        <TableCell><p className="font-medium">{item.make}</p><p className="text-xs text-muted-foreground">{item.model}</p></TableCell>
                        <TableCell>{item.serialNumber}</TableCell>
                        <TableCell>{project?.name || 'N/A'}</TableCell>
                        <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
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
      </div>
    </ScrollArea>
  );
}
