
'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Payment, PaymentStatus } from '@/lib/types';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import ViewPurchaseRegisterDialog from '../purchase-register/ViewPurchaseRegisterDialog';
import { Button } from '../ui/button';

interface PaymentsTableProps {
  payments: Payment[];
  title: string;
}

export default function PaymentsTable({ payments, title }: PaymentsTableProps) {
    const { user, vendors, users, purchaseRegisters } = useAppContext();
    const { toast } = useToast();
    const [viewingPurchase, setViewingPurchase] = useState<string | null>(null);
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    const formatDate = (dateString?: string) => dateString ? format(parseISO(dateString), 'dd MMM, yyyy') : 'N/A';
    
    const sortedPayments = useMemo(() => {
        return payments.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [payments]);

    const purchaseRegisterMap = useMemo(() => {
        return new Map(purchaseRegisters.map(pr => [pr.id, pr]));
    }, [purchaseRegisters]);


    if (payments.length === 0) {
        return (
            <>
                <h3 className="text-lg font-semibold mb-2">{title} (0)</h3>
                <div className="text-center py-10 text-muted-foreground">No payments match the current filters.</div>
            </>
        )
    }

    return (
        <>
            <h3 className="text-lg font-semibold mb-2">{title} ({payments.length})</h3>
             <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Email Sent Date</TableHead>
                            <TableHead>Remarks</TableHead>
                            <TableHead>Logged By</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedPayments.map(payment => {
                            const vendor = vendors.find(v => v.id === payment.vendorId);
                            const requester = users.find(u => u.id === payment.requesterId);
                            const isPurchaseLink = payment.purchaseRegisterId && purchaseRegisterMap.has(payment.purchaseRegisterId);

                            return (
                                <TableRow key={payment.id}>
                                    <TableCell>{vendor?.name || 'N/A'}</TableCell>
                                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                    <TableCell>{payment.durationFrom ? `${formatDate(payment.durationFrom)} - ${formatDate(payment.durationTo)}` : 'N/A'}</TableCell>
                                    <TableCell>{formatDate(payment.emailSentDate)}</TableCell>
                                    <TableCell className="max-w-xs truncate">
                                        {isPurchaseLink ? (
                                            <Button variant="link" className="p-0 h-auto" onClick={() => setViewingPurchase(payment.purchaseRegisterId!)}>
                                                Purchase Register
                                            </Button>
                                        ) : (
                                            payment.remarks || 'N/A'
                                        )}
                                    </TableCell>
                                    <TableCell>{requester?.name || 'Unknown'}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            
             {viewingPurchase && (
                <ViewPurchaseRegisterDialog
                    isOpen={!!viewingPurchase}
                    setIsOpen={() => setViewingPurchase(null)}
                    purchaseRegister={purchaseRegisterMap.get(viewingPurchase)}
                />
            )}
        </>
    );
}
