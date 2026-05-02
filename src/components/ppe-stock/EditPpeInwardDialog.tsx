
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInventory } from '@/contexts/inventory-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { PpeInwardRecord } from '@/lib/types';
import { useEffect } from 'react';
import { parseISO, isValid } from 'date-fns';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const coverallSizeOptions = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];

const inwardSchema = z.object({
    type: z.enum(['Inward', 'Outward']),
    date: z.date({ required_error: "Date is required" }),
    sizes: z.record(z.string(), z.coerce.number().min(0).optional()).optional(),
    quantity: z.coerce.number().min(0).optional(),
    remarks: z.string().optional(),
});

type InwardFormValues = z.infer<typeof inwardSchema>;

interface EditPpeInwardDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  record: PpeInwardRecord;
}

export default function EditPpeInwardDialog({ isOpen, setIsOpen, record }: EditPpeInwardDialogProps) {
    const { updatePpeInwardRecord } = useInventory();
    const { toast } = useToast();
    
    const form = useForm<InwardFormValues>({
        resolver: zodResolver(inwardSchema),
    });

    useEffect(() => {
        if (record && isOpen) {
            const parsedDate = record.date ? parseISO(record.date) : null;
            form.reset({
                type: record.type || 'Inward',
                date: parsedDate && isValid(parsedDate) ? parsedDate : new Date(),
                sizes: record.sizes,
                quantity: record.quantity,
                remarks: record.remarks || '',
            });
        }
    }, [record, isOpen, form]);

    const onSubmit = (data: InwardFormValues) => {
        const updatedRecordData: PpeInwardRecord = {
            ...record,
            type: data.type,
            date: data.date.toISOString(),
            remarks: data.remarks,
            sizes: record.ppeType === 'Coverall' ? data.sizes : undefined,
            quantity: record.ppeType === 'Safety Shoes' ? data.quantity : undefined,
        };
        updatePpeInwardRecord(updatedRecordData);
        toast({ title: 'Record Updated', description: `The ${(record.type || 'transaction').toLowerCase()} record has been updated. Note: Manual stock adjustments may be required if quantities were changed.` });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Transaction Record: {record.ppeType}</DialogTitle>
                    <DialogDescription>Update the details for this {(record.type || 'transaction').toLowerCase()} record.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Transaction Type</Label>
                            <Controller name="type" control={form.control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Inward">Inward</SelectItem>
                                        <SelectItem value="Outward">Outward</SelectItem>
                                    </SelectContent>
                                </Select>
                            )} />
                        </div>
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Controller name="date" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Remarks</Label>
                        <Textarea {...form.register('remarks')} placeholder="Add details..." />
                    </div>

                    {record.ppeType === 'Coverall' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {coverallSizeOptions.map(size => (
                                <div key={size} className="space-y-2">
                                    <Label htmlFor={`edit-inward-coverall-${size}`}>{size}</Label>
                                    <Input id={`edit-inward-coverall-${size}`} type="number" {...form.register(`sizes.${size}`)} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2 max-w-xs">
                            <Label htmlFor="edit-inward-shoe-quantity">Quantity</Label>
                            <Input id="edit-inward-shoe-quantity" type="number" {...form.register('quantity')} />
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
