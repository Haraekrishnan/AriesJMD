
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
import { DatePickerInput } from '../ui/date-picker-input';
import { format, parseISO } from 'date-fns';
import type { InventoryItem } from '@/lib/types';

const bulkUpdateSchema = z.object({
  itemName: z.string().min(1, 'Please select an item name.'),
  originalInspectionDueDate: z.string({ required_error: 'Please select the due date to target.' }),
  newInspectionDate: z.date().optional().nullable(),
  newInspectionDueDate: z.date().optional().nullable(),
  newInspectionCertificateUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
}).refine(
  (data) => data.newInspectionDate || data.newInspectionDueDate || data.newInspectionCertificateUrl,
  {
    message: "At least one new value (date or link) must be provided to update.",
    path: ["newInspectionDate"],
  }
);


type BulkUpdateFormValues = z.infer<typeof bulkUpdateSchema>;

interface BulkUpdateInspectionDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function BulkUpdateInspectionDialog({ isOpen, setIsOpen }: BulkUpdateInspectionDialogProps) {
  const { inventoryItems, updateInspectionItemGroup } = useAppContext();
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
      if (item.name === watchItemName && item.inspectionDueDate) {
        dates.add(item.inspectionDueDate);
      }
    });
    return Array.from(dates).sort((a,b) => parseISO(a).getTime() - parseISO(b).getTime());
  }, [watchItemName, inventoryItems]);

  const onSubmit = (data: BulkUpdateFormValues) => {
    const updateData: Partial<Pick<InventoryItem, 'inspectionDate' | 'inspectionDueDate' | 'inspectionCertificateUrl'>> = {};

    if (data.newInspectionDate) {
        updateData.inspectionDate = data.newInspectionDate.toISOString();
    }
    if (data.newInspectionDueDate) {
        updateData.inspectionDueDate = data.newInspectionDueDate.toISOString();
    }
    if (data.newInspectionCertificateUrl) {
        updateData.inspectionCertificateUrl = data.newInspectionCertificateUrl;
    }
    
    updateInspectionItemGroup(data.itemName, data.originalInspectionDueDate, updateData);
    setIsOpen(false);
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
          <DialogTitle>Bulk Update Inspection Certificate</DialogTitle>
          <DialogDescription>
            Update dates and links for all items with the same name and due date.
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
                                form.setValue("originalInspectionDueDate", "");
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
            <Label>Current Inspection Due Date</Label>
            <Controller
                name="originalInspectionDueDate"
                control={form.control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchItemName || availableDates.length === 0}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a due date to target..." />
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
            {form.formState.errors.originalInspectionDueDate && <p className="text-xs text-destructive">{form.formState.errors.originalInspectionDueDate.message}</p>}
          </div>

          <div className="space-y-2">
              <Label>New Inspection Date</Label>
              <Controller name="newInspectionDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
              {form.formState.errors.newInspectionDate && <p className="text-xs text-destructive">{form.formState.errors.newInspectionDate.message}</p>}
          </div>
          <div className="space-y-2">
              <Label>New Inspection Due Date</Label>
              <Controller name="newInspectionDueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
              {form.formState.errors.newInspectionDueDate && <p className="text-xs text-destructive">{form.formState.errors.newInspectionDueDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>New Inspection Certificate Link</Label>
            <Input {...form.register('newInspectionCertificateUrl')} placeholder="https://..." />
            {form.formState.errors.newInspectionCertificateUrl && <p className="text-xs text-destructive">{form.formState.errors.newInspectionCertificateUrl.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Update Matching Items</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
