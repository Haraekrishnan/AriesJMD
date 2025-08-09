
'use client';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import AddPaymentDialog from '@/components/payments/AddPaymentDialog';
import PaymentsTable from '@/components/payments/PaymentsTable';

export default function PaymentsPage() {
    const { payments } = useAppContext();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
                    <p className="text-muted-foreground">Track and manage all payments.</p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Payment
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>A log of all recorded payments.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PaymentsTable payments={payments} />
                </CardContent>
            </Card>

            <AddPaymentDialog isOpen={isAddDialogOpen} setIsOpen={setIsAddDialogOpen} />
        </div>
    );
}
