
'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Payment, PaymentStatus } from '@/lib/types';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import EditPaymentDialog from './EditPaymentDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback } from '../ui/avatar';


const statusVariant: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
    'Pending': 'secondary',
    'Approved': 'default',
    'Rejected': 'destructive',
    'Email Sent': 'warning',
    'Amount Listed Out': 'outline',
    'Paid': 'success',
    'Cancelled': 'destructive',
};

const statusOptions: PaymentStatus[] = ['Approved', 'Rejected', 'Email Sent', 'Amount Listed Out', 'Paid', 'Cancelled'];

interface PaymentsTableProps {
  payments: Payment[];
  title: string;
}

export default function PaymentsTable({ payments, title }: PaymentsTableProps) {
    const { user, vendors, users, can, updatePaymentStatus, deletePayment } = useAppContext();
    const { toast } = useToast();
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [action, setAction] = useState<PaymentStatus | null>(null);
    const [comment, setComment] = useState('');

    const handleActionClick = (payment: Payment, status: PaymentStatus) => {
        setSelectedPayment(payment);
        setAction(status);
        setComment('');
    };

    const handleConfirmAction = () => {
        if (!selectedPayment || !action) return;
        if (!comment.trim() && (action === 'Approved' || action === 'Rejected' || action === 'Cancelled')) {
            toast({ title: 'Comment required for this action.', variant: 'destructive' });
            return;
        }
        updatePaymentStatus(selectedPayment.id, action, comment);
        toast({ title: `Payment status updated to ${action}.` });
        setSelectedPayment(null);
        setAction(null);
    };
    
    const handleDelete = (paymentId: string) => {
        deletePayment(paymentId);
        toast({ title: 'Payment Deleted', variant: 'destructive' });
    }

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    const formatDate = (dateString?: string) => dateString ? format(parseISO(dateString), 'dd MMM, yyyy') : 'N/A';
    
    const groupedPayments = useMemo(() => {
        return payments.reduce((acc, payment) => {
            const vendorId = payment.vendorId;
            if (!acc[vendorId]) {
                acc[vendorId] = [];
            }
            acc[vendorId].push(payment);
            return acc;
        }, {} as Record<string, Payment[]>);
    }, [payments]);


    if (payments.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">No payments match the current filters.</div>
    }

    return (
        <>
            <h3 className="text-lg font-semibold mb-2">{title} ({payments.length})</h3>
            <div className="space-y-2">
                {Object.entries(groupedPayments).map(([vendorId, vendorPayments]) => {
                    const vendor = vendors.find(v => v.id === vendorId);
                    if (!vendor) return null;
                    
                    const hasPendingPayment = user?.role === 'Manager' && vendorPayments.some(p => p.status === 'Pending');

                    return (
                        <Accordion key={vendorId} type="single" collapsible className="w-full">
                            <AccordionItem value={vendorId} className="border rounded-lg bg-card">
                                <AccordionTrigger className="p-4 hover:no-underline w-full">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-3">
                                            {hasPendingPayment && <div className="h-2.5 w-2.5 rounded-full bg-destructive" title="Pending Approval" />}
                                            <Avatar>
                                                <AvatarFallback>{vendor.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <p className="font-semibold text-lg">{vendor.name}</p>
                                            <Badge variant="secondary">{vendorPayments.length} payments</Badge>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-1 border-t">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Duration</TableHead>
                                                    <TableHead>Email Sent Date</TableHead>
                                                    <TableHead>Remarks</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Requester</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {vendorPayments.map(payment => {
                                                    const requester = users.find(u => u.id === payment.requesterId);
                                                    const canEditLedger = (user?.role === 'Admin' || user?.role === 'Project Coordinator') && payment.status === 'Pending';
                                                    const canChangeStatus = user?.role === 'Manager';

                                                    return (
                                                        <TableRow key={payment.id}>
                                                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                                            <TableCell>{payment.durationFrom ? `${formatDate(payment.durationFrom)} - ${formatDate(payment.durationTo)}` : 'N/A'}</TableCell>
                                                            <TableCell>{formatDate(payment.emailSentDate)}</TableCell>
                                                            <TableCell className="max-w-xs truncate">{payment.remarks || 'N/A'}</TableCell>
                                                            <TableCell><Badge variant={statusVariant[payment.status]}>{payment.status}</Badge></TableCell>
                                                            <TableCell>{requester?.name || 'Unknown'}</TableCell>
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
                                                                        {canEditLedger && (
                                                                            <>
                                                                                <DropdownMenuItem onSelect={() => setEditingPayment(payment)}>
                                                                                    <Edit className="mr-2 h-4 w-4" /> Edit Ledger
                                                                                </DropdownMenuItem>
                                                                                <AlertDialogTrigger asChild>
                                                                                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                                    </DropdownMenuItem>
                                                                                </AlertDialogTrigger>
                                                                            </>
                                                                        )}
                                                                        {canChangeStatus && statusOptions.map(status => (
                                                                             <DropdownMenuItem key={status} onSelect={() => handleActionClick(payment, status)}>
                                                                                {status}
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                        <AlertDialogDescription>This will permanently delete this payment record.</AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDelete(payment.id)}>Delete</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                              </AlertDialog>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )
                })}
            </div>
            
            {selectedPayment && action && (
                <AlertDialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Change Status to "{action}"?</AlertDialogTitle>
                            <AlertDialogDescription>Please provide a comment for this action. This is required for approvals and rejections.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div>
                            <Label htmlFor="comment">Comment</Label>
                            <Textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmAction}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {editingPayment && can.manage_vendors && (
                <EditPaymentDialog
                    isOpen={!!editingPayment}
                    setIsOpen={() => setEditingPayment(null)}
                    payment={editingPayment}
                />
            )}
        </>
    );
}
