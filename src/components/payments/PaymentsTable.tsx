
'use client';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Payment, PaymentStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface PaymentsTableProps {
  payments: Payment[];
}

const statusVariant: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
  Pending: 'secondary',
  'Email Sent': 'default',
  'Amount Listed Out': 'warning',
  Paid: 'success',
  Cancelled: 'destructive',
};

export default function PaymentsTable({ payments }: PaymentsTableProps) {
  const { users, deletePayment } = useAppContext();
  const { toast } = useToast();

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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recipient</TableHead>
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
          return (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">{payment.paymentTo}</TableCell>
              <TableCell>${payment.amount.toFixed(2)}</TableCell>
              <TableCell>
                {payment.durationFrom ? `${formatDate(payment.durationFrom)} - ${formatDate(payment.durationTo)}` : 'N/A'}
              </TableCell>
              <TableCell>{formatDate(payment.emailSentDate)}</TableCell>
              <TableCell>{formatDate(payment.date)}</TableCell>
              <TableCell><Badge variant={statusVariant[payment.status]}>{payment.status}</Badge></TableCell>
              <TableCell>{requester?.name || 'N/A'}</TableCell>
              <TableCell className="text-right">
                 <AlertDialog>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></AlertDialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this payment record.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(payment.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
