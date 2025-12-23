
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { LaptopDesktop, Role } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';

interface LaptopDesktopTableProps {
  items: LaptopDesktop[];
  onEdit: (item: LaptopDesktop) => void;
}

export default function LaptopDesktopTable({ items, onEdit }: LaptopDesktopTableProps) {
  const { user, can, users, deleteLaptopDesktop } = useAppContext();
  const { toast } = useToast();
  const [shownPasswords, setShownPasswords] = useState<Record<string, boolean>>({});

  const canViewPassword = useMemo(() => {
    if (!user) return false;
    const privilegedRoles: Role[] = ['Admin'];
    return privilegedRoles.includes(user.role);
  }, [user]);
  
  const togglePasswordVisibility = (itemId: string) => {
    setShownPasswords(prev => ({
        ...prev,
        [itemId]: !prev[itemId]
    }));
  };

  const handleDelete = (itemId: string) => {
    deleteLaptopDesktop(itemId);
    toast({
      variant: 'destructive',
      title: 'Item Deleted',
      description: 'The equipment entry has been removed.',
    });
  };
  
  if (items.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No laptop or desktop data found.</p>;
  }

  return (
    <ScrollArea className="h-96">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Make</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Aries ID</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Allotted To</TableHead>
              <TableHead>Remarks</TableHead>
              {can.manage_equipment_status && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => {
                const allottedUser = users.find(u => u.id === item.allottedTo);
                const isPasswordVisible = shownPasswords[item.id];
                return (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.make}</TableCell>
                        <TableCell>{item.model}</TableCell>
                        <TableCell>{item.serialNumber}</TableCell>
                        <TableCell>{item.ariesId || 'N/A'}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{canViewPassword && isPasswordVisible ? item.password || 'N/A' : '••••••••'}</span>
                              {canViewPassword && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePasswordVisibility(item.id)}>
                                      {isPasswordVisible ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                  </Button>
                              )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={allottedUser?.avatar} alt={allottedUser?.name} />
                                    <AvatarFallback>{allottedUser?.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="font-medium">
                                    <p>{allottedUser?.name}</p>
                                </div>
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
    </ScrollArea>
  );
}
