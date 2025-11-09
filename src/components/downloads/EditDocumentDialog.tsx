
'use client';

import { useEffect } from 'react';
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
import type { DownloadableDocument } from '@/lib/types';
import { Paperclip } from 'lucide-react';
import Link from 'next/link';

const documentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  documentType: z.string().optional(),
});

type FormValues = z.infer<typeof documentSchema>;

interface EditDocumentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  document: DownloadableDocument;
}

export default function EditDocumentDialog({ isOpen, setIsOpen, document: doc }: EditDocumentDialogProps) {
  const { updateDocument } = useAppContext();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(documentSchema),
  });
  
  useEffect(() => {
    if(doc && isOpen) {
        form.reset({
            title: doc.title,
            description: doc.description,
            category: doc.category,
            documentType: doc.documentType,
        });
    }
  }, [doc, isOpen, form]);

  const onSubmit = (data: FormValues) => {
    updateDocument({ ...doc, ...data });
    toast({ title: 'Document Updated', description: 'The document details have been updated.' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Document Details</DialogTitle>
          <DialogDescription>Modify the information for this document.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="p-2 border rounded-md bg-muted text-sm">
            <p className="font-semibold flex items-center gap-2"><Paperclip className="h-4 w-4"/>Current File</p>
            <Link href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{doc.fileName}</Link>
            <p className="text-xs text-muted-foreground">Note: To replace the file, please delete this entry and upload a new one.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register('title')} />
            {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" {...form.register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Input id="category" {...form.register('category')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type (Optional)</Label>
              <Input id="documentType" {...form.register('documentType')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
