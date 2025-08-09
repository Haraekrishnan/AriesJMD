
'use client';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Payment, PaymentStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface PaymentsTableProps {
  payments: Payment[];
}

const statusVariant: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
  Pending: 'secondary',
  'Email Sent': 'default',
  'Amount Listed Out': 'warning',
  Approved: 'success',
  Paid: 'success',
  Cancelled: 'destructive',
  Rejected: 'destructive'
};

const statusOptions: PaymentStatus[] = ['Pending', 'Email Sent', 'Amount Listed Out', 'Paid', 'Cancelled', 'Approved', 'Rejected'];

export default function PaymentsTable({ payments = [] }: PaymentsTableProps) {
  const { user, users, vendors, deletePayment, updatePaymentStatus } = useAppContext();
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [action, setAction] = useState<PaymentStatus | null>(null);
  const [comment, setComment] = useState('');

  const handleDelete = (paymentId: string) => {
    deletePayment(paymentId);
    toast({
      variant: 'destructive',
      title: 'Payment Deleted',
      description: 'The payment record has been removed.',
    });
  };

  if (payments.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No payments recorded yet.</p>;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'dd MMM, yyyy');
  };

  const formatDuration = (from?: string, to?: string) => {
    if (!from || !to) return 'N/A';
    return `${format(parseISO(from), 'dd MMM, yyyy')} - ${format(parseISO(to), 'dd MMM, yyyy')}`;
  };
  
  const handleActionClick = (payment: Payment, action: PaymentStatus) => {
    setSelectedPayment(payment);
    setAction(action);
    setComment('');
  };

  const handleConfirmAction = () => {
    if (!selectedPayment || !action) return;
    
    // For critical actions, a comment is required.
    if ((action === 'Approved' || action === 'Rejected') && !comment.trim()) {
        toast({ title: 'Comment required', variant: 'destructive'});
        return;
    }

    updatePaymentStatus(selectedPayment.id, action, comment);
    toast({ title: `Payment Status Updated` });
    setSelectedPayment(null);
    setAction(null);
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vendor</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Email Sent Date</TableHead>
          <TableHead>Payment Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Requester</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => {
          const requester = users.find(u => u.id === payment.requesterId);
          const vendor = vendors.find(v => v.id === payment.vendorId);
          const canManage = user?.role === 'Admin';
          const isApprover = user?.id === payment.approverId;

          return (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">{vendor?.name || 'N/A'}</TableCell>
              <TableCell>${payment.amount.toFixed(2)}</TableCell>
              <TableCell>{formatDuration(payment.durationFrom, payment.durationTo)}</TableCell>
              <TableCell>{formatDate(payment.emailSentDate)}</TableCell>
              <TableCell>{formatDate(payment.date)}</TableCell>
              <TableCell><Badge variant={statusVariant[payment.status]}>{payment.status}</Badge></TableCell>
              <TableCell>{requester?.name || 'N/A'}</TableCell>
              <TableCell className="text-right">
                 <div className="flex items-center justify-end gap-2">
                     {(canManage || isApprover) && (
                         <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                      {statusOptions.map(status => (
                                        <DropdownMenuItem key={status} onSelect={() => handleActionClick(payment, status)}>{status}</DropdownMenuItem>
                                      ))}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                                </DropdownMenuSub>
                                {canManage && (
                                <>
                                  <DropdownMenuItem disabled><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                  <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></AlertDialogTrigger>
                                </>
                                )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this payment record.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(payment.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                     )}
                 </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>

     {selectedPayment && action && (
        <AlertDialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Change status to "{action}"?</AlertDialogTitle>
                    <AlertDialogDescription>Please provide a comment for this action. {(action === 'Approved' || action === 'Rejected') && '(Required)'}</AlertDialogDescription>
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
    </>
  );
}
