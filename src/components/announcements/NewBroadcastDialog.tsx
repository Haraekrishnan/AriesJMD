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
import { useState, useMemo } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { TransferList } from '../ui/transfer-list';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

const broadcastSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters long.'),
  emailTarget: z.enum(['none', 'roles', 'individuals']),
  recipientRoles: z.array(z.string()).optional(),
  recipientUserIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof broadcastSchema>;

interface NewBroadcastDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export default function NewBroadcastDialog({ isOpen, setIsOpen }: NewBroadcastDialogProps) {
  const { addBroadcast, roles, users } = useAppContext();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      message: '',
      emailTarget: 'none',
      recipientRoles: [],
      recipientUserIds: [],
    }
  });

  const onSubmit = (data: FormValues) => {
    addBroadcast(data.message, data.emailTarget, data.recipientRoles, data.recipientUserIds);
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

  const emailTarget = form.watch('emailTarget');
  const userOptions = useMemo(() => users.map(u => ({ value: u.id, label: `${u.name} (${u.role})`})), [users]);
  const roleOptions = useMemo(() => roles.map(r => r.name), [roles]);
  const selectedRoles = form.watch('recipientRoles') || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg h-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Broadcast Message</DialogTitle>
          <DialogDescription>Send a scrolling message to all users' dashboards and optionally send a targeted email.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 px-1">
                <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" {...form.register('message')} placeholder="Your broadcast message..." rows={4}/>
                    {form.formState.errors.message && <p className="text-xs text-destructive">{form.formState.errors.message.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label>Email Notification</Label>
                   <Controller
                    control={form.control}
                    name="emailTarget"
                    render={({ field }) => (
                       <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Don't send email</SelectItem>
                          <SelectItem value="roles">Send to specific roles</SelectItem>
                          <SelectItem value="individuals">Send to specific individuals</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {emailTarget === 'roles' && (
                  <div className="space-y-2">
                    <Label>Select Roles</Label>
                    <Controller
                      name="recipientRoles"
                      control={form.control}
                      render={({ field }) => (
                         <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" className="w-full justify-start h-auto min-h-[40px]">
                                <div className="flex flex-wrap gap-1">
                                  {selectedRoles.length > 0
                                    ? selectedRoles.map(role => <Badge key={role} variant="secondary">{role}</Badge>)
                                    : <span className="text-muted-foreground">Select roles...</span>
                                  }
                                </div>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                               <Command>
                                 <CommandInput placeholder="Search roles..." />
                                 <CommandList>
                                   <CommandEmpty>No roles found.</CommandEmpty>
                                   <CommandGroup>
                                     {roleOptions.map(option => {
                                      const isSelected = selectedRoles.includes(option);
                                      return (
                                        <CommandItem key={option} onSelect={() => {
                                          if (isSelected) {
                                            field.onChange(selectedRoles.filter(r => r !== option));
                                          } else {
                                            field.onChange([...selectedRoles, option]);
                                          }
                                        }}>
                                          <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                          {option}
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
                  </div>
                )}
                 {emailTarget === 'individuals' && (
                  <div className="space-y-2">
                    <Label>Select Individuals</Label>
                    <Controller
                      name="recipientUserIds"
                      control={form.control}
                      render={({ field }) => (
                         <TransferList
                          options={userOptions}
                          selected={field.value || []}
                          onChange={field.onChange}
                          availableTitle="Available Users"
                          selectedTitle="Selected Recipients"
                        />
                      )}
                    />
                  </div>
                 )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Send Broadcast</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
