
'use client';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Payment, PaymentStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


interface PaymentsTableProps {
  payments: Payment[];
}

const statusVariant: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
  Pending: 'secondary',
  Approved: 'success',
  Rejected: 'destructive',
  'Email Sent': 'default',
  'Amount Listed Out': 'warning',
  Paid: 'success',
  Cancelled: 'destructive',
};


export default function PaymentsTable({ payments = [] }: PaymentsTableProps) {
  const { user, users, vendors, updatePaymentStatus } = useAppContext();
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [action, setAction] = useState<'Approved' | 'Rejected' | null>(null);
  const [comment, setComment] = useState('');


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
  
  const handleActionClick = (payment: Payment, action: 'Approved' | 'Rejected') => {
    setSelectedPayment(payment);
    setAction(action);
    setComment('');
  };

  const handleConfirmAction = () => {
    if (!selectedPayment || !action) return;
    
    if (action === 'Rejected' && !comment.trim()) {
        toast({ title: 'Comment required for rejection', variant: 'destructive'});
        return;
    }

    updatePaymentStatus(selectedPayment.id, action, comment);
    toast({ title: `Payment ${action}` });
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
          <TableHead>Email Sent</TableHead>
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
          const isPending = payment.status === 'Pending';

          return (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">{vendor?.name || 'N/A'}</TableCell>
              <TableCell className="text-right font-mono">${payment.amount.toFixed(2)}</TableCell>
              <TableCell>{formatDuration(payment.durationFrom, payment.durationTo)}</TableCell>
              <TableCell>{formatDate(payment.emailSentDate)}</TableCell>
              <TableCell>{formatDate(payment.date)}</TableCell>
              <TableCell><Badge variant={statusVariant[payment.status]}>{payment.status}</Badge></TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={requester?.avatar} />
                        <AvatarFallback>{requester?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{requester?.name || 'N/A'}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                 {isManager && isPending && (
                    <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleActionClick(payment, 'Approved')}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleActionClick(payment, 'Rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                    </div>
                 )}
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
                    <AlertDialogTitle>{action} Payment?</AlertDialogTitle>
                    <AlertDialogDescription>Please provide a comment for your action. This is required for rejection.</AlertDialogDescription>
                </AlertDialogHeader>
                <div>
                    <Label htmlFor="comment">Comment</Label>
                    <Textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmAction}>{action}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </>
  );
}
