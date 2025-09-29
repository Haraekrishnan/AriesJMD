
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '../ui/textarea';
import { useState } from 'react';
import { Checkbox } from '../ui/checkbox';


const broadcastSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters long.'),
  sendEmail: z.boolean().optional(),
});

type FormValues = z.infer<typeof broadcastSchema>;

interface NewBroadcastDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export default function NewBroadcastDialog({ isOpen, setIsOpen }: NewBroadcastDialogProps) {
  const { addBroadcast } = useAppContext();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { message: '', sendEmail: true }
  });

  const onSubmit = (data: FormValues) => {
    addBroadcast(data.message, data.sendEmail || false);
    toast({
      title: 'Broadcast Sent',
      description: 'Your message has been broadcasted to all relevant users.',
    });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Broadcast Message</DialogTitle>
          <DialogDescription>Send a scrolling message to all users' dashboards. Use for urgent but short notices.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div>
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" {...form.register('message')} placeholder="Your broadcast message..." rows={4}/>
                {form.formState.errors.message && <p className="text-xs text-destructive">{form.formState.errors.message.message}</p>}
            </div>

            <div className="flex items-center space-x-2">
                <Controller
                    control={form.control}
                    name="sendEmail"
                    render={({ field }) => (
                       <Checkbox
                          id="sendEmail"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                    )}
                />
                <Label htmlFor="sendEmail" className="text-sm font-normal">
                    Also send this broadcast as an email (respects hierarchy)
                </Label>
            </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Send Broadcast</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
