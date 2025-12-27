
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, Upload, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import Link from 'next/link';

const damageReportSchema = z.object({
  itemId: z.string().optional(),
  otherItemName: z.string().optional(),
  reason: z.string().min(10, 'A detailed reason is required.'),
  attachmentOriginalUrl: z.string().url({ message: 'Please enter a valid URL.' }).refine(url => url.includes('drive.google.com'), 'Please provide a valid Google Drive link.').optional().or(z.literal('')),
}).refine(data => data.itemId || data.otherItemName, {
  message: 'You must either select an inventory item or specify an item name.',
  path: ['itemId'],
});

type FormValues = z.infer<typeof damageReportSchema>;

interface NewDamageReportDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function NewDamageReportDialog({ isOpen, setIsOpen }: NewDamageReportDialogProps) {
  const { user, inventoryItems, utMachines, dftMachines } = useAppContext();
  const { addDamageReport } = useInventory();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isItemTypePopoverOpen, setIsItemTypePopoverOpen] = useState(false);
  const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);

  const [selectedItemType, setSelectedItemType] = useState<string | null>(null);
  
  const SHARED_DRIVE_FOLDER = "https://drive.google.com/drive/folders/1zubHqst5iiZEKRbnWQJWYgs0BvSoRe6f?usp=sharing";

  const form = useForm<FormValues>({
    resolver: zodResolver(damageReportSchema),
    defaultValues: {
      reason: '',
    }
  });
  
  const allItems = useMemo(() => {
    const items = [...inventoryItems, ...utMachines, ...dftMachines];
    if (!user || !user.projectIds) return items;
    if (user.role === 'Admin') {
      return items;
    }
    const userProjectIds = new Set(user.projectIds);
    return items.filter(item => item.projectId && userProjectIds.has(item.projectId));
  }, [inventoryItems, utMachines, dftMachines, user]);


  const selectableItems = useMemo(() => {
    if (!user) return [];
    return allItems;
  }, [allItems, user]);

  const uniqueItemNames = useMemo(() => {
    const names = new Set<string>();
    selectableItems.forEach(item => {
        const name = (item as any).name || (item as any).machineName;
        if (name) names.add(name);
    });
    return Array.from(names).sort();
  }, [selectableItems]);

  const availableItemsOfType = useMemo(() => {
    if (!selectedItemType) return [];
    return selectableItems.filter(item => {
        const name = (item as any).name || (item as any).machineName;
        return name === selectedItemType;
    });
  }, [selectableItems, selectedItemType]);


  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const result = await addDamageReport(data);
      if (result.success) {
        toast({ title: 'Damage Report Submitted', description: 'Your report has been successfully submitted.' });
        form.reset();
        setSelectedItemType(null);
        setIsOpen(false);
      } else {
        throw new Error(result.error || 'An unknown error occurred during submission.');
      }
    } catch (error: any) {
      console.error('Damage report submission failed:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'Something went wrong. Please check the link and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
        form.reset();
        setSelectedItemType(null);
    }
    setIsOpen(open);
  };
  
  const selectedItemId = form.watch('itemId');
  const selectedItemName = useMemo(() => {
    if (!selectedItemId) return "Select specific item...";
    const item = allItems.find(i => i.id === selectedItemId);
    const name = item?.name || (item as any)?.machineName;
    return item ? `${name} (SN: ${item.serialNumber})` : "Select specific item...";
  }, [selectedItemId, allItems]);

  const attachmentLink = form.watch('attachmentOriginalUrl');

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Damage Report</DialogTitle>
          <DialogDescription>Submit a report for a damaged item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 pr-6 -mr-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Item Type</Label>
                    <Popover open={isItemTypePopoverOpen} onOpenChange={setIsItemTypePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                          <span className="truncate">{selectedItemType || "Select an item type..."}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search item type..." />
                          <CommandList>
                            <CommandEmpty>No item type found.</CommandEmpty>
                            <CommandGroup>
                              {uniqueItemNames.map(name => (
                                <CommandItem key={name} value={name} onSelect={() => { 
                                  setSelectedItemType(name);
                                  form.setValue('itemId', '');
                                  form.setValue('otherItemName', '');
                                  setIsItemTypePopoverOpen(false); 
                                }}>
                                  {name}
                                </CommandItem>
                              ))}
                              <CommandItem onSelect={() => { 
                                setSelectedItemType('Other');
                                form.setValue('itemId', '');
                                setIsItemTypePopoverOpen(false); 
                              }}>Other (Specify below)</CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
              </div>

              {selectedItemType && selectedItemType !== 'Other' && (
                <div className="space-y-2">
                  <Label>Select Specific Item (by SN or Aries ID)</Label>
                   <Controller
                    name="itemId"
                    control={form.control}
                    render={({ field }) => (
                      <Popover open={isItemPopoverOpen} onOpenChange={setIsItemPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between">
                            <span className="truncate">{selectedItemName}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search by SN or Aries ID..."/>
                            <CommandList>
                              <CommandEmpty>No item found.</CommandEmpty>
                              <CommandGroup>
                                {availableItemsOfType.map(item => (
                                  <CommandItem key={item.id} value={`${item.serialNumber} ${item.ariesId}`} onSelect={() => { form.setValue('itemId', item.id); form.setValue('otherItemName', ''); setIsItemPopoverOpen(false); }}>
                                    {item.serialNumber} (ID: {item.ariesId || 'N/A'})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {form.formState.errors.itemId && <p className="text-xs text-destructive">{form.formState.errors.itemId.message}</p>}
                </div>
              )}

              {selectedItemType === 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="otherItemName">Specify Item Name</Label>
                  <Input id="otherItemName" {...form.register('otherItemName')} placeholder="e.g., Office Chair" />
                  {form.formState.errors.otherItemName && <p className="text-xs text-destructive">{form.formState.errors.otherItemName.message}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Damage</Label>
                <Textarea id="reason" {...form.register('reason')} placeholder="Describe the damage and how it occurred..." rows={5}/>
                {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Attachment</Label>
                <div className='flex items-center gap-2'>
                    <Button asChild variant="outline" size="sm">
                      <Link href={SHARED_DRIVE_FOLDER} target="_blank" rel="noopener noreferrer">
                        <Upload className="mr-2 h-4 w-4" /> Upload / Select File
                      </Link>
                    </Button>
                </div>
                <Input {...form.register('attachmentOriginalUrl')} placeholder="Paste Google Drive link here..." />
                 {attachmentLink && (
                  <Button asChild variant="link" size="sm" className="p-0 h-auto">
                    <Link href={attachmentLink} target="_blank" rel="noopener noreferrer">
                      <LinkIcon className="mr-2 h-3 w-3" /> Open Link
                    </Link>
                  </Button>
                 )}
                 {form.formState.errors.attachmentOriginalUrl && <p className="text-xs text-destructive">{form.formState.errors.attachmentOriginalUrl.message}</p>}
                <p className="text-xs text-muted-foreground">Upload the file to the shared Google Drive folder and paste the file link here.</p>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Report'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
