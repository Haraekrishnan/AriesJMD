
'use client';
import { useState } from 'react';
import type { Quotation, QuotationStatus } from '@/lib/types';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { FileDown, Eye, Edit, Trash2, Unlock, Lock } from 'lucide-react';
import ViewQuotationDialog from './ViewQuotationDialog';
import { exportToExcel } from './exportQuotationToExcel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-provider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { usePurchase } from '@/contexts/purchase-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';


const statusVariant: { [key in QuotationStatus]: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' } = {
  Pending: 'secondary',
  Approved: 'default',
  'PO Sent': 'default',
  'Partially Received': 'warning',
  Completed: 'success',
  Rejected: 'destructive',
};

const statusOptions: QuotationStatus[] = ['Pending', 'Approved', 'PO Sent', 'Partially Received', 'Completed', 'Rejected'];

export default function QuotationList({ quotations, onEdit }: { quotations: Quotation[], onEdit: (q: Quotation) => void }) {
    const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
    const { user, users, can } = useAuth();
    const { updateQuotation, deleteQuotation, setQuotationLock } = usePurchase();
    const { toast } = useToast();

    const handleExport = (quotation: Quotation) => {
        exportToExcel(quotation);
    };

    const handleStatusChange = (quotation: Quotation, newStatus: QuotationStatus) => {
        if (!can.manage_purchase_register) {
            toast({ title: "Permission Denied", variant: "destructive" });
            return;
        }

        if (newStatus === 'PO Sent' && !quotation.finalizedVendorId) {
            toast({ title: 'Vendor Not Finalized', description: 'Please approve a vendor before marking "PO Sent". View the item to finalize.', variant: 'destructive'});
            return;
        }
        
        if (quotation.finalizedVendorId && (newStatus === 'Pending' || newStatus === 'Rejected')) {
          toast({ title: 'Action Not Allowed', description: 'Cannot change status backward after a vendor has been finalized.', variant: 'destructive' });
          return;
        }
        
        updateQuotation({ ...quotation, status: newStatus });
        toast({ title: `Status updated to ${newStatus}` });
    };

    const handleDelete = (quotationId: string) => {
        deleteQuotation(quotationId);
    };

    if (!quotations || quotations.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-muted-foreground">No price comparisons created yet.</p>
            </div>
        )
    }

    return (
        <>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">SNO</TableHead>
                            <TableHead>Request No</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Next Action</TableHead>
                            <TableHead>Request On</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Requested By</TableHead>
                            <TableHead>Requirement</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {quotations.map((q, index) => {
                            const creator = users.find(u => u.id === q.creatorId);
                            const canEditThis = can.manage_purchase_register && (!q.isLocked || user?.role === 'Admin');

                            return (
                                <TableRow key={q.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>...{q.id.slice(-6)}</TableCell>
                                    <TableCell>
                                        {can.manage_purchase_register ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <div className="flex items-center gap-1 cursor-pointer">
                                                        {q.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                                        <Badge variant={statusVariant[q.status] || 'secondary'}>{q.status}</Badge>
                                                    </div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    {statusOptions.map(option => (
                                                        <DropdownMenuItem key={option} onSelect={() => handleStatusChange(q, option)}>
                                                            {option}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <Badge variant={statusVariant[q.status] || 'secondary'}>{q.status}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewingQuotation(q)}><Eye className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(q)} disabled={!canEditThis}><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExport(q)}><FileDown className="h-4 w-4"/></Button>
                                            {user?.role === 'Admin' && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Comparison?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently delete "{q.title}". This action cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(q.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                             {user?.role === 'Admin' && q.isLocked && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQuotationLock(q.id, false)}>
                                                                <Unlock className="h-4 w-4 text-yellow-600" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Unlock for Editing</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{format(parseISO(q.createdAt), 'yyyy-MM-dd')}</TableCell>
                                    <TableCell>{format(parseISO(q.createdAt), 'p')}</TableCell>
                                    <TableCell>{creator?.name || 'Unknown'}</TableCell>
                                    <TableCell className="font-medium max-w-xs truncate">{q.title}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            {viewingQuotation && (
                <ViewQuotationDialog
                    isOpen={!!viewingQuotation}
                    setIsOpen={() => setViewingQuotation(null)}
                    quotation={viewingQuotation}
                />
            )}
        </>
    );
}
