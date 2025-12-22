
'use client';
import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import type { Role, ManagementRequest } from '@/lib/types';
import { format, parseISO } from 'date-fns';

const forwardSchema = z.object({
  toUserId: z.string().min(1, 'Please select a recipient'),
  ccUserIds: z.array(z.string()).optional(),
  body: z.string().optional(),
});

type ForwardFormValues = z.infer<typeof forwardSchema>;

interface ForwardManagementRequestDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  originalRequest: ManagementRequest;
}

const SUPERVISORY_ROLES: Role[] = ['Admin', 'Project Coordinator', 'Supervisor', 'Senior Safety Supervisor', 'HSE', 'Store in Charge'];

export default function ForwardManagementRequestDialog({ isOpen, setIsOpen, originalRequest }: ForwardManagementRequestDialogProps) {
  const { user, users, forwardManagementRequest } = useAppContext();
  const { toast } = useToast();
  const [isCcPopoverOpen, setIsCcPopoverOpen] = useState(false);

  const form = useForm<ForwardFormValues>({
    resolver: zodResolver(forwardSchema),
    defaultValues: { toUserId: '', ccUserIds: [], body: '' },
  });

  const toUserId = form.watch('toUserId');

  const possibleRecipients = useMemo(() => {
    if (!user) return [];
    return users.filter(u => u.id !== user.id && SUPERVISORY_ROLES.includes(u.role));
  }, [users, user]);

  const ccRecipients = useMemo(() => {
    if (!user) return [];
    return users.filter(u => u.id !== user.id && u.id !== toUserId && SUPERVISORY_ROLES.includes(u.role));
  }, [users, user, toUserId]);

  const onSubmit = (data: ForwardFormValues) => {
    forwardManagementRequest(originalRequest, data);
    toast({
      title: 'Request Forwarded',
      description: 'The request has been forwarded to the new recipients.',
    });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  const selectedCcUserIds = form.watch('ccUserIds') || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Forward Request</DialogTitle>
          <DialogDescription>Forward this request to a new set of recipients.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 pr-6 -mr-6">
            <div className="space-y-4 p-1">
              <div className="space-y-2">
                <Label>To</Label>
                <Controller
                  control={form.control}
                  name="toUserId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select a recipient" /></SelectTrigger>
                      <SelectContent>
                        {possibleRecipients.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.toUserId && <p className="text-xs text-destructive">{form.formState.errors.toUserId.message}</p>}
              </div>
              
              <div className="space-y-2">
                  <Label>Cc (Optional)</Label>
                  <Popover open={isCcPopoverOpen} onOpenChange={setIsCcPopoverOpen}>
                      <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-10">
                              <div className="flex flex-wrap gap-1">
                                  {selectedCcUserIds.length > 0 ? selectedCcUserIds.map(id => (
                                      <Badge key={id} variant="secondary">{ccRecipients.find(p=>p.id === id)?.name}</Badge>
                                  )) : <span className="text-muted-foreground">Select users to CC...</span>}
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                              <CommandInput placeholder="Search users..." />
                              <CommandList>
                                  <CommandEmpty>No users available.</CommandEmpty>
                                  <CommandGroup>
                                      {ccRecipients.map(u => (
                                          <CommandItem
                                              key={u.id}
                                              value={u.name}
                                              onSelect={() => {
                                                  const newSelection = [...selectedCcUserIds];
                                                  const index = newSelection.indexOf(u.id);
                                                  if (index > -1) {
                                                      newSelection.splice(index, 1);
                                                  } else {
                                                      newSelection.push(u.id);
                                                  }
                                                  form.setValue('ccUserIds', newSelection);
                                              }}
                                          >
                                              <Check className={`mr-2 h-4 w-4 ${selectedCcUserIds.includes(u.id) ? 'opacity-100' : 'opacity-0'}`} />
                                              {u.name} ({u.role})
                                          </CommandItem>
                                      ))}
                                  </CommandGroup>
                              </CommandList>
                          </Command>
                      </PopoverContent>
                  </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Your Message (Optional)</Label>
                <Textarea id="body" {...form.register('body')} rows={4} placeholder="Add a comment for the recipient..." />
              </div>

              <div className="space-y-2 text-sm p-4 border rounded-md bg-muted/50">
                  <p className="font-semibold">Fwd: {originalRequest.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    From: {users.find(u => u.id === originalRequest.creatorId)?.name || 'Unknown'} on {format(parseISO(originalRequest.lastUpdated), 'PPP p')}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{originalRequest.body}</p>
              </div>

            </div>
          </ScrollArea>
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Send Forward</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    