
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { MobileSim, MobileSimStatus } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';

interface MobileSimTableProps {
  onEdit: (item: MobileSim) => void;
}

const statusVariant: { [key in MobileSimStatus]: 'secondary' | 'default' | 'destructive' } = {
    'Active': 'default',
    'Inactive': 'secondary',
    'Returned': 'destructive',
}

export default function MobileSimTable({ onEdit }: MobileSimTableProps) {
  const { can, mobileSims, users, projects, deleteMobileSim } = useAppContext();
  const { toast } = useToast();

  const handleDelete = (itemId: string) => {
    deleteMobileSim(itemId);
    toast({
      variant: 'destructive',
      title: 'Item Deleted',
      description: 'The item has been removed.',
    });
  };
  
  if (mobileSims.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No mobile or SIM data found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Number/IMEI</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Allotted To</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Status</TableHead>
          {can.manage_equipment_status && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {mobileSims.map(item => {
            const allottedUser = users.find(u => u.id === item.allottedToUserId);
            const project = projects.find(p => p.id === item.projectId);
            return (
                <TableRow key={item.id}>
                    <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                    <TableCell className="font-medium">{item.number}</TableCell>
                    <TableCell>{item.provider}</TableCell>
                    <TableCell>
                         <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={allottedUser?.avatar} alt={allottedUser?.name} />
                                <AvatarFallback>{allottedUser?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium">{allottedUser?.name}</p>
                        </div>
                    </TableCell>
                    <TableCell>{project?.name}</TableCell>
                    <TableCell><Badge variant={statusVariant[item.status]}>{item.status}</Badge></TableCell>
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
  );
}
