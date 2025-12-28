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
import { ChevronsUpDown, Upload, Link as LinkIcon, AlertCircle, Paperclip, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import Link from 'next/link';

const damageReportSchema = z.object({
  itemId: z.string().optional(),
  otherItemName: z.string().optional(),
  reason: z.string().min(10, 'A detailed reason is required.'),
  attachmentOriginalUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
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
  const { user, inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, damageReports } = useAppContext();
  const { addDamageReport } = useInventory();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isItemTypePopoverOpen, setIsItemTypePopoverOpen] = useState(false);
  const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);

  const [selectedItemType, setSelectedItemType] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(damageReportSchema),
    defaultValues: {
      reason: '',
    }
  });

  const pendingReportItemIds = useMemo(() => {
    return new Set(
        damageReports
            .filter(r => r.status === 'Pending' || r.status === 'Under Review')
            .map(r => r.itemId)
            .filter(Boolean)
    );
  }, [damageReports]);
  
  const allItems = useMemo(() => {
    const items = [
        ...inventoryItems.filter(item => item.category === 'General'),
        ...utMachines,
        ...dftMachines,
        ...digitalCameras,
        ...anemometers,
        ...otherEquipments,
    ];
    if (!user || !user.projectIds || user.role === 'Admin') {
      return items;
    }
    const userProjectIds = new Set(user.projectIds);
    return items.filter(item => item.projectId && userProjectIds.has(item.projectId));
  }, [inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, user]);


  const selectableItems = useMemo(() => {
    if (!user) return [];
    return allItems;
  }, [allItems, user]);

  const uniqueItemNames = useMemo(() => {
    const names = new Set<string>();
    selectableItems.forEach(item => {
        const name = (item as any).name || (item as any).machineName || (item as any).equipmentName || (item as any).model;
        if (name) names.add(name);
    });
    return Array.from(names).sort();
  }, [selectableItems]);

  const availableItemsOfType = useMemo(() => {
    if (!selectedItemType) return [];
    return selectableItems.filter(item => {
        const name = (item as any).name || (item as any).machineName || (item as any).equipmentName || (item as any).model;
        return name === selectedItemType;
    });
  }, [selectableItems, selectedItemType]);


  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    let finalData = { ...data };

    try {
        if (attachmentFile) {
            toast({ title: 'Uploading attachment...', description: 'Please wait.' });
            const formData = new FormData();
            formData.append("file", attachmentFile);
            
            const res = await fetch("/api/upload/dropbox", {
                method: "POST",
                body: formData,
            });

            const text = await res.text();
            let uploadData;
            try {
                uploadData = JSON.parse(text);
            } catch {
                throw new Error("Upload API returned invalid response. Check the console for more details.");
            }

            if (!res.ok || !uploadData.success) {
                throw new Error(uploadData.error || 'File upload failed.');
            }
            
            finalData.attachmentOriginalUrl = uploadData.downloadLink;
        }

      const result = await addDamageReport(finalData);
      if (result.success) {
        toast({ title: 'Damage Report Submitted', description: 'Your report has been successfully submitted.' });
        form.reset();
        setSelectedItemType(null);
        setAttachmentFile(null);
        setIsOpen(false);
      } else {
        throw new Error(result.error || 'An unknown error occurred during submission.');
      }
    } catch (error: any) {
      console.error('Damage report submission failed:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'Something went wrong. Please check your inputs and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAttachmentFile(file);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
        form.reset();
        setSelectedItemType(null);
        setAttachmentFile(null);
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
                          <ScrollArea className="h-48">
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
                          </ScrollArea>
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
                             <ScrollArea className="h-48">
                                <CommandList>
                                <CommandEmpty>No item found.</CommandEmpty>
                                <CommandGroup>
                                    {availableItemsOfType.map(item => {
                                        const isPending = pendingReportItemIds.has(item.id);
                                        return (
                                          <CommandItem 
                                            key={item.id} 
                                            value={`${item.serialNumber} ${item.ariesId}`} 
                                            onSelect={() => {
                                                if (isPending) return;
                                                form.setValue('itemId', item.id);
                                                form.setValue('otherItemName', '');
                                                setIsItemPopoverOpen(false);
                                            }}
                                            disabled={isPending}
                                            className={isPending ? "text-muted-foreground opacity-50 cursor-not-allowed" : ""}
                                          >
                                            {item.serialNumber} (ID: {item.ariesId || 'N/A'})
                                            {isPending && <span className="ml-auto text-xs">(Report pending)</span>}
                                          </CommandItem>
                                        )
                                    })}
                                </CommandGroup>
                                </CommandList>
                            </ScrollArea>
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
                {attachmentFile ? (
                  <div className="flex items-center justify-between p-2 rounded-md border text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="h-4 w-4"/>
                      <span className="truncate">{attachmentFile.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachmentFile(null)}>
                      <X className="h-4 w-4"/>
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Button asChild variant="outline" size="sm">
                      <Label htmlFor="damage-report-file-upload"><Upload className="mr-2 h-4 w-4"/> {isSubmitting ? 'Uploading...' : 'Upload File'}</Label>
                    </Button>
                    <Input id="damage-report-file-upload" type="file" onChange={handleFileChange} className="hidden" disabled={isSubmitting} accept=".pdf,.doc,.docx,.jpg,.png" />
                  </div>
                )}
                 {form.formState.errors.attachmentOriginalUrl && <p className="text-xs text-destructive">{form.formState.errors.attachmentOriginalUrl.message}</p>}
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
