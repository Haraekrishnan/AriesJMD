
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
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, Upload, Paperclip, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ScrollArea } from '../ui/scroll-area';

const damageReportSchema = z.object({
  itemId: z.string().optional(),
  otherItemName: z.string().optional(),
  reason: z.string().min(10, 'A detailed reason is required.'),
  attachmentUrl: z.string().optional(),
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
  const { user, inventoryItems, utMachines, dftMachines, addDamageReport } = useAppContext();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(damageReportSchema),
  });
  
  const allItems = useMemo(() => [
    ...inventoryItems,
    ...utMachines,
    ...dftMachines,
  ], [inventoryItems, utMachines, dftMachines]);

  const selectableItems = useMemo(() => {
    if (!user?.projectIds) return [];
    const userProjectIds = new Set(user.projectIds);
    return allItems.filter(item => userProjectIds.has(item.projectId));
  }, [allItems, user]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return selectableItems;
    const lowercasedQuery = searchQuery.toLowerCase();
    return selectableItems.filter(item => 
        (item.name || (item as any).machineName).toLowerCase().includes(lowercasedQuery) ||
        item.serialNumber?.toLowerCase().includes(lowercasedQuery) ||
        item.ariesId?.toLowerCase().includes(lowercasedQuery)
    );
  }, [selectableItems, searchQuery]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast({ title: 'Uploading...', description: 'Please wait while the file is uploaded.' });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "my_unsigned_upload"); 

    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/dmgyflpz8/upload", {
            method: "POST",
            body: formData,
        });
        const data = await res.json();
        setIsUploading(false);

        if (data.secure_url) {
            form.setValue('attachmentUrl', data.secure_url);
            toast({ title: 'Upload Successful', description: 'File has been attached.' });
        } else {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload file.' });
        }
    } catch (error) {
        setIsUploading(false);
        toast({ variant: 'destructive', title: 'Upload Error', description: 'An error occurred during upload.' });
    }
  };

  const onSubmit = (data: FormValues) => {
    addDamageReport(data);
    toast({ title: 'Damage Report Submitted', description: 'Your report has been sent for review.' });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset();
    setIsOpen(open);
  };
  
  const selectedItemId = form.watch('itemId');
  const selectedItemName = useMemo(() => {
    if (!selectedItemId) return "Select an item...";
    if (selectedItemId === 'other') return 'Other (Specify below)';
    const item = allItems.find(i => i.id === selectedItemId);
    const name = item?.name || (item as any)?.machineName;
    return item ? `${name} (SN: ${item.serialNumber})` : "Select an item...";
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
                <Label>Inventory Item</Label>
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
                          <CommandInput placeholder="Search by name, serial no..." value={searchQuery} onValueChange={setSearchQuery}/>
                          <CommandList>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                              {filteredItems.map(item => (
                                <CommandItem key={item.id} value={item.id} onSelect={() => { form.setValue('itemId', item.id); form.setValue('otherItemName', ''); setIsItemPopoverOpen(false); }}>
                                  {(item as any).name || (item as any).machineName} (SN: {item.serialNumber})
                                </CommandItem>
                              ))}
                              <CommandItem onSelect={() => { form.setValue('itemId', 'other'); setIsItemPopoverOpen(false); }}>Other (Specify below)</CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {form.formState.errors.itemId && <p className="text-xs text-destructive">{form.formState.errors.itemId.message}</p>}
              </div>

              {selectedItemId === 'other' && (
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
                <Label>Attachment (Optional)</Label>
                {form.watch('attachmentUrl') ? (
                  <div className="flex items-center justify-between p-2 rounded-md border text-sm">
                    <a href={form.getValues('attachmentUrl')!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate hover:underline">
                      <Paperclip className="h-4 w-4" />
                      <span className="truncate">File Attached</span>
                    </a>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => form.setValue('attachmentUrl', undefined)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Button asChild variant="outline" size="sm">
                      <Label htmlFor="damage-report-file"><Upload className="mr-2 h-4 w-4" /> {isUploading ? 'Uploading...' : 'Upload File'}</Label>
                    </Button>
                    <Input id="damage-report-file" type="file" onChange={handleFileChange} className="hidden" disabled={isUploading} accept=".doc, .docx, .pdf, .jpg, .jpeg, .png" />
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isUploading}>Submit Report</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
