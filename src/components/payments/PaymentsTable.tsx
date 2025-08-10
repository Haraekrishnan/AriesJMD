
'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Payment, PaymentStatus } from '@/lib/types';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback } from '../ui/avatar';
import ViewPurchaseRegisterDialog from '../purchase-register/ViewPurchaseRegisterDialog';


const statusVariant: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
    'Pending': 'secondary',
    'Approved': 'default',
    'Rejected': 'destructive',
    'Email Sent': 'warning',
    'Amount Listed Out': 'outline',
    'Paid': 'success',
    'Cancelled': 'destructive',
};

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
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {vendorPayments.map(payment => {
                                                    const requester = users.find(u => u.id === payment.requesterId);
                                                    const isPurchaseLink = payment.purchaseRegisterId && purchaseRegisterMap.has(payment.purchaseRegisterId);

                                                    return (
                                                        <TableRow key={payment.id}>
                                                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                                            <TableCell>{payment.durationFrom ? `${formatDate(payment.durationFrom)} - ${formatDate(payment.durationTo)}` : 'N/A'}</TableCell>
                                                            <TableCell>{formatDate(payment.emailSentDate)}</TableCell>
                                                            <TableCell className="max-w-xs truncate">
                                                                {isPurchaseLink ? (
                                                                    <Button variant="link" className="p-0 h-auto" onClick={() => setViewingPurchase(payment.purchaseRegisterId!)}>
                                                                        {payment.remarks}
                                                                    </Button>
                                                                ) : (
                                                                    payment.remarks || 'N/A'
                                                                )}
                                                            </TableCell>
                                                            <TableCell><Badge variant={statusVariant[payment.status]}>{payment.status}</Badge></TableCell>
                                                            <TableCell>{requester?.name || 'Unknown'}</TableCell>
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
