
'use client';
import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { type Role } from '@/lib/types';

const requestSchema = z.object({
  toUserId: z.string().min(1, 'Please select a recipient'),
  ccUserIds: z.array(z.string()).optional(),
  subject: z.string().min(3, 'Subject is required'),
  body: z.string().min(10, 'Body is required'),
});

type MgmtRequestFormValues = z.infer<typeof requestSchema>;

interface NewManagementRequestDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SUPERVISORY_ROLES: Role[] = ['Admin', 'Project Coordinator', 'Supervisor', 'Senior Safety Supervisor', 'HSE', 'Store in Charge', 'Document Controller'];

export default function NewManagementRequestDialog({ isOpen, setIsOpen }: NewManagementRequestDialogProps) {
  const { user, users, addManagementRequest } = useAppContext();
  const { toast } = useToast();
  const [isCcPopoverOpen, setIsCcPopoverOpen] = useState(false);

  const form = useForm<MgmtRequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { toUserId: '', ccUserIds: [], subject: '', body: '' },
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

  const onSubmit = (data: MgmtRequestFormValues) => {
    addManagementRequest(data);
    toast({
      title: 'Request Sent',
      description: 'Your request has been sent to the designated recipients.',
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
          <DialogTitle>New Management Request</DialogTitle>
          <DialogDescription>Compose and send a new internal request.</DialogDescription>
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
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" {...form.register('subject')} />
                {form.formState.errors.subject && <p className="text-xs text-destructive">{form.formState.errors.subject.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" {...form.register('body')} rows={8} />
                {form.formState.errors.body && <p className="text-xs text-destructive">{form.formState.errors.body.message}</p>}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Send Request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
