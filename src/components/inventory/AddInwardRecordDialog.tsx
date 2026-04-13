
'use client';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useMemo } from 'react';
import { DatePickerInput } from '../ui/date-picker-input';
import { Separator } from '../ui/separator';

const newItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  serialNumber: z.string().min(1, 'Serial is required'),
  ariesId: z.string().optional(),
  erpId: z.string().optional(),
  certification: z.string().optional(),
  chestCrollNo: z.string().optional(),
  purchaseDate: z.date().optional().nullable(),
  remarks: z.string().optional(),
});

const batchInwardSchema = z.object({
  source: z.string().min(1, 'A source or reason is required.'),
  items: z.array(newItemSchema).min(1, 'Add at least one item.'),
});

type FormValues = z.infer<typeof batchInwardSchema>;

interface AddInwardRecordDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const generateDefaultItem = () => ({
    id: `item-${Date.now()}-${Math.random()}`,
    name: '',
    serialNumber: '',
    ariesId: '',
    erpId: '',
    certification: '',
    chestCrollNo: '',
    purchaseDate: null,
    remarks: '',
});

export default function AddInwardRecordDialog({ isOpen, setIsOpen }: AddInwardRecordDialogProps) {
  const { batchCreateAndLogItems, inventoryItems } = useAppContext();
  const { toast } = useToast();

  const itemNames = useMemo(() => Array.from(new Set(inventoryItems.map(item => item.name))), [inventoryItems]);

  const form = useForm<FormValues>({
    resolver: zodResolver(batchInwardSchema),
    defaultValues: {
      source: '',
      items: [generateDefaultItem()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = (data: FormValues) => {
    const itemsToCreate = data.items.map(({ id, ...rest }) => ({
        ...rest,
        purchaseDate: rest.purchaseDate ? rest.purchaseDate.toISOString() : null,
    }));
    const count = batchCreateAndLogItems(itemsToCreate, data.source);
    toast({ title: 'Batch Inward Successful', description: `${count} new items were created and logged.` });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({
        source: '',
        items: [generateDefaultItem()],
      });
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl h-full flex flex-col sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>New Batch Inward Entry</DialogTitle>
          <DialogDescription>Create multiple new serialized items and log them as an inward transaction.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-1 py-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source / Reason</Label>
              <Input id="source" {...form.register('source')} placeholder="e.g., Purchase from Vendor XYZ, Initial Stock" />
              {form.formState.errors.source && <p className="text-xs text-destructive">{form.formState.errors.source.message}</p>}
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col mt-4">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4">
                <datalist id="item-names-list">
                  {itemNames.map(n => <option key={n} value={n} />)}
                </datalist>
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md relative bg-muted/30">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive"/>
                    </Button>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Item Name</Label>
                            <Input {...form.register(`items.${index}.name`)} placeholder="e.g., Harness" list="item-names-list" />
                            {form.formState.errors.items?.[index]?.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.items[index]?.name?.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Serial Number</Label>
                            <Input {...form.register(`items.${index}.serialNumber`)} placeholder="Serial Number" />
                            {form.formState.errors.items?.[index]?.serialNumber && <p className="text-xs text-destructive mt-1">{form.formState.errors.items[index]?.serialNumber?.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Aries ID</Label>
                            <Input {...form.register(`items.${index}.ariesId`)} placeholder="Aries ID" />
                        </div>
                        <div className="space-y-2">
                            <Label>Chest Croll No.</Label>
                            <Input {...form.register(`items.${index}.chestCrollNo`)} placeholder="Chest Croll No." />
                        </div>
                         <div className="space-y-2">
                            <Label>ERP ID</Label>
                            <Input {...form.register(`items.${index}.erpId`)} placeholder="ERP ID" />
                        </div>
                        <div className="space-y-2">
                            <Label>Certification</Label>
                            <Input {...form.register(`items.${index}.certification`)} placeholder="Certification" />
                        </div>
                        <div className="space-y-2">
                            <Label>Purchase Date</Label>
                            <Controller
                                name={`items.${index}.purchaseDate`}
                                control={form.control}
                                render={({ field: dateField }) => (
                                    <DatePickerInput
                                        value={dateField.value || undefined}
                                        onChange={dateField.onChange}
                                    />
                                )}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label>Remarks</Label>
                            <Input {...form.register(`items.${index}.remarks`)} placeholder="Optional remarks" />
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="px-4 pt-4 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => append(generateDefaultItem())}>
              <PlusCircle className="mr-2 h-4 w-4" />Add Row
            </Button>
            {form.formState.errors.items?.root && <p className="text-xs text-destructive pt-2">{form.formState.errors.items.root.message}</p>}
          </div>
          <DialogFooter className="pt-4 mt-auto border-t px-6 pb-6 shrink-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit">Create & Log Items</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

