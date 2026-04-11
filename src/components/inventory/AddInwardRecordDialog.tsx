'use client';
import { useForm, useFieldArray } from 'react-hook-form';
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

const newItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  serialNumber: z.string().min(1, 'Serial is required'),
  ariesId: z.string().optional(),
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

export default function AddInwardRecordDialog({ isOpen, setIsOpen }: AddInwardRecordDialogProps) {
  const { batchCreateAndLogItems, inventoryItems } = useAppContext();
  const { toast } = useToast();

  const itemNames = useMemo(() => Array.from(new Set(inventoryItems.map(item => item.name))), [inventoryItems]);

  const form = useForm<FormValues>({
    resolver: zodResolver(batchInwardSchema),
    defaultValues: {
      source: '',
      items: [{ id: `item-${Date.now()}`, name: '', serialNumber: '', ariesId: '', remarks: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = (data: FormValues) => {
    const itemsToCreate = data.items.map(({ id, ...rest }) => rest);
    const count = batchCreateAndLogItems(itemsToCreate, data.source);
    toast({ title: 'Batch Inward Successful', description: `${count} new items were created and logged.` });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({
        source: '',
        items: [{ id: `item-${Date.now()}`, name: '', serialNumber: '', ariesId: '', remarks: '' }],
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
            <div className="grid grid-cols-12 gap-2 font-medium text-xs text-muted-foreground px-4 pb-2 shrink-0">
              <div className="col-span-3">Item Name</div>
              <div className="col-span-3">Serial Number</div>
              <div className="col-span-2">Aries ID</div>
              <div className="col-span-3">Remarks</div>
              <div className="col-span-1"></div>
            </div>
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4">
                <datalist id="item-names-list">
                  {itemNames.map(n => <option key={n} value={n} />)}
                </datalist>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-3">
                      <Input {...form.register(`items.${index}.name`)} placeholder="e.g., Harness" list="item-names-list" />
                      {form.formState.errors.items?.[index]?.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.items?.[index]?.name?.message}</p>}
                    </div>
                    <div className="col-span-3">
                      <Input {...form.register(`items.${index}.serialNumber`)} placeholder="Serial Number" />
                      {form.formState.errors.items?.[index]?.serialNumber && <p className="text-xs text-destructive mt-1">{form.formState.errors.items?.[index]?.serialNumber?.message}</p>}
                    </div>
                    <div className="col-span-2">
                      <Input {...form.register(`items.${index}.ariesId`)} placeholder="Aries ID" />
                    </div>
                    <div className="col-span-3">
                      <Input {...form.register(`items.${index}.remarks`)} placeholder="Optional remarks" />
                    </div>
                    <div className="col-span-1 flex items-center h-full">
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="px-4 pt-4 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `item-${Date.now()}`, name: '', serialNumber: '', ariesId: '', remarks: '' })}>
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
