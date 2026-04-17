'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const documentMovementSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  assigneeId: z.string().min(1, 'An assignee is required.'),
  comment: z.string().optional(),
});

type FormValues = z.infer<typeof documentMovementSchema>;

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function CreateDocumentMovementDialog({ isOpen, setIsOpen }: Props) {
  const { users } = useAuth();
  const { addDocumentMovement } = usePlanner();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(documentMovementSchema),
  });

  const assignableUsers = useMemo(() => {
    return users.filter(u => u.role !== 'Manager');
  }, [users]);

  const onSubmit = (data: FormValues) => {
    addDocumentMovement(data);
    toast({ title: 'Document Sent', description: 'The document tracking has started.' });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Document Movement</DialogTitle>
          <DialogDescription>Start tracking a document by assigning it to a user.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="doc-title">Document Title</Label>
            <Input id="doc-title" {...form.register('title')} />
            {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Assign To</Label>
            <Controller
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.assigneeId && <p className="text-xs text-destructive">{form.formState.errors.assigneeId.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Comment (Optional)</Label>
            <Textarea {...form.register('comment')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
