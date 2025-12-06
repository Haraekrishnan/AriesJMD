
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const mgmtRequestSchema = z.object({
  recipientId: z.string().min(1, 'Please select a recipient'),
  subject: z.string().min(3, 'Subject is required'),
  body: z.string().min(10, 'Body is required'),
});

type MgmtRequestFormValues = z.infer<typeof mgmtRequestSchema>;

interface NewManagementRequestDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function NewManagementRequestDialog({ isOpen, setIsOpen }: NewManagementRequestDialogProps) {
  const { user, users, addManagementRequest } = useAppContext();
  const { toast } = useToast();

  const form = useForm<MgmtRequestFormValues>({
    resolver: zodResolver(mgmtRequestSchema),
    defaultValues: { recipientId: '', subject: '', body: '' },
  });

  const onSubmit = (data: MgmtRequestFormValues) => {
    addManagementRequest(data);
    toast({
      title: 'Request Sent',
      description: 'Your request has been sent to the designated recipient.',
    });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset();
    setIsOpen(open);
  };
  
  const possibleRecipients = users.filter(u => u.id !== user?.id && u.role !== 'Manager' && (u.role === 'Admin' || u.role === 'Project Coordinator' || u.role === 'Senior Safety Supervisor' || u.role === 'Supervisor' || u.role === 'HSE' || u.role === 'Document Controller'));

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Management Request</DialogTitle>
          <DialogDescription>Send a formal request to a supervisor or coordinator.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Recipient</Label>
            <Controller
              control={form.control}
              name="recipientId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select a recipient" /></SelectTrigger>
                  <SelectContent>
                    {possibleRecipients.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.recipientId && <p className="text-xs text-destructive">{form.formState.errors.recipientId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" {...form.register('subject')} />
            {form.formState.errors.subject && <p className="text-xs text-destructive">{form.formState.errors.subject.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" {...form.register('body')} rows={6} />
            {form.formState.errors.body && <p className="text-xs text-destructive">{form.formState.errors.body.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Send Request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
