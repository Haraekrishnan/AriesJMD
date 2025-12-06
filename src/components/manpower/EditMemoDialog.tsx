
'use client';
import { useEffect, useState, useRef, MouseEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePickerInput } from '../ui/date-picker-input';
import { Input } from '../ui/input';
import type { MemoRecord, ManpowerProfile } from '@/lib/types';
import { Paperclip, Upload, X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseISO } from 'date-fns';

const memoSchema = z.object({
  type: z.enum(['Memo', 'Warning Letter']),
  date: z.date({ required_error: 'Please select a date.' }),
  reason: z.string().min(10, 'A detailed reason is required.'),
  issuedBy: z.string().min(1, 'Issuer name is required.'),
  attachmentUrl: z.string().optional(),
});

type MemoFormValues = z.infer<typeof memoSchema>;

interface EditMemoDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  memo: MemoRecord;
  profile: ManpowerProfile;
}

export default function EditMemoDialog({ isOpen, setIsOpen, memo, profile }: EditMemoDialogProps) {
  const { user, updateMemoRecord } = useAppContext();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [viewingAttachmentUrl, setViewingAttachmentUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'Admin';

  const form = useForm<MemoFormValues>({
    resolver: zodResolver(memoSchema),
  });
  
  useEffect(() => {
    if (memo && isOpen) {
      form.reset({
        type: memo.type,
        date: parseISO(memo.date),
        reason: memo.reason,
        issuedBy: memo.issuedBy,
        attachmentUrl: memo.attachmentUrl,
      });
    }
  }, [memo, isOpen, form]);
  
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

  const onSubmit = (data: MemoFormValues) => {
    updateMemoRecord(profile.id, {
      ...memo,
      ...data,
      date: data.date.toISOString(),
    });
    toast({ title: `${data.type} Updated`, description: `The record has been updated.` });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };
  
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setIsPanning(true);
      setStartPosition({
          x: e.clientX - translate.x,
          y: e.clientY - translate.y,
      });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
      if (!isPanning || !imageContainerRef.current) return;
      e.preventDefault();
      const x = e.clientX - startPosition.x;
      const y = e.clientY - startPosition.y;
      setTranslate({ x, y });
  };
  
  const handleMouseUpOrLeave = () => {
      setIsPanning(false);
  };

  const isPdf = viewingAttachmentUrl && viewingAttachmentUrl.toLowerCase().endsWith('.pdf');

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Memo / Warning Letter</DialogTitle>
          <DialogDescription>Update the details for this record for {profile.name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                  <DatePickerInput value={field.value} onChange={field.onChange} disabled={!isAdmin} />
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
                <button type="button" onClick={() => setViewingAttachmentUrl(form.watch('attachmentUrl')!)} className="flex items-center gap-2 truncate hover:underline">
                  <Paperclip className="h-4 w-4" />
                  <span className="truncate">File Attached</span>
                </button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => form.setValue('attachmentUrl', '')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Button asChild variant="outline" size="sm">
                  <Label htmlFor="edit-memo-file-upload"><Upload className="mr-2 h-4 w-4" /> {isUploading ? 'Uploading...' : 'Upload File'}</Label>
                </Button>
                <Input id="edit-memo-file-upload" type="file" onChange={handleFileChange} className="hidden" disabled={isUploading} accept=".jpg, .jpeg, .png, .pdf" />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isUploading}>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => { setViewingAttachmentUrl(null); setZoom(1); setTranslate({x: 0, y: 0}); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Attachment Viewer</DialogTitle>
                 <div className="flex items-center gap-2">
                    {!isPdf && (
                        <>
                            <Button variant="outline" size="icon" onClick={() => setZoom(z => z + 0.2)}><ZoomIn className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut className="h-4 w-4" /></Button>
                        </>
                    )}
                    <a href={viewingAttachmentUrl || ''} download target="_blank" rel="noopener noreferrer">
                        <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Download</Button>
                    </a>
                </div>
            </DialogHeader>
            <div 
              ref={imageContainerRef}
              className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/50 rounded-md"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
            >
                {viewingAttachmentUrl && (
                    isPdf ? (
                        <object data={viewingAttachmentUrl} type="application/pdf" width="100%" height="100%">
                            <p>It appears you don't have a PDF plugin for this browser. You can <a href={viewingAttachmentUrl} className="text-blue-600 hover:underline">click here to download the PDF file.</a></p>
                        </object>
                    ) : (
                        <img 
                            src={viewingAttachmentUrl} 
                            alt="Attachment" 
                            className={cn("transition-transform duration-200", isPanning ? 'cursor-grabbing' : 'cursor-grab')}
                            style={{
                                transform: `scale(${zoom}) translate(${translate.x}px, ${translate.y}px)`,
                                maxWidth: zoom > 1 ? 'none' : '100%',
                                maxHeight: zoom > 1 ? 'none' : '100%',
                                objectFit: 'contain'
                            }}
                        />
                    )
                )}
            </div>
        </DialogContent>
    </Dialog>
    </>
  );
}
