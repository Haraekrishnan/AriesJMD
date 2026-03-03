
'use client';
import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ChevronsUpDown, Paperclip, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePickerInput } from '../ui/date-picker-input';
import { Input } from '../ui/input';

const memoSchema = z.object({
  manpowerId: z.string().min(1, 'Please select an employee.'),
  type: z.enum(['Memo', 'Warning Letter']),
  date: z.date().optional(),
  reason: z.string().min(10, 'A detailed reason is required.'),
  issuedBy: z.string().min(1, 'Issuer name is required.'),
  attachmentUrl: z.string().optional(),
});

type MemoFormValues = z.infer<typeof memoSchema>;

interface IssueMemoDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function IssueMemoDialog({ isOpen, setIsOpen }: IssueMemoDialogProps) {
  const { manpowerProfiles, addMemoOrWarning, projects } = useAppContext();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isManpowerPopoverOpen, setIsManpowerPopoverOpen] = useState(false);

  const form = useForm<MemoFormValues>({
    resolver: zodResolver(memoSchema),
    defaultValues: { type: 'Memo', date: new Date() },
  });
  
  const selectedManpowerId = form.watch('manpowerId');

  const onSubmit = (data: MemoFormValues) => {
    addMemoOrWarning(data.manpowerId, {
      type: data.type,
      date: data.date ? data.date.toISOString() : new Date().toISOString(),
      reason: data.reason,
      issuedBy: data.issuedBy,
      attachmentUrl: data.attachmentUrl,
    });
    const profile = manpowerProfiles.find(p => p.id === data.manpowerId);
    toast({ title: `${data.type} Issued`, description: `A ${data.type.toLowerCase()} has been issued to ${profile?.name}.` });
    setIsOpen(false);
  };
  
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
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ type: 'Memo', date: new Date() });
    }
    setIsOpen(open);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Issue Memo / Warning Letter</DialogTitle>
          <DialogDescription>Select an employee and provide details for the record.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Controller
              name="manpowerId"
              control={form.control}
              render={({ field }) => (
                <Popover open={isManpowerPopoverOpen} onOpenChange={setIsManpowerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {selectedManpowerId ? manpowerProfiles.find(p => p.id === selectedManpowerId)?.name : "Select employee..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search employee..." />
                      <CommandList>
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          {manpowerProfiles.map(p => {
                            const project = projects.find(proj => proj.id === p.projectId);
                            const projectText = project ? `, ${project.name}` : '';
                            return (
                                <CommandItem
                                key={p.id}
                                value={p.name}
                                onSelect={() => {
                                    form.setValue("manpowerId", p.id);
                                    setIsManpowerPopoverOpen(false);
                                }}
                                >
                                <div className="flex justify-between items-center w-full">
                                    <span>{p.name}</span>
                                    <span className="text-muted-foreground text-xs">({p.trade}{projectText})</span>
                                </div>
                                </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
            {form.formState.errors.manpowerId && <p className="text-xs text-destructive">{form.formState.errors.manpowerId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Memo">Memo</SelectItem>
                      <SelectItem value="Warning Letter">Warning Letter</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Date Issued</Label>
              <Controller
                name="date"
                control={form.control}
                render={({ field }) => (
                  <DatePickerInput value={field.value} onChange={field.onChange} />
                )}
              />
               {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="issuedBy">Issued By</Label>
            <Input id="issuedBy" {...form.register('issuedBy')} />
            {form.formState.errors.issuedBy && <p className="text-xs text-destructive">{form.formState.errors.issuedBy.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Reason / Details</Label>
            <Textarea {...form.register('reason')} rows={5} />
            {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Attachment (Optional)</Label>
            {form.watch('attachmentUrl') ? (
              <div className="flex items-center justify-between p-2 rounded-md border text-sm">
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="h-4 w-4" />
                  <span className="truncate">File Attached</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => form.setValue('attachmentUrl', '')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Button asChild variant="outline" size="sm">
                  <Label htmlFor="memo-file-upload"><Upload className="mr-2 h-4 w-4" /> {isUploading ? 'Uploading...' : 'Upload File'}</Label>
                </Button>
                <Input id="memo-file-upload" type="file" onChange={handleFileChange} className="hidden" disabled={isUploading} accept=".jpg, .jpeg, .png, .pdf" />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isUploading}>Issue Record</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
