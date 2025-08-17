
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronsUpDown, Paperclip, Upload, X } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { useEffect, useState } from 'react';
import type { PpeRequest } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

const ppeRequestSchema = z.object({
  manpowerId: z.string().min(1, 'Please select a person'),
  ppeType: z.enum(['Coverall', 'Safety Shoes']),
  size: z.string().min(1, 'Size is required'),
  quantity: z.coerce.number().optional(),
  requestType: z.enum(['New', 'Replacement']),
  remarks: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

type PpeRequestFormValues = z.infer<typeof ppeRequestSchema>;

interface EditPpeRequestDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  request: PpeRequest;
}

export default function EditPpeRequestDialog({ isOpen, setIsOpen, request }: EditPpeRequestDialogProps) {
  const { updatePpeRequest, manpowerProfiles } = useAppContext();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isManpowerPopoverOpen, setIsManpowerPopoverOpen] = useState(false);

  const form = useForm<PpeRequestFormValues>({
    resolver: zodResolver(ppeRequestSchema),
  });

  useEffect(() => {
    if (request && isOpen) {
        form.reset({
            manpowerId: request.manpowerId,
            ppeType: request.ppeType,
            size: request.size,
            quantity: request.quantity,
            requestType: request.requestType,
            remarks: request.remarks,
            attachmentUrl: request.attachmentUrl,
        });
        setAttachmentFile(null);
    }
  }, [request, isOpen, form]);

  const manpowerId = form.watch('manpowerId');
  const ppeType = form.watch('ppeType');
  const requestType = form.watch('requestType');

  useEffect(() => {
    if (manpowerId && ppeType) {
        const profile = manpowerProfiles.find(p => p.id === manpowerId);
        if (profile) {
            const size = ppeType === 'Coverall' ? profile.coverallSize : profile.shoeSize;
            form.setValue('size', size || '');
        }
    }
  }, [manpowerId, ppeType, manpowerProfiles, form]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAttachmentFile(file);
    setIsUploading(true);
    toast({ title: 'Uploading...', description: 'Please wait while the image is uploaded.' });

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
            toast({ title: 'Upload Successful', description: 'Image has been attached.' });
        } else {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload image.' });
            setAttachmentFile(null);
        }
    } catch (error) {
        setIsUploading(false);
        toast({ variant: 'destructive', title: 'Upload Error', description: 'An error occurred during upload.' });
        setAttachmentFile(null);
    }
  };

  const onSubmit = (data: PpeRequestFormValues) => {
    updatePpeRequest({ ...request, ...data });
    toast({
      title: 'PPE Request Updated',
    });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setAttachmentFile(null);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit PPE Request</DialogTitle>
          <DialogDescription>Update the details for this PPE request.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4 pr-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Controller
                  name="manpowerId"
                  control={form.control}
                  render={({ field }) => (
                    <Popover open={isManpowerPopoverOpen} onOpenChange={setIsManpowerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between" disabled>
                          {field.value ? manpowerProfiles.find(mp => mp.id === field.value)?.name : "Select person..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                    </Popover>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>PPE Type</Label>
                    <Controller name="ppeType" control={form.control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger>
                            <SelectContent><SelectItem value="Coverall">Coverall</SelectItem><SelectItem value="Safety Shoes">Safety Shoes</SelectItem></SelectContent>
                        </Select>
                    )}/>
                    {form.formState.errors.ppeType && <p className="text-xs text-destructive">{form.formState.errors.ppeType.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label>Size</Label>
                    <Input {...form.register('size')} placeholder="e.g., 42 or XL" />
                    {form.formState.errors.size && <p className="text-xs text-destructive">{form.formState.errors.size.message}</p>}
                </div>
              </div>
              {ppeType === 'Coverall' && (
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" {...form.register('quantity')} />
                </div>
              )}
               <div className="space-y-2">
                    <Label>Request Type</Label>
                    <Controller name="requestType" control={form.control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="Replacement">Replacement</SelectItem></SelectContent>
                        </Select>
                    )}/>
                </div>

              {requestType === 'Replacement' && (
                <div className="space-y-2">
                  <Label>Attach Photo of Damaged Item</Label>
                  {form.getValues('attachmentUrl') || attachmentFile ? (
                     <div className="flex items-center justify-between p-2 rounded-md border text-sm">
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="h-4 w-4"/>
                          <span className="truncate">{attachmentFile?.name || 'Attached Image'}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setAttachmentFile(null); form.setValue('attachmentUrl', undefined); }}>
                          <X className="h-4 w-4"/>
                        </Button>
                     </div>
                  ) : (
                    <div className="relative">
                      <Button asChild variant="outline" size="sm">
                        <Label htmlFor="file-upload"><Upload className="mr-2 h-4 w-4"/> {isUploading ? 'Uploading...' : 'Upload Image'}</Label>
                      </Button>
                      <Input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading}/>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea {...form.register('remarks')} rows={3} placeholder="Reason for replacement, etc."/>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isUploading}>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
