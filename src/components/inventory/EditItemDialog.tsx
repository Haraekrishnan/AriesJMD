'use client';
import { useEffect, useMemo } from 'react';
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
import { Textarea } from '../ui/textarea';
import type { InventoryItem, InventoryItemStatus } from '@/lib/types';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '../ui/calendar';


const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  ariesId: z.string().optional(),
  chestCrollNo: z.string().optional(),
  status: z.enum(['In Use', 'In Store', 'Damaged', 'Expired']),
  projectId: z.string().min(1, 'Location is required'),
  inspectionDate: z.date({ required_error: 'Inspection date is required' }),
  inspectionDueDate: z.date({ required_error: 'Inspection due date is required' }),
  tpInspectionDueDate: z.date({ required_error: 'TP inspection due date is required' }),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface EditItemDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: InventoryItem;
}

const statusOptions: InventoryItemStatus[] = ['In Use', 'In Store', 'Damaged', 'Expired'];

export default function EditItemDialog({ isOpen, setIsOpen, item }: EditItemDialogProps) {
  const { updateInventoryItem, projects, inventoryItems } = useAppContext();
  const { toast } = useToast();
  
  const itemNames = useMemo(() => Array.from(new Set(inventoryItems.map(item => item.name))), [inventoryItems]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
  });
  
  const itemName = form.watch('name');

  useEffect(() => {
    if(item && isOpen) {
        form.reset({
            ...item,
            inspectionDate: new Date(item.inspectionDate),
            inspectionDueDate: new Date(item.inspectionDueDate),
            tpInspectionDueDate: new Date(item.tpInspectionDueDate),
        });
    }
  }, [item, isOpen, form]);

  const onSubmit = (data: ItemFormValues) => {
    updateInventoryItem({ 
        ...item, 
        ...data,
        inspectionDate: data.inspectionDate.toISOString(),
        inspectionDueDate: data.inspectionDueDate.toISOString(),
        tpInspectionDueDate: data.tpInspectionDueDate.toISOString(),
    });
    toast({
      title: 'Item Updated',
      description: `${data.name} has been updated.`,
    });
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit: {item.name}</DialogTitle>
          <DialogDescription>Update the details for this item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input id="serialNumber" {...form.register('serialNumber')} />
                    {form.formState.errors.serialNumber && <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>}
                </div>
            </div>

            {itemName?.toLowerCase() === 'harness' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="ariesId">Aries ID</Label>
                        <Input id="ariesId" {...form.register('ariesId')} />
                    </div>
                    <div>
                        <Label htmlFor="chestCrollNo">Chest Croll No</Label>
                        <Input id="chestCrollNo" {...form.register('chestCrollNo')} />
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

            <div><Label>Inspection Date</Label><Controller control={form.control} name="inspectionDate" render={({ field }) => (<Popover><PopoverTrigger asChild><Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'dd-MM-yyyy') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>)}/>{form.formState.errors.inspectionDate && <p className="text-xs text-destructive">{form.formState.errors.inspectionDate.message}</p>}</div>
            <div><Label>Inspection Due Date</Label><Controller control={form.control} name="inspectionDueDate" render={({ field }) => (<Popover><PopoverTrigger asChild><Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'dd-MM-yyyy') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>)}/>{form.formState.errors.inspectionDueDate && <p className="text-xs text-destructive">{form.formState.errors.inspectionDueDate.message}</p>}</div>
            <div><Label>TP Inspection Due Date</Label><Controller control={form.control} name="tpInspectionDueDate" render={({ field }) => (<Popover><PopoverTrigger asChild><Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'dd-MM-yyyy') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>)}/>{form.formState.errors.tpInspectionDueDate && <p className="text-xs text-destructive">{form.formState.errors.tpInspectionDueDate.message}</p>}</div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
