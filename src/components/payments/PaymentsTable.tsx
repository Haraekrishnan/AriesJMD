
'use client';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Payment, PaymentStatus, Comment } from '@/lib/types';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import EditPaymentDialog from './EditPaymentDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


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

export default function PaymentsTable() {
    const { user, payments, vendors, users, can, updatePaymentStatus, deletePayment } = useAppContext();
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
    
    const visiblePayments = payments.filter(p => {
        if (can.manage_payments) return true;
        if (user?.role === 'Manager' && p.approverId === user.id) return true;
        return p.requesterId === user?.id;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());


    if (visiblePayments.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">No payments found.</div>
    }

    return (
        <>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Email Sent Date</TableHead>
                            <TableHead>Remarks & History</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Requester</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visiblePayments.map(payment => {
                            const vendor = vendors.find(v => v.id === payment.vendorId);
                            const requester = users.find(u => u.id === payment.requesterId);
                            const canManageLedger = (user?.role === 'Admin' || user?.role === 'Project Coordinator') && payment.status === 'Pending';
                            const canChangeStatus = user?.role === 'Manager';
                             const commentsArray = Array.isArray(payment.comments) ? payment.comments : (payment.comments ? Object.values(payment.comments) : []);

                            return (
                                <TableRow key={payment.id}>
                                    <TableCell className="font-medium">{vendor?.name || 'Unknown'}</TableCell>
                                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                    <TableCell>{payment.durationFrom ? `${formatDate(payment.durationFrom)} - ${formatDate(payment.durationTo)}` : 'N/A'}</TableCell>
                                    <TableCell>{formatDate(payment.emailSentDate)}</TableCell>
                                    <TableCell className="max-w-xs">
                                        <Accordion type="single" collapsible className="w-full">
                                            <AccordionItem value={payment.id} className="border-none">
                                                <AccordionTrigger className="p-0 hover:no-underline font-normal text-left text-sm">
                                                   <p className="truncate">{payment.remarks || 'No remarks'}</p>
                                                </AccordionTrigger>
                                                <AccordionContent className="pt-2">
                                                     <div className="space-y-2">
                                                      {commentsArray.length > 0 ? commentsArray.map((c: Comment,i: number) => {
                                                          const commentUser = users.find(u => u.id === c.userId);
                                                          return (
                                                              <div key={i} className="flex items-start gap-2">
                                                                  <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                                                  <div className="text-xs bg-muted p-2 rounded-md w-full">
                                                                      <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(new Date(c.date), { addSuffix: true })}</p></div>
                                                                      <p className="text-foreground/80 mt-1">{c.text}</p>
                                                                  </div>
                                                              </div>
                                                          )
                                                      }) : <p className="text-xs text-muted-foreground">No comments yet.</p>}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    </TableCell>
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
                                                {canManageLedger && (
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
