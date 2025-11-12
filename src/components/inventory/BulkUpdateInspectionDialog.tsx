
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

const bulkUpdateSchema = z.object({
  itemName: z.string().min(1, 'Please select an item name.'),
  projectId: z.string().min(1, 'Please select a project.'),
  inspectionDate: z.date({ required_error: 'Inspection Date is required' }),
  inspectionDueDate: z.date({ required_error: 'Inspection Due Date is required' }),
  inspectionCertificateUrl: z.string().url({ message: "Please enter a valid URL." }),
});

type BulkUpdateFormValues = z.infer<typeof bulkUpdateSchema>;

interface BulkUpdateInspectionDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function BulkUpdateInspectionDialog({ isOpen, setIsOpen }: BulkUpdateInspectionDialogProps) {
  const { inventoryItems, projects, updateInventoryItemGroupByProject } = useAppContext();
  const { toast } = useToast();
  const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);
  
  const itemNames = useMemo(() => Array.from(new Set(inventoryItems.map(item => item.name))), [inventoryItems]);

  const form = useForm<BulkUpdateFormValues>({
    resolver: zodResolver(bulkUpdateSchema),
  });

  const onSubmit = (data: BulkUpdateFormValues) => {
    updateInventoryItemGroupByProject(data.itemName, data.projectId, {
      inspectionDate: data.inspectionDate.toISOString(),
      inspectionDueDate: data.inspectionDueDate.toISOString(),
      inspectionCertificateUrl: data.inspectionCertificateUrl,
    });
    toast({
      title: 'Bulk Update Successful',
      description: `All '${data.itemName}' items in '${projects.find(p => p.id === data.projectId)?.name}' have been updated.`,
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
          <DialogTitle>Bulk Update Inspection Certificate</DialogTitle>
          <DialogDescription>
            Update dates and links for all items of a specific type within a project.
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
            <Label>Project/Plant</Label>
            <Controller
              name="projectId"
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select project..."/></SelectTrigger>
                    <SelectContent>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
          </div>

          <div className="space-y-2">
              <Label>Inspection Date</Label>
              <Controller name="inspectionDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
              {form.formState.errors.inspectionDate && <p className="text-xs text-destructive">{form.formState.errors.inspectionDate.message}</p>}
          </div>
          <div className="space-y-2">
              <Label>New Inspection Due Date</Label>
              <Controller name="inspectionDueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
              {form.formState.errors.inspectionDueDate && <p className="text-xs text-destructive">{form.formState.errors.inspectionDueDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>New Inspection Certificate Link</Label>
            <Input {...form.register('inspectionCertificateUrl')} placeholder="https://..." />
            {form.formState.errors.inspectionCertificateUrl && <p className="text-xs text-destructive">{form.formState.errors.inspectionCertificateUrl.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Update All Matching Items</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
