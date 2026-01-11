
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
import { ConsumableInwardRecord } from '@/lib/types';
import { useEffect } from 'react';
import { parseISO, isValid } from 'date-fns';
import { get, ref, set } from 'firebase/database';
import { rtdb } from '@/lib/rtdb';


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

interface EditConsumableInwardDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  record: ConsumableInwardRecord;
}

export default function EditConsumableInwardDialog({ isOpen, setIsOpen, record }: EditConsumableInwardDialogProps) {
    const { updateConsumableInwardRecord, consumableItems, consumableInwardHistory } = useAppContext();
    const { toast } = useToast();
    
    const form = useForm<InwardFormValues>({
        resolver: zodResolver(inwardSchema),
    });

    useEffect(() => {
        if (record && isOpen) {
            const parsedDate = record.date ? parseISO(record.date) : null;
            form.reset({
                date: parsedDate && isValid(parsedDate) ? parsedDate : new Date(),
                quantity: record.quantity,
            });
        }
    }, [record, isOpen, form]);

    const onSubmit = (data: InwardFormValues) => {
        const originalRecord = consumableInwardHistory.find(r => r.id === record.id);
        if (!originalRecord) return;
        
        const quantityDifference = data.quantity! - originalRecord.quantity;

        updateConsumableInwardRecord({ ...record, ...data, date: data.date.toISOString() });
        
        // Update stock level
        const itemRef = ref(rtdb, `inventoryItems/${record.itemId}/quantity`);
        get(itemRef).then(snapshot => {
            const currentQuantity = snapshot.val() || 0;
            set(itemRef, Math.max(0, currentQuantity + quantityDifference));
        });

        toast({ title: 'Record Updated', description: 'The inward stock record has been updated.' });
        setIsOpen(false);
    };

    const item = consumableItems.find(i => i.id === record.itemId);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Inward Record for {item?.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Date of Inward/Purchase</Label>
                        <Controller name="date" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" type="number" {...form.register('quantity')} />
                        {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
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

