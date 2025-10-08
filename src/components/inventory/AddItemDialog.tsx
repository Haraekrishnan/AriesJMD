

'use client';
import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { InventoryItemStatus, InventoryCategory } from '@/lib/types';
import { DatePickerInput } from '../ui/date-picker-input';
import { Textarea } from '../ui/textarea';

const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  serialNumber: z.string().optional(),
  ariesId: z.string().optional(),
  chestCrollNo: z.string().optional(),
  status: z.enum(['In Use', 'In Store', 'Damaged', 'Expired']),
  projectId: z.string().min(1, 'Location is required'),
  inspectionDate: z.date().optional().nullable(),
  inspectionDueDate: z.date().optional().nullable(),
  tpInspectionDueDate: z.date().optional().nullable(),
  category: z.enum(['General', 'Daily Consumable', 'Job Consumable']).default('General'),
  remarks: z.string().optional(),
  quantity: z.coerce.number().optional(),
  unit: z.string().optional(),
}).superRefine((data, ctx) => {
    if(data.category === 'General' && !data.serialNumber) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Serial number is required for General items.",
            path: ['serialNumber'],
        });
    }
});


type ItemFormValues = z.infer<typeof itemSchema>;

interface AddItemDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const statusOptions: InventoryItemStatus[] = ['In Use', 'In Store', 'Damaged', 'Expired'];
const categoryOptions: InventoryCategory[] = ['General', 'Daily Consumable', 'Job Consumable'];

export default function AddItemDialog({ isOpen, setIsOpen }: AddItemDialogProps) {
  const { projects, addInventoryItem, inventoryItems } = useAppContext();
  const { toast } = useToast();

  const itemNames = useMemo(() => Array.from(new Set(inventoryItems.map(item => item.name))), [inventoryItems]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      status: 'In Store',
      category: 'General',
      quantity: 1,
    },
  });

  const itemName = form.watch('name');
  const category = form.watch('category');

  const onSubmit = (data: ItemFormValues) => {
    addInventoryItem({
        ...data,
        serialNumber: data.serialNumber || `N/A-${Date.now()}`,
        inspectionDate: data.inspectionDate ? data.inspectionDate.toISOString() : '',
        inspectionDueDate: data.inspectionDueDate ? data.inspectionDueDate.toISOString() : '',
        tpInspectionDueDate: data.tpInspectionDueDate ? data.tpInspectionDueDate.toISOString() : '',
    });
    toast({ title: 'Item Added', description: `${data.name} has been added to the inventory.` });
    setIsOpen(false);
    form.reset();
  };
  
  const handleOpenChange = (open: boolean) => {
      if (!open) form.reset();
      setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>Fill in the details for the new item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="name">Item Name</Label>
                    <Input id="name" {...form.register('name')} placeholder="e.g., Harness or select" list="item-names" />
                    <datalist id="item-names">
                        {itemNames.map(n => <option key={n} value={n} />)}
                    </datalist>
                    {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                </div>
                 <div>
                    <Label>Category</Label>
                    <Controller control={form.control} name="category" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categoryOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>)}/>
                </div>
            </div>
             <div>
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" {...form.register('serialNumber')} disabled={category !== 'General'} />
                {form.formState.errors.serialNumber && <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>}
            </div>

            {itemName?.toLowerCase() === 'harness' && category === 'General' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="ariesId">Aries ID (sl no)</Label>
                        <Input id="ariesId" {...form.register('ariesId')} />
                    </div>
                    <div>
                        <Label htmlFor="chestCrollNo">Chest Croll No</Label>
                        <Input id="chestCrollNo" {...form.register('chestCrollNo')} />
                    </div>
                </div>
            )}
             {category !== 'General' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" type="number" {...form.register('quantity')} />
                    </div>
                    <div>
                        <Label htmlFor="unit">Unit</Label>
                        <Input id="unit" {...form.register('unit')} placeholder="e.g., pcs, box, m" />
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Status</Label>
                    <Controller control={form.control} name="status" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>)}/>
                </div>
                <div>
                    <Label>Location</Label>
                    <Controller control={form.control} name="projectId" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select location..."/></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>)}/>
                    {form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
                </div>
            </div>

            {category === 'General' && (
              <>
                <div><Label>Inspection Date</Label><Controller name="inspectionDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />{form.formState.errors.inspectionDate && <p className="text-xs text-destructive">{form.formState.errors.inspectionDate.message}</p>}</div>
                <div><Label>Inspection Due Date</Label><Controller name="inspectionDueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />{form.formState.errors.inspectionDueDate && <p className="text-xs text-destructive">{form.formState.errors.inspectionDueDate.message}</p>}</div>
                <div><Label>TP Inspection Due Date</Label><Controller name="tpInspectionDueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />{form.formState.errors.tpInspectionDueDate && <p className="text-xs text-destructive">{form.formState.errors.tpInspectionDueDate.message}</p>}</div>
              </>
            )}

            <div>
                <Label>Remarks (Description)</Label>
                <Textarea {...form.register('remarks')} placeholder="Add any notes..." />
            </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
