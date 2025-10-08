

'use client';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, ChevronsUpDown } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';

const requestItemSchema = z.object({
  id: z.string(),
  inventoryItemId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit is required. (e.g., pcs, box, m)'),
  remarks: z.string().optional(),
});

const internalRequestSchema = z.object({
  items: z.array(requestItemSchema).min(1, 'At least one item is required.'),
});

type InternalRequestFormValues = z.infer<typeof internalRequestSchema>;

interface NewInternalRequestDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const generateNewItemId = () => `item-${Date.now()}-${Math.random()}`;

export default function NewInternalRequestDialog({ isOpen, setIsOpen }: NewInternalRequestDialogProps) {
  const { addInternalRequest, inventoryItems } = useAppContext();
  const { toast } = useToast();

  const consumableItems = useMemo(() => {
    return inventoryItems.filter(item => item.category === 'Daily Consumable' || item.category === 'Job Consumable');
  }, [inventoryItems]);

  const form = useForm<InternalRequestFormValues>({
    resolver: zodResolver(internalRequestSchema),
    defaultValues: {
      items: [{ id: generateNewItemId(), description: '', quantity: 1, unit: 'pcs', remarks: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const onSubmit = (data: InternalRequestFormValues) => {
    addInternalRequest(data);
    toast({
      title: 'Request Submitted',
      description: 'Your internal store request has been submitted.',
    });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ items: [{ id: generateNewItemId(), description: '', quantity: 1, unit: 'pcs', remarks: '' }] });
    }
    setIsOpen(open);
  };

  const handleItemSelect = (index: number, itemName: string) => {
    const item = consumableItems.find(i => i.name === itemName);
    if(item) {
        form.setValue(`items.${index}.description`, item.name);
        form.setValue(`items.${index}.inventoryItemId`, item.id);
        if(item.unit) {
            form.setValue(`items.${index}.unit`, item.unit);
        }
    } else {
        form.setValue(`items.${index}.description`, itemName);
        form.setValue(`items.${index}.inventoryItemId`, undefined);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>New Internal Store Request</DialogTitle>
          <DialogDescription>List the items you need from the internal store. You can select from available consumables or type a custom item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          {/* Static Header for the list */}
          <div className="grid grid-cols-12 gap-2 items-center px-4 pb-2 shrink-0">
            <div className="col-span-5"><Label className="text-xs">Item Description</Label></div>
            <div className="col-span-2"><Label className="text-xs">Quantity</Label></div>
            <div className="col-span-2"><Label className="text-xs">Unit</Label></div>
            <div className="col-span-2"><Label className="text-xs">Remarks</Label></div>
            <div className="col-span-1"></div>
          </div>

          {/* Scrollable Area for the items */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <Controller
                        name={`items.${index}.description`}
                        control={form.control}
                        render={({ field: controllerField }) => (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="relative">
                                      <Input
                                        {...controllerField}
                                        placeholder="Select or type item..."
                                        className="pr-8"
                                      />
                                      <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50"/>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput 
                                            placeholder="Search items..." 
                                            onValueChange={(value) => handleItemSelect(index, value)}
                                        />
                                        <CommandList>
                                            <CommandEmpty>No item found. You can still type a custom item.</CommandEmpty>
                                            <CommandGroup>
                                                {consumableItems.map(item => (
                                                <CommandItem
                                                    key={item.id}
                                                    value={item.name}
                                                    onSelect={() => handleItemSelect(index, item.name)}
                                                >
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
                    {form.formState.errors.items?.[index]?.description && <p className="text-xs text-destructive">{form.formState.errors.items[index]?.description?.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <Input id={`items.${index}.quantity`} type="number" {...form.register(`items.${index}.quantity`)} />
                     {form.formState.errors.items?.[index]?.quantity && <p className="text-xs text-destructive">{form.formState.errors.items[index]?.quantity?.message}</p>}
                  </div>
                   <div className="col-span-2">
                    <Input id={`items.${index}.unit`} {...form.register(`items.${index}.unit`)} placeholder="e.g., pcs" />
                     {form.formState.errors.items?.[index]?.unit && <p className="text-xs text-destructive">{form.formState.errors.items[index]?.unit?.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <Input id={`items.${index}.remarks`} {...form.register(`items.${index}.remarks`)} />
                  </div>
                  <div className="col-span-1 flex items-center h-full">
                     <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
           
           {/* Static Footer with buttons */}
          <div className="px-4 pt-4 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => append({ id: generateNewItemId(), description: '', quantity: 1, unit: 'pcs', remarks: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Item
                </Button>
                {form.formState.errors.items?.root && <p className="text-xs text-destructive pt-2">{form.formState.errors.items.root.message}</p>}
          </div>

          <DialogFooter className="pt-4 mt-auto border-t px-6 pb-6 shrink-0">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
