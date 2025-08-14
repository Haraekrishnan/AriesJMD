

'use client';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { OtherEquipment } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';

interface OtherEquipmentTableProps {
  onEdit: (item: OtherEquipment) => void;
}

export default function OtherEquipmentTable({ onEdit }: OtherEquipmentTableProps) {
  const { can, otherEquipments, users, deleteOtherEquipment } = useAppContext();
  const { toast } = useToast();

  const handleDelete = (itemId: string) => {
    deleteOtherEquipment(itemId);
    toast({
      variant: 'destructive',
      title: 'Item Deleted',
      description: 'The equipment entry has been removed.',
    });
  };
  
  if (otherEquipments.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No other equipments found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Equipment Name</TableHead>
            <TableHead>Serial Number</TableHead>
            <TableHead>Allotted To</TableHead>
            <TableHead>Remarks</TableHead>
            {can.manage_equipment_status && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {otherEquipments.map(item => {
              const allottedUser = users.find(u => u.id === item.allottedTo);
              return (
                  <TableRow key={item.id}>
                      <TableCell><p className="font-medium">{item.equipmentName}</p></TableCell>
                      <TableCell>{item.serialNumber}</TableCell>
                      <TableCell>
                          <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                  <AvatarImage src={allottedUser?.avatar} alt={allottedUser?.name} />
                                  <AvatarFallback>{allottedUser?.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <p className="font-medium">{allottedUser?.name}</p>
                          </div>
                      </TableCell>
                      <TableCell>{item.remarks}</TableCell>
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
  );
}
