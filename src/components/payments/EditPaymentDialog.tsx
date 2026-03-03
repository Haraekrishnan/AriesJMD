
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DateRangePicker } from '../ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { DatePickerInput } from '../ui/date-picker-input';
import { Payment } from '@/lib/types';
import { useEffect } from 'react';
import { parseISO } from 'date-fns';

const paymentSchema = z.object({
  vendorId: z.string().min(1, 'Please select a vendor'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  duration: z.object({
      from: z.date().optional(),
      to: z.date().optional()
  }).optional(),
  emailSentDate: z.date().optional().nullable(),
  remarks: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface EditPaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  payment: Payment;
}

export default function EditPaymentDialog({ isOpen, setIsOpen, payment }: EditPaymentDialogProps) {
  const { updatePayment, vendors } = useAppContext();
  const { toast } = useToast();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
  });
  
  useEffect(() => {
    if (payment && isOpen) {
        form.reset({
            vendorId: payment.vendorId,
            amount: payment.amount,
            duration: {
                from: payment.durationFrom ? parseISO(payment.durationFrom) : undefined,
                to: payment.durationTo ? parseISO(payment.durationTo) : undefined,
            },
            emailSentDate: payment.emailSentDate ? parseISO(payment.emailSentDate) : null,
            remarks: payment.remarks,
        });
    }
  }, [payment, isOpen, form]);

  const onSubmit = (data: PaymentFormValues) => {
    updatePayment({
        ...payment,
        ...data,
        durationFrom: data.duration?.from?.toISOString() || null,
        durationTo: data.duration?.to?.toISOString() || null,
        emailSentDate: data.emailSentDate ? data.emailSentDate.toISOString() : null,
    });
    toast({
      title: 'Payment Updated',
    });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Payment Ledger</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Controller
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger>
                      <SelectContent>
                        {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                 {form.formState.errors.vendorId && <p className="text-xs text-destructive">{form.formState.errors.vendorId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" {...form.register('amount')} step="0.01" />
                 {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Service Duration (Optional)</Label>
              <Controller
                name="duration"
                control={form.control}
                render={({ field }) => <DateRangePicker date={field.value as DateRange} onDateChange={field.onChange} />}
              />
            </div>

            <div className="space-y-2">
                <Label>Email Sent Date (Optional)</Label>
                <Controller name="emailSentDate" control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" {...form.register('remarks')} />
            </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
