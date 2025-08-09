
'use client';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Payment, PaymentStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


interface PaymentsTableProps {
  payments: Payment[];
}

const statusVariant: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
  Pending: 'secondary',
  Approved: 'default',
  Rejected: 'destructive',
  'Email Sent': 'default',
  'Amount Listed Out': 'warning',
  Paid: 'success',
  Cancelled: 'destructive',
};

const ALL_STATUSES: PaymentStatus[] = ['Pending', 'Approved', 'Rejected', 'Email Sent', 'Amount Listed Out', 'Paid', 'Cancelled'];

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
    if (!from && !to) return 'N/A';
    const fromDate = from ? format(parseISO(from), 'dd MMM') : '?';
    const toDate = to ? format(parseISO(to), 'dd MMM, yyyy') : '?';
    return `${fromDate} - ${toDate}`;
  };
  
  const handleActionClick = (payment: Payment, action: PaymentStatus) => {
    setSelectedPayment(payment);
    setAction(action);
    setComment('');
  };

  const handleConfirmAction = () => {
    if (!selectedPayment || !action) return;
    
    if (action !== 'Approved' && !comment.trim()) {
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
          <TableHead className="text-right">Amount</TableHead>
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
          const isManager = user?.role === 'Manager' || user?.role === 'Admin';

          return (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">{vendor?.name || 'N/A'}</TableCell>
              <TableCell className="text-right font-mono">${payment.amount.toFixed(2)}</TableCell>
              <TableCell>{formatDuration(payment.durationFrom, payment.durationTo)}</TableCell>
              <TableCell>{formatDate(payment.emailSentDate)}</TableCell>
              <TableCell>{formatDate(payment.date)}</TableCell>
              <TableCell><Badge variant={statusVariant[payment.status]}>{payment.status}</Badge></TableCell>
              <TableCell>{requester?.name || 'N/A'}</TableCell>
              <TableCell className="text-right">
                 <div className="flex items-center justify-end gap-2">
                     {isManager && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">Change Status</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {ALL_STATUSES.map(status => (
                                    <DropdownMenuItem key={status} onSelect={() => handleActionClick(payment, status)}>
                                        {status}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                    <AlertDialogDescription>Please provide a comment for your action. This is required for most status changes.</AlertDialogDescription>
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
