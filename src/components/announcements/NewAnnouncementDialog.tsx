

'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '../ui/textarea';
import { Megaphone } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Checkbox } from '../ui/checkbox';


const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  notifyAll: z.boolean().optional(),
});

type FormValues = z.infer<typeof announcementSchema>;

export default function NewAnnouncementDialog() {
  const { user, roles, addAnnouncement } = useAppContext();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', content: '', notifyAll: false }
  });

  const onSubmit = (data: FormValues) => {
    addAnnouncement(data);
    toast({
      title: 'Announcement Submitted',
      description: 'Your announcement has been sent to your supervisor for approval.',
    });
    setIsOpen(false);
    form.reset();
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  }
  
  const canCreateAnnouncement = useMemo(() => {
    if (!user) return false;
    const userRole = roles.find(r => r.name === user.role);
    return userRole?.permissions.includes('manage_announcements');
  }, [user, roles]);

  if (!canCreateAnnouncement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon"><Megaphone /></Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Make an Announcement</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Announcement</DialogTitle>
          <DialogDescription>Create an announcement. It will be sent for approval before being published.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...form.register('title')} placeholder="e.g., Office Holiday Notice" />
                {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
            </div>
            
            <div>
                <Label htmlFor="content">Content</Label>
                <Textarea id="content" {...form.register('content')} placeholder="Write your announcement here..." rows={8}/>
                {form.formState.errors.content && <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>}
            </div>
            
            <div className="flex items-center space-x-2">
                <Controller
                    control={form.control}
                    name="notifyAll"
                    render={({ field }) => (
                       <Checkbox
                          id="notifyAll"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                    )}
                />
                <Label htmlFor="notifyAll" className="text-sm font-normal">
                    Send email notification to all users (except Managers)
                </Label>
            </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Submit for Approval</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
