
'use client';
import { newestComparisonsFirst } from './quotation-order';
import styles from './purchase-page.module.css';
import { useState, useEffect, useMemo } from 'react';
import type { Quotation, QuotationStatus } from '@/lib/types';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { FileDown, Eye, Edit, Trash2, Unlock, Lock, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const orderedQuotations = useMemo(() => newestComparisonsFirst(quotations), [quotations]);
    const [page, setPage] = useState(1);
    const [deletingQuotation, setDeletingQuotation] = useState<Quotation | null>(null);
    const pageCount = Math.max(1, Math.ceil(quotations.length / 8));
    const currentPage = Math.min(page, pageCount);
    useEffect(() => { setPage(1); }, [quotations]);
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
                <p className="text-muted-foreground">No price comparisons match these filters.</p>
            </div>
        )
    }

    return (
        <>
            <div className={styles.tableWrap}>
                <Table className={styles.table}>
                    <TableHeader>
                        <TableRow>
<TableHead>#</TableHead>
<TableHead className="w-[30%]">Requirement</TableHead>
<TableHead>Request No.</TableHead>
<TableHead>Requested by</TableHead>
<TableHead>Requested on</TableHead>
<TableHead>Status</TableHead>
<TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orderedQuotations.slice((currentPage - 1) * 8, currentPage * 8).map((q, index) => {
                            const creator = users.find(u => u.id === q.creatorId);
                            const canEditThis = can.manage_purchase_register && (!q.isLocked || user?.role === 'Admin');

                            return (
                                <TableRow key={q.id}>
                                    <TableCell>{(currentPage - 1) * 8 + index + 1}</TableCell>
                                    <TableCell className="font-medium whitespace-normal break-words">{q.title}</TableCell>
                                    <TableCell><span className="inline-flex items-center gap-2" title={q.id}>…{q.id.slice(-6)} {q.isLocked && <Lock aria-label="Locked" className="h-3.5 w-3.5 text-amber-600" />}</span></TableCell>
                                    <TableCell>{creator?.name || "Unknown"}</TableCell>
                                    <TableCell><span className="whitespace-nowrap">{format(parseISO(q.createdAt), "dd MMM yyyy")}</span><span className="block text-xs text-muted-foreground mt-1">{format(parseISO(q.createdAt), "p")}</span></TableCell>
                                    <TableCell>
                                        {can.manage_purchase_register ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button type="button" aria-label={`Change status for ${q.title}`} className="flex items-center gap-1">
                                                        
                                                        <Badge className={styles.status} data-status={q.status} variant={statusVariant[q.status] || 'secondary'}>{q.status}</Badge>
                                                    </button>
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
                                            <Badge className={styles.status} data-status={q.status} variant={statusVariant[q.status] || 'secondary'}>{q.status}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setViewingQuotation(q)}><Eye className="h-4 w-4 mr-2"/>View</Button>
                                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9" aria-label={`Actions for ${q.title}`}><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem disabled={!canEditThis} onSelect={() => onEdit(q)}><Edit className="h-4 w-4 mr-2"/>Edit comparison</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleExport(q)}><FileDown className="h-4 w-4 mr-2"/>Export Excel</DropdownMenuItem>
                                                {user?.role === 'Admin' && q.isLocked && <DropdownMenuItem onSelect={() => setQuotationLock(q.id, false)}><Unlock className="h-4 w-4 mr-2"/>Unlock for editing</DropdownMenuItem>}
                                                {user?.role === 'Admin' && <DropdownMenuItem className="text-destructive" onSelect={() => setDeletingQuotation(q)}><Trash2 className="h-4 w-4 mr-2"/>Delete comparison</DropdownMenuItem>}
                                            </DropdownMenuContent></DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            <div className={styles.pagination}><span>Showing {(currentPage - 1) * 8 + 1}–{Math.min(currentPage * 8, quotations.length)} of {quotations.length} comparisons</span><div className="flex gap-2 items-center"><Button variant="outline" size="icon" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4"/></Button><span className="text-sm">{currentPage} / {pageCount}</span><Button variant="outline" size="icon" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight className="h-4 w-4"/></Button></div></div>
            <AlertDialog open={!!deletingQuotation} onOpenChange={open => { if (!open) setDeletingQuotation(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete comparison?</AlertDialogTitle><AlertDialogDescription>This will permanently delete “{deletingQuotation?.title}”. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deletingQuotation && user?.role === 'Admin') handleDelete(deletingQuotation.id); setDeletingQuotation(null); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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
