
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { uploadFile } from '@/lib/storage';
import { Upload } from 'lucide-react';

const documentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  documentType: z.string().optional(),
});

type FormValues = z.infer<typeof documentSchema>;

interface AddDocumentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddDocumentDialog({ isOpen, setIsOpen }: AddDocumentDialogProps) {
  const { addDocument } = useAppContext();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(documentSchema),
  });

  const onSubmit = async (data: FormValues) => {
    if (!file) {
      toast({ variant: 'destructive', title: 'File required', description: 'Please select a file to upload.' });
      return;
    }
    
    setIsUploading(true);
    try {
      const url = await uploadFile(file, `downloads/${file.name}`);
      addDocument({
        ...data,
        url,
        fileName: file.name,
        fileType: file.type,
      });
      toast({ title: 'Document Added', description: `${data.title} has been successfully added.` });
      setIsOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the file.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setFile(null);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Document</DialogTitle>
          <DialogDescription>Upload a file and provide its details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register('title')} placeholder="e.g., Safety Manual" />
            {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" {...form.register('description')} placeholder="A brief description of the document" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Input id="category" {...form.register('category')} placeholder="e.g., HR, Safety" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type (Optional)</Label>
              <Input id="documentType" {...form.register('documentType')} placeholder="e.g., Form, Manual, Policy" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>File</Label>
            {file ? (
                <div className="flex items-center justify-between p-2 border rounded-md text-sm">
                    <span>{file.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>Remove</Button>
                </div>
            ) : (
                 <Input id="file-upload" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Add Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
