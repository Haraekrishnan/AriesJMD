
'use client';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Vendor } from '@/lib/types';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { TooltipProvider } from '../ui/tooltip';

interface VendorListTableProps {
  vendors: Vendor[];
  onEdit: (vendor: Vendor) => void;
}

export default function VendorListTable({ vendors = [], onEdit }: VendorListTableProps) {
  const { can, user, deleteVendor } = useAppContext();
  const { toast } = useToast();

  const handleDelete = (vendorId: string) => {
    deleteVendor(vendorId);
    toast({
      variant: 'destructive',
      title: 'Vendor Deleted',
      description: 'The vendor has been removed from the system.',
    });
  };

  if (vendors.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No vendors found.</p>;
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Merchant</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Contact Info</TableHead>
            <TableHead>Address</TableHead>
            {can.manage_vendors && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor) => (
            <TableRow key={vendor.id}>
              <TableCell>
                  <div className="flex items-center gap-3">
                      <Avatar>
                          <AvatarFallback>{vendor.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                          <p className="font-medium">{vendor.name}</p>
                      </div>
                  </div>
              </TableCell>
              <TableCell>{vendor.contactPerson || 'N/A'}</TableCell>
              <TableCell>
                  <p>{vendor.contactEmail || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{vendor.contactPhone || 'N/A'}</p>
              </TableCell>
              <TableCell className="max-w-xs truncate">{vendor.address || 'N/A'}</TableCell>

              {can.manage_vendors && (
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
                        <DropdownMenuItem onSelect={() => onEdit(vendor)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        {user?.role === 'Admin' && (
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this vendor. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(vendor.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
