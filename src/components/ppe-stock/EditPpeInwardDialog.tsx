
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { PpeInwardRecord } from '@/lib/types';
import { useEffect } from 'react';
import { parseISO, isValid } from 'date-fns';

const coverallSizeOptions = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];

const inwardSchema = z.object({
    date: z.date({ required_error: "Date is required" }),
    sizes: z.record(z.string(), z.coerce.number().min(0).optional()).optional(),
    quantity: z.coerce.number().min(0).optional(),
}).refine(data => {
    // This logic is simplified as we cannot know the ppeType in the schema alone
    return true; 
});

type InwardFormValues = z.infer<typeof inwardSchema>;

interface EditPpeInwardDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  record: PpeInwardRecord;
}

export default function EditPpeInwardDialog({ isOpen, setIsOpen, record }: EditPpeInwardDialogProps) {
    const { updatePpeInwardRecord } = useAppContext();
    const { toast } = useToast();
    
    const form = useForm<InwardFormValues>({
        resolver: zodResolver(inwardSchema),
    });

    useEffect(() => {
        if (record && isOpen) {
            const parsedDate = record.date ? parseISO(record.date) : null;
            form.reset({
                date: parsedDate && isValid(parsedDate) ? parsedDate : new Date(),
                sizes: record.sizes,
                quantity: record.quantity,
            });
        }
    }, [record, isOpen, form]);

    const onSubmit = (data: InwardFormValues) => {
        const updatedRecord: PpeInwardRecord = {
            ...record,
            date: data.date.toISOString(),
            sizes: record.ppeType === 'Coverall' ? data.sizes : null,
            quantity: record.ppeType === 'Safety Shoes' ? data.quantity : null,
        };
        updatePpeInwardRecord(updatedRecord);
        toast({ title: 'Record Updated', description: 'The inward stock record has been updated.' });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Inward Record</DialogTitle>
                    <DialogDescription>Update the details for this inward stock entry.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Date of Inward/Purchase</Label>
                        <Controller name="date" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
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
