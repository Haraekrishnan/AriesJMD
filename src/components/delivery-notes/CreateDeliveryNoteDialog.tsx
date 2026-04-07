'use client';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { DatePickerInput } from '../ui/date-picker-input';
import { useState, useMemo } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { ScrollArea } from '../ui/scroll-area';
import { PlusCircle, Trash2, Upload, Paperclip, X } from 'lucide-react';

const deliveryNoteSchema = z.object({
  type: z.enum(['Inward', 'Outward']),
  deliveryDate: z.date({ required_error: 'Delivery date is required' }),
  deliveryNoteNumber: z.string().min(1, 'Delivery note number is required'),
  ariesRefNo: z.string().optional(),
  fromAddress: z.string().min(1, 'From address is required'),
  toAddress: z.string().min(1, 'To address is required'),
  serviceType: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    description: z.string().min(1, 'Item description is required'),
    quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
    remarks: z.string().optional(),
  })).optional(),
  attachmentUrl: z.string().optional(),
});

type FormValues = z.infer<typeof deliveryNoteSchema>;

interface CreateDeliveryNoteDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  type: 'Inward' | 'Outward';
}

export default function CreateDeliveryNoteDialog({ isOpen, setIsOpen, type }: CreateDeliveryNoteDialogProps) {
  const { addDeliveryNote } = useAppContext();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(deliveryNoteSchema),
    defaultValues: { type, items: type === 'Outward' ? [{ id: `item-${Date.now()}`, description: '', quantity: 1, remarks: '' }] : [] },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = async (data: FormValues) => {
    setIsUploading(true);
    let finalData: any = { ...data, attachmentUrl: data.attachmentUrl || '' };

    try {
        if (type === 'Inward' && attachmentFile) {
            toast({ title: 'Uploading attachment...', description: 'Please wait.' });
            const formData = new FormData();
            formData.append("file", attachmentFile);
            
            const res = await fetch("/api/upload/dropbox", {
                method: "POST",
                body: formData,
            });

            const uploadData = await res.json();
            
            if (!res.ok || !uploadData.success) {
                throw new Error(uploadData.error || 'File upload failed.');
            }
            finalData.attachmentUrl = uploadData.downloadLink;
        }

        addDeliveryNote({
            ...finalData,
            deliveryDate: data.deliveryDate.toISOString(),
        });
        toast({ title: 'Delivery Note Created' });
        setIsOpen(false);
    } catch (error: any) {
        console.error("Submission failed:", error);
        toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: error.message || 'Something went wrong.',
        });
    } finally {
        setIsUploading(false);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAttachmentFile(file);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if(!open) {
      form.reset();
      setAttachmentFile(null);
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create {type} Delivery Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-y-hidden">
           <ScrollArea className="flex-1 -mr-6 pr-6">
             <div className="space-y-4 py-4 pr-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Delivery Date</Label><Controller name="deliveryDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />{form.formState.errors.deliveryDate && <p className="text-xs text-destructive">{form.formState.errors.deliveryDate.message}</p>}</div>
                    <div className="space-y-2"><Label>Delivery Note Number</Label><Input {...form.register('deliveryNoteNumber')} />{form.formState.errors.deliveryNoteNumber && <p className="text-xs text-destructive">{form.formState.errors.deliveryNoteNumber.message}</p>}</div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Aries Ref. No (Optional)</Label><Input {...form.register('ariesRefNo')} /></div>
                    <div className="space-y-2"><Label>Service Type (Optional)</Label><Input {...form.register('serviceType')} /></div>
                </div>
                 <div className="space-y-2"><Label>From Address</Label><Textarea {...form.register('fromAddress')} />{form.formState.errors.fromAddress && <p className="text-xs text-destructive">{form.formState.errors.fromAddress.message}</p>}</div>
                 <div className="space-y-2"><Label>To Address</Label><Textarea {...form.register('toAddress')} />{form.formState.errors.toAddress && <p className="text-xs text-destructive">{form.formState.errors.toAddress.message}</p>}</div>

                 {type === 'Outward' && (
                    <div className="space-y-2">
                        <Label className="font-semibold">Items</Label>
                        <div className="space-y-2">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-[3fr,1fr,2fr,auto] gap-2 items-start">
                                    <Input placeholder="Description" {...form.register(`items.${index}.description`)} />
                                    <Input placeholder="Qty" type="number" {...form.register(`items.${index}.quantity`)} />
                                    <Input placeholder="Remarks" {...form.register(`items.${index}.remarks`)} />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `item-${Date.now()}`, description: '', quantity: 1, remarks: '' })}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button>
                    </div>
                 )}
                 {type === 'Inward' && (
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
                              <Label htmlFor="inward-delivery-note-upload"><Upload className="mr-2 h-4 w-4"/> {isUploading ? 'Uploading...' : 'Upload File'}</Label>
                            </Button>
                            <Input id="inward-delivery-note-upload" type="file" onChange={handleFileChange} className="hidden" disabled={isUploading} />
                          </div>
                        )}
                    </div>
                 )}
             </div>
           </ScrollArea>
           <DialogFooter className="mt-auto pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isUploading}>{isUploading ? 'Saving...' : 'Create Note'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
