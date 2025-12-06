
'use client';
import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TransferList } from '../ui/transfer-list';
import type { Role } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { DatePickerInput } from '../ui/date-picker-input';
import { Input } from '../ui/input';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const broadcastSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  expiryDate: z.date({ required_error: 'Expiry date is required' }),
  expiryTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Please enter a valid time in HH:mm format."),
  emailTarget: z.enum(['none', 'roles', 'individuals']),
  recipientRoles: z.array(z.string()).optional(),
  recipientUserIds: z.array(z.string()).optional(),
}).refine(data => {
    if (data.emailTarget === 'roles') return data.recipientRoles && data.recipientRoles.length > 0;
    if (data.emailTarget === 'individuals') return data.recipientUserIds && data.recipientUserIds.length > 0;
    return true;
}, { message: "Please select at least one recipient.", path: ['recipientRoles'] });


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
      expiryTime: format(new Date(), 'HH:mm'),
    },
  });

  const onSubmit = (data: BroadcastFormValues) => {
    const [hours, minutes] = data.expiryTime.split(':').map(Number);
    const expiryDateTime = new Date(data.expiryDate);
    expiryDateTime.setHours(hours, minutes);

    const recipientRoleNames = roles.filter(r => data.recipientRoles?.includes(r.id)).map(r => r.name);

    addBroadcast({
        message: data.message,
        expiryDate: expiryDateTime.toISOString(),
        emailTarget: data.emailTarget,
        recipientRoles: recipientRoleNames,
        recipientUserIds: data.recipientUserIds || [],
    });

    toast({
      title: 'Broadcast Sent',
      description: 'Your message has been broadcast to the selected users.',
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
        expiryTime: format(new Date(), 'HH:mm'),
      });
    }
    setIsOpen(open);
  }

  const watchEmailTarget = form.watch('emailTarget');

  const roleOptions = useMemo(() => {
    return roles.map(r => ({ value: r.id, label: r.name }));
  }, [roles]);
  
  const userOptions = useMemo(() => {
      return users.map(u => ({ value: u.id, label: `${u.name} (${u.role})` }));
  }, [users]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New Broadcast</DialogTitle>
          <DialogDescription>Send a scrolling message and an email to selected users.</DialogDescription>
        </DialogHeader>
        <TooltipProvider>
        <ScrollArea className="max-h-[70vh] p-1">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4 py-2">
              <div>
                  <Label htmlFor="message">Broadcast Message</Label>
                  <Textarea id="message" {...form.register('message')} placeholder="Enter your message..." rows={4}/>
                  {form.formState.errors.message && <p className="text-xs text-destructive">{form.formState.errors.message.message}</p>}
              </div>

             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Controller control={form.control} name="expiryDate" render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                     {form.formState.errors.expiryDate && <p className="text-xs text-destructive">{form.formState.errors.expiryDate.message}</p>}
                 </div>
                 <div className="space-y-2">
                    <Label>Expiry Time</Label>
                    <Input type="time" {...form.register('expiryTime')} />
                    {form.formState.errors.expiryTime && <p className="text-xs text-destructive">{form.formState.errors.expiryTime.message}</p>}
                 </div>
             </div>

              <div>
                  <Label>Email Notification Recipients</Label>
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
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
