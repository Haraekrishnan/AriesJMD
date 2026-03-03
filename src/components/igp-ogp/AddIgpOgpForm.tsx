'use client';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const itemSchema = z.object({
  id: z.string(),
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().min(1, 'Must be at least 1'),
  uom: z.string().min(1, 'UOM is required'),
});

const igpOgpSchema = z.object({
  type: z.enum(['IGP', 'OGP']),
  mrnNumber: z.string().min(1, 'MRN number is required'),
  date: z.date({ required_error: 'Date is required' }),
  location: z.string().min(1, 'Location is required'),
  materialInBy: z.string().optional(),
  materialOutBy: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Please add at least one item.'),
}).refine(data => data.type === 'IGP' ? !!data.materialInBy : true, {
    message: 'Material In By is required for IGP',
    path: ['materialInBy'],
}).refine(data => data.type === 'OGP' ? !!data.materialOutBy : true, {
    message: 'Material Out By is required for OGP',
    path: ['materialOutBy'],
});

type FormValues = z.infer<typeof igpOgpSchema>;

export default function AddIgpOgpForm() {
  const { addIgpOgpRecord } = useAppContext();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(igpOgpSchema),
    defaultValues: {
      type: 'IGP',
      items: [{ id: `item-${Date.now()}`, itemName: '', quantity: 1, uom: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const watchType = form.watch('type');

  const onSubmit = (data: FormValues) => {
    addIgpOgpRecord(data);
    toast({ title: 'Record Added', description: `The ${data.type} record has been saved.` });
    form.reset({
      type: 'IGP',
      mrnNumber: '',
      location: '',
      materialInBy: '',
      materialOutBy: '',
      items: [{ id: `item-${Date.now()}`, itemName: '', quantity: 1, uom: '' }]
    });
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
            <Label>Type</Label>
            <Controller name="type" control={form.control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="IGP">IGP (Inward)</SelectItem><SelectItem value="OGP">OGP (Outward)</SelectItem></SelectContent>
                </Select>
            )}/>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mrnNumber">MRN Number</Label>
          <Input id="mrnNumber" {...form.register('mrnNumber')} />
          {form.formState.errors.mrnNumber && <p className="text-xs text-destructive">{form.formState.errors.mrnNumber.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Controller name="date" control={form.control} render={({field}) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
          {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...form.register('location')} />
          {form.formState.errors.location && <p className="text-xs text-destructive">{form.formState.errors.location.message}</p>}
        </div>
        {watchType === 'IGP' && (
            <div className="space-y-2">
              <Label htmlFor="materialInBy">Material In By</Label>
              <Input id="materialInBy" {...form.register('materialInBy')} />
              {form.formState.errors.materialInBy && <p className="text-xs text-destructive">{form.formState.errors.materialInBy.message}</p>}
            </div>
        )}
        {watchType === 'OGP' && (
            <div className="space-y-2">
              <Label htmlFor="materialOutBy">Material Out By</Label>
              <Input id="materialOutBy" {...form.register('materialOutBy')} />
              {form.formState.errors.materialOutBy && <p className="text-xs text-destructive">{form.formState.errors.materialOutBy.message}</p>}
            </div>
        )}
      </div>

      <div className="space-y-4">
        <Label className="font-semibold">Items</Label>
        {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-6 space-y-1">
                    <Input {...form.register(`items.${index}.itemName`)} placeholder="Item Name" />
                    {form.formState.errors.items?.[index]?.itemName && <p className="text-xs text-destructive">{form.formState.errors.items[index]?.itemName?.message}</p>}
                </div>
                <div className="col-span-2 space-y-1">
                    <Input type="number" {...form.register(`items.${index}.quantity`)} placeholder="Qty" />
                </div>
                <div className="col-span-2 space-y-1">
                    <Input {...form.register(`items.${index}.uom`)} placeholder="UOM" />
                    {form.formState.errors.items?.[index]?.uom && <p className="text-xs text-destructive">{form.formState.errors.items[index]?.uom?.message}</p>}
                </div>
                <div className="col-span-2 flex items-center h-10">
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                </div>
            </div>
        ))}
         <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `item-${Date.now()}`, itemName: '', quantity: 1, uom: '' })}>
            <PlusCircle className="mr-2 h-4 w-4"/>Add Item
        </Button>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit">Add Record</Button>
      </div>
    </form>
  );
}