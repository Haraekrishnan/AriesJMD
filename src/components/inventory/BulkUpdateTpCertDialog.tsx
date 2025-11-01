'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { ChevronsUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format, parseISO } from 'date-fns';

const bulkUpdateSchema = z.object({
  itemName: z.string().min(1, 'Please select an item name.'),
  tpInspectionDueDate: z.string({ required_error: 'TP Inspection Due Date is required' }),
  certificateUrl: z.string().url({ message: "Please enter a valid URL." }),
});

type BulkUpdateFormValues = z.infer<typeof bulkUpdateSchema>;

interface BulkUpdateTpCertDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function BulkUpdateTpCertDialog({ isOpen, setIsOpen }: BulkUpdateTpCertDialogProps) {
  const { inventoryItems, updateInventoryItemGroup } = useAppContext();
  const { toast } = useToast();
  const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);
  
  const itemNames = useMemo(() => Array.from(new Set(inventoryItems.map(item => item.name))), [inventoryItems]);

  const form = useForm<BulkUpdateFormValues>({
    resolver: zodResolver(bulkUpdateSchema),
  });

  const watchItemName = form.watch('itemName');

  const availableDates = useMemo(() => {
    if (!watchItemName) return [];
    const dates = new Set<string>();
    inventoryItems.forEach(item => {
      if (item.name === watchItemName && item.tpInspectionDueDate) {
        dates.add(item.tpInspectionDueDate);
      }
    });
    return Array.from(dates).sort((a,b) => parseISO(a).getTime() - parseISO(b).getTime());
  }, [watchItemName, inventoryItems]);

  const onSubmit = (data: BulkUpdateFormValues) => {
    updateInventoryItemGroup(data.itemName, {
      tpInspectionDueDate: data.tpInspectionDueDate,
      certificateUrl: data.certificateUrl,
    });
    toast({
      title: 'Bulk Update Successful',
      description: `All items named "${data.itemName}" have been updated.`,
    });
    setIsOpen(false);
    form.reset();
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Update TP Certificate</DialogTitle>
          <DialogDescription>
            Update the TP Inspection Due Date and Certificate Link for all items with the same name.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Item Name</Label>
            <Controller
              name="itemName"
              control={form.control}
              render={({ field }) => (
                <Popover open={isItemPopoverOpen} onOpenChange={setIsItemPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {field.value || "Select item name..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search item name..." />
                      <CommandList>
                        <CommandEmpty>No items found.</CommandEmpty>
                        <CommandGroup>
                          {itemNames.map((name) => (
                            <CommandItem
                              key={name}
                              value={name}
                              onSelect={() => {
                                form.setValue("itemName", name);
                                form.setValue("tpInspectionDueDate", ""); // Reset date on item change
                                setIsItemPopoverOpen(false);
                              }}
                            >
                              {name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
            {form.formState.errors.itemName && <p className="text-xs text-destructive">{form.formState.errors.itemName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>TP Inspection Due Date to Update</Label>
            <Controller
                name="tpInspectionDueDate"
                control={form.control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchItemName || availableDates.length === 0}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a due date..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableDates.map(date => (
                                <SelectItem key={date} value={date}>
                                    {format(parseISO(date), 'dd-MM-yyyy')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
            {form.formState.errors.tpInspectionDueDate && <p className="text-xs text-destructive">{form.formState.errors.tpInspectionDueDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>New Certificate Link</Label>
            <Input {...form.register('certificateUrl')} placeholder="https://..." />
            {form.formState.errors.certificateUrl && <p className="text-xs text-destructive">{form.formState.errors.certificateUrl.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Update All</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
