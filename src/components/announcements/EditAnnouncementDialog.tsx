'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import type { Announcement } from '@/lib/types';


const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

type FormValues = z.infer<typeof announcementSchema>;

interface EditAnnouncementDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  announcement: Announcement;
}

export default function EditAnnouncementDialog({ isOpen, setIsOpen, announcement }: EditAnnouncementDialogProps) {
  const { updateAnnouncement, approveAnnouncement } = useAppContext();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(announcementSchema),
  });
  
  useEffect(() => {
    if (announcement) {
        form.reset({
            title: announcement.title,
            content: announcement.content,
        });
    }
  }, [announcement, form]);

  const onSubmit = (data: FormValues) => {
    updateAnnouncement({ ...announcement, ...data });
    approveAnnouncement(announcement.id);
    toast({
      title: 'Announcement Updated & Published'
    });
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Announcement</DialogTitle>
          <DialogDescription>Make changes and approve the announcement for publishing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...form.register('title')} />
                {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
            </div>
            
            <div>
                <Label htmlFor="content">Content</Label>
                <Textarea id="content" {...form.register('content')} rows={8}/>
                {form.formState.errors.content && <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>}
            </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Update & Publish</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
