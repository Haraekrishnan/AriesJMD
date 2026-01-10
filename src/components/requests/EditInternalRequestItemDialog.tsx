
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { useConsumable } from '@/contexts/consumable-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import type { InternalRequest, InternalRequestItem } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Textarea } from '../ui/textarea';


const itemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit is required. (e.g., pcs, box, m)'),
  inventoryItemId: z.string().optional(),
});

type FormValues = z.infer<typeof itemSchema>;

interface EditInternalRequestItemDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  request: InternalRequest;
  item: InternalRequestItem;
  isConsumable: boolean;
}

export default function EditInternalRequestItemDialog({ isOpen, setIsOpen, request, item, isConsumable }: EditInternalRequestItemDialogProps) {
  const { updateInternalRequestItem } = useAppContext();
  const { consumableItems } = useConsumable();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isReasonDialogOpen, setIsReasonDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [formData, setFormData] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
  });

  useEffect(() => {
    if (item && isOpen) {
      form.reset({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        inventoryItemId: item.inventoryItemId,
      });
      setSearchTerm('');
    }
  }, [item, isOpen, form]);
  
  const filteredItems = useMemo(() => {
    if (!searchTerm) return consumableItems;
    return consumableItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, consumableItems]);
  
  const handleSaveChanges = (data: FormValues) => {
    const hasChanged = data.description !== item.description || data.quantity !== item.quantity;
    if (hasChanged) {
        setFormData(data);
        setIsReasonDialogOpen(true);
    } else {
        submitUpdate(data);
    }
  };

  const submitUpdate = (data: FormValues, changeReason?: string) => {
    const updatedItem = { ...item, ...data, inventoryItemId: data.inventoryItemId || null };
    updateInternalRequestItem(request.id, updatedItem as InternalRequestItem, item, changeReason);
    toast({ title: 'Item Updated', description: 'The request item has been updated.' });
    setIsOpen(false);
  };
  
  const handleConfirmReason = () => {
    if (!reason.trim()) {
        toast({ title: 'Reason is required', variant: 'destructive' });
        return;
    }
    if (formData) {
        submitUpdate(formData, reason);
    }
    setIsReasonDialogOpen(false);
    setReason('');
  };

  const handleItemSelect = (itemName: string) => {
    const selectedItem = consumableItems.find(i => i.name === itemName);
    if(selectedItem) {
        form.setValue(`description`, selectedItem.name);
        form.setValue(`inventoryItemId`, selectedItem.id);
        if(selectedItem.unit) {
            form.setValue(`unit`, selectedItem.unit);
        }
    }
    setPopoverOpen(false);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Request Item</DialogTitle>
          <DialogDescription>Modify the item details for this request.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Item Description</Label>
            {isConsumable ? (
                <Controller
                    name="inventoryItemId"
                    control={form.control}
                    render={({ field }) => (
                         <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    <span className="truncate">{form.getValues('description') || "Select item..."}</span>
                                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50"/>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput 
                                        placeholder="Search items..." 
                                        onValueChange={setSearchTerm}
                                    />
                                    <CommandList>
                                        <CommandEmpty>No item found.</CommandEmpty>
                                        <CommandGroup>
                                            {filteredItems.map(item => (
                                            <CommandItem
                                                key={item.id}
                                                value={item.name}
                                                onSelect={() => handleItemSelect(item.name)}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", item.id === field.value ? "opacity-100" : "opacity-0")} />
                                                {item.name}
                                            </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    )}
                />
            ) : (
                 <Input id="description" {...form.register('description')} />
            )}
            {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" {...form.register('quantity')} />
              {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" {...form.register('unit')} />
              {form.formState.errors.unit && <p className="text-xs text-destructive">{form.formState.errors.unit.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={isReasonDialogOpen} onOpenChange={setIsReasonDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Reason for Change</AlertDialogTitle>
                <AlertDialogDescription>Please provide a reason for modifying this item. This will be logged.</AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Type your reason here..." />
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmReason}>Confirm & Save</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
