
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

const documentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  documentType: z.string().optional(),
  url: z.string().url({ message: 'Please enter a valid URL.' }),
});

type FormValues = z.infer<typeof documentSchema>;

interface AddDocumentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddDocumentDialog({ isOpen, setIsOpen }: AddDocumentDialogProps) {
  const { addDocument } = useAppContext();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(documentSchema),
  });

  const onSubmit = (data: FormValues) => {
    addDocument(data);
    toast({ title: 'Document Added', description: `${data.title} has been successfully added.` });
    setIsOpen(false);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add New Document</DialogTitle>
          <DialogDescription>Provide the document details and a link to the file.</DialogDescription>
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
           <div className="space-y-2">
            <Label htmlFor="url">Document URL</Label>
            <Input id="url" {...form.register('url')} placeholder="https://..." />
            {form.formState.errors.url && <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>}
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Document</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
