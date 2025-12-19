
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
import type { InternalRequest, InternalRequestItem } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { useConsumable } from '@/contexts/consumable-provider';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';


const itemSchema = z.object({
  inventoryItemId: z.string().min(1, 'Please select an item.'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit is required. (e.g., pcs, box, m)'),
});

type FormValues = z.infer<typeof itemSchema>;

interface EditInternalRequestItemDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  request: InternalRequest;
  item: InternalRequestItem;
}

export default function EditInternalRequestItemDialog({ isOpen, setIsOpen, request, item }: EditInternalRequestItemDialogProps) {
  const { updateInternalRequestItem } = useAppContext();
  const { consumableItems } = useConsumable();
  const { toast } = useToast();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
  });

  useEffect(() => {
    if (item && isOpen) {
      form.reset({
        inventoryItemId: item.inventoryItemId || '',
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
      });
    }
  }, [item, isOpen, form]);

  const onSubmit = (data: FormValues) => {
    const updatedItem = { ...item, ...data };
    updateInternalRequestItem(request.id, updatedItem, item);
    toast({ title: 'Item Updated', description: 'The request item has been updated.' });
    setIsOpen(false);
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
    setIsPopoverOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Request Item</DialogTitle>
          <DialogDescription>Modify the item details for this request.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Item Description</Label>
             <Controller
                name="inventoryItemId"
                control={form.control}
                render={({ field: controllerField }) => (
                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <span className="truncate">{form.getValues(`description`) || "Select item..."}</span>
                                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50"/>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search items..." />
                                <CommandList>
                                    <CommandEmpty>No item found.</CommandEmpty>
                                    <CommandGroup>
                                        {consumableItems.map(item => (
                                        <CommandItem
                                            key={item.id}
                                            value={item.name}
                                            onSelect={() => handleItemSelect(item.name)}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", item.id === controllerField.value ? "opacity-100" : "opacity-0")} />
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
  );
}
