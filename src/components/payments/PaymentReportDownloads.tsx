
'use client';

import { useAppContext } from '@/contexts/app-provider';
import type { Payment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PaymentReportDownloadsProps {
  payments: Payment[];
}

export default function PaymentReportDownloads({ payments }: PaymentReportDownloadsProps) {
  const { vendors, users } = useAppContext();
  const { toast } = useToast();

  const handleDownloadExcel = () => {
    if (payments.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There are no payments matching the current filters.',
      });
      return;
    }

    const dataToExport = payments.map(payment => {
      const vendor = vendors.find(v => v.id === payment.vendorId);
      const requester = users.find(u => u.id === payment.requesterId);
      const approver = payment.approverId ? users.find(u => u.id === payment.approverId) : null;
      const lastComment = payment.comments?.[payment.comments.length - 1];
      const lastCommenter = lastComment ? users.find(u => u.id === lastComment.userId) : null;

      return {
        'Vendor': vendor?.name || 'N/A',
        'Amount (INR)': payment.amount,
        'Status': payment.status,
        'Logged Date': format(parseISO(payment.date), 'dd-MM-yyyy'),
        'Service Duration': payment.durationFrom 
            ? `${format(parseISO(payment.durationFrom), 'dd-MM-yyyy')} to ${payment.durationTo ? format(parseISO(payment.durationTo), 'dd-MM-yyyy') : ''}` 
            : 'N/A',
        'Email Sent Date': payment.emailSentDate ? format(parseISO(payment.emailSentDate), 'dd-MM-yyyy') : 'N/A',
        'Requested By': requester?.name || 'N/A',
        'Approved/Rejected By': approver?.name || 'N/A',
        'Last Comment': lastComment?.text || 'N/A',
        'Last Comment By': lastCommenter?.name || 'N/A',
        'Remarks': payment.remarks || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payment Ledger Report');
    XLSX.writeFile(workbook, `Payment_Ledger_Report.xlsx`);
  };

  return (
    <Button variant="outline" onClick={handleDownloadExcel}>
      <FileDown className="mr-2 h-4 w-4" />
      Export Excel
    </Button>
  );
}
