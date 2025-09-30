'use client';
import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TransferList } from '../ui/transfer-list';
import type { Role } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

const broadcastSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  emailTarget: z.enum(['none', 'roles', 'individuals']),
  recipientRoles: z.array(z.string()).optional(),
  recipientUserIds: z.array(z.string()).optional(),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

interface NewBroadcastDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function NewBroadcastDialog({ isOpen, setIsOpen }: NewBroadcastDialogProps) {
  const { user, addBroadcast, roles, users } = useAppContext();
  const { toast } = useToast();

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      message: '',
      emailTarget: 'none',
      recipientRoles: [],
      recipientUserIds: [],
    },
  });

  const onSubmit = (data: BroadcastFormValues) => {
    addBroadcast(data.message, data.emailTarget, data.recipientRoles, data.recipientUserIds);
    toast({
      title: 'Broadcast Sent',
      description: 'Your message has been broadcast.',
    });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({
        message: '',
        emailTarget: 'none',
        recipientRoles: [],
        recipientUserIds: [],
      });
    }
    setIsOpen(open);
  }

  const watchEmailTarget = form.watch('emailTarget');

  const roleOptions = useMemo(() => {
    return roles.map(r => ({ value: r.name, label: r.name }));
  }, [roles]);
  
  const userOptions = useMemo(() => {
      return users.map(u => ({ value: u.id, label: `${u.name} (${u.role})` }));
  }, [users]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New Broadcast</DialogTitle>
          <DialogDescription>Send a scrolling message to all users' dashboards and optionally send an email.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-1">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4 py-2">
              <div>
                  <Label htmlFor="message">Broadcast Message</Label>
                  <Textarea id="message" {...form.register('message')} placeholder="Enter your message..." rows={4}/>
                  {form.formState.errors.message && <p className="text-xs text-destructive">{form.formState.errors.message.message}</p>}
              </div>

              <div>
                  <Label>Email Notification (Optional)</Label>
                   <Controller
                      control={form.control}
                      name="emailTarget"
                      render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="none">Don't send email</SelectItem>
                                  <SelectItem value="roles">Send to specific roles</SelectItem>
                                  <SelectItem value="individuals">Send to specific individuals</SelectItem>
                              </SelectContent>
                          </Select>
                      )}
                  />
              </div>

              {watchEmailTarget === 'roles' && (
                <div>
                  <Label>Select Roles</Label>
                   <Controller
                      control={form.control}
                      name="recipientRoles"
                      render={({ field }) => (
                         <TransferList
                            options={roleOptions}
                            selected={field.value || []}
                            onChange={field.onChange}
                            availableTitle="Available Roles"
                            selectedTitle="Selected Roles"
                        />
                      )}
                  />
                </div>
              )}

              {watchEmailTarget === 'individuals' && (
                <div>
                  <Label>Select Individuals</Label>
                   <Controller
                      control={form.control}
                      name="recipientUserIds"
                      render={({ field }) => (
                         <TransferList
                            options={userOptions}
                            selected={field.value || []}
                            onChange={field.onChange}
                            availableTitle="Available Users"
                            selectedTitle="Selected Users"
                        />
                      )}
                  />
                </div>
              )}
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit">Send Broadcast</Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
