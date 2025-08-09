
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerInput } from '@/components/ui/date-picker-input';

const paymentSchema = z.object({
  vendorId: z.string().min(1, 'Please select a vendor'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  date: z.date({ required_error: 'Payment date is required' }),
  status: z.enum(['Pending', 'Email Sent', 'Amount Listed Out', 'Paid', 'Cancelled', 'Approved', 'Rejected']),
  remarks: z.string().optional(),
  durationFrom: z.date().optional(),
  durationTo: z.date().optional(),
  emailSentDate: z.date().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface AddPaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddPaymentDialog({ isOpen, setIsOpen }: AddPaymentDialogProps) {
  const { vendors, addPayment } = useAppContext();
  const { toast } = useToast();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      status: 'Pending',
      date: new Date(),
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    addPayment({
      ...data,
      date: data.date.toISOString(),
      durationFrom: data.durationFrom?.toISOString(),
      durationTo: data.durationTo?.toISOString(),
      emailSentDate: data.emailSentDate?.toISOString(),
    });
    toast({
      title: 'Payment Added',
      description: `Payment has been recorded.`,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Payment</DialogTitle>
          <DialogDescription>Enter the details for the new payment record.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Vendor</Label>
            <Controller
              control={form.control}
              name="vendorId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select a vendor..." /></SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.vendorId && <p className="text-xs text-destructive">{form.formState.errors.vendorId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label>Duration From</Label>
              <Controller name="durationFrom" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
            </div>
            <div className="space-y-2">
              <Label>Duration To</Label>
              <Controller name="durationTo" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
            </div>
          </div>

           <div className="space-y-2">
              <Label>Email Sent Date</Label>
              <Controller name="emailSentDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
           </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" {...form.register('amount')} />
              {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Payment Date</Label>
               <Controller name="date" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
              {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                name="status"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Email Sent">Email Sent</SelectItem>
                      <SelectItem value="Amount Listed Out">Amount Listed Out</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" {...form.register('remarks')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
