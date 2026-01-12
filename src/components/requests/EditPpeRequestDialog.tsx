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
import { ChevronsUpDown, Paperclip, Upload, X, AlertCircle } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { useEffect, useState } from 'react';
import type { PpeRequest } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';


const coverallSizeOptions = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];
const shoeSizeOptions = Array.from({ length: 8 }, (_, i) => (i + 6).toString());

const ppeRequestSchema = z.object({
  manpowerId: z.string().min(1, 'Please select a person'),
  ppeType: z.enum(['Coverall', 'Safety Shoes'], { required_error: "PPE Type is required." }),
  size: z.string().min(1, 'Size is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
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
  const [isManpowerPopoverOpen, setIsManpowerPopoverOpen] = useState(false);
  const [isReasonDialogOpen, setIsReasonDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [formData, setFormData] = useState<PpeRequestFormValues | null>(null);

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
        }
    } catch (error) {
        setIsUploading(false);
        toast({ variant: 'destructive', title: 'Upload Error', description: 'An error occurred during upload.' });
    }
  };
  
  const handleSaveChanges = (data: PpeRequestFormValues) => {
    const hasChanged = data.size !== request.size || data.quantity !== request.quantity;
    if (hasChanged) {
        setFormData(data);
        setIsReasonDialogOpen(true);
    } else {
        submitUpdate(data);
    }
  };

  const submitUpdate = (data: PpeRequestFormValues, changeReason?: string) => {
    updatePpeRequest({ ...request, ...data }, changeReason);
    toast({
      title: 'PPE Request Updated',
    });
    setIsOpen(false);
  };

  const handleConfirmReason = () => {
    if (!reason.trim()) {
        toast({ title: 'Reason is required', variant: 'destructive'});
        return;
    }
    if (formData) {
        submitUpdate(formData, reason);
    }
    setIsReasonDialogOpen(false);
    setReason('');
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit PPE Request</DialogTitle>
          <DialogDescription>Update the details for this PPE request.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">
            <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-4 px-1">
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
                     {ppeType === 'Coverall' ? (
                         <Controller name="size" control={form.control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select size..."/></SelectTrigger>
                                <SelectContent>
                                    {coverallSizeOptions.map(size => <SelectItem key={size} value={size}>{size}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}/>
                    ) : ppeType === 'Safety Shoes' ? (
                        <Controller name="size" control={form.control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select Indian size..."/></SelectTrigger>
                                <SelectContent>
                                    {shoeSizeOptions.map(size => <SelectItem key={size} value={size}>{size}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}/>
                    ) : (
                        <Input {...form.register('size')} placeholder="e.g., 42" />
                    )}
                    {form.formState.errors.size && <p className="text-xs text-destructive">{form.formState.errors.size.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" {...form.register('quantity')} />
                 {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
              </div>
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
                    {form.getValues('attachmentUrl') ? (
                       <div className="flex items-center justify-between p-2 rounded-md border text-sm">
                          <a href={form.getValues('attachmentUrl')!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate hover:underline">
                            <Paperclip className="h-4 w-4"/>
                            <span className="truncate">Attached Image</span>
                          </a>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => form.setValue('attachmentUrl', undefined)}>
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
                <DialogFooter className="pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isUploading}>Save Changes</Button>
              </DialogFooter>
            </form>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={isReasonDialogOpen} onOpenChange={setIsReasonDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Reason for Change</AlertDialogTitle>
                <AlertDialogDescription>Please provide a reason for modifying the quantity or size of this request. This will be logged.</AlertDialogDescription>
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
