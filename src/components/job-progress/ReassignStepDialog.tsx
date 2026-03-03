
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { JobProgress, JobStep } from '@/lib/types';
import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';

const reassignSchema = z.object({
  newAssigneeId: z.string().min(1, "Please select a new assignee."),
  comment: z.string().min(10, "A comment is required for reassignment."),
});
  
type ReassignFormValues = z.infer<typeof reassignSchema>;
  
interface ReassignStepDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    job: JobProgress;
    step: JobStep;
}

export default function ReassignStepDialog({ isOpen, setIsOpen, job, step }: ReassignStepDialogProps) {
    const { getAssignableUsers, reassignJobStep, user } = useAppContext();
    const { toast } = useToast();
    const [popoverOpen, setPopoverOpen] = useState(false);

    const assignableUsers = useMemo(() => {
        return getAssignableUsers().filter(u => u.id !== user?.id && u.role !== 'Manager');
    }, [getAssignableUsers, user]);

    const form = useForm<ReassignFormValues>({
        resolver: zodResolver(reassignSchema),
        defaultValues: { newAssigneeId: '', comment: '' }
    });

    const onSubmit = (data: ReassignFormValues) => {
        reassignJobStep(job.id, step.id, data.newAssigneeId, data.comment);
        toast({ title: "Step Reassigned", description: `The step has been reassigned.` });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Reassign Step: {step.name}</DialogTitle>
                    <DialogDescription>Select a new assignee for this step.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>New Assignee</Label>
                         <Controller
                            name="newAssigneeId"
                            control={form.control}
                            render={({ field }) => (
                                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                            {field.value ? assignableUsers.find(u => u.id === field.value)?.name : "Select new assignee..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search users..." />
                                            <CommandList>
                                                <CommandEmpty>No users found.</CommandEmpty>
                                                <CommandGroup>
                                                    {assignableUsers.map(user => (
                                                        <CommandItem
                                                            key={user.id}
                                                            value={user.name}
                                                            onSelect={() => {
                                                                form.setValue('newAssigneeId', user.id);
                                                                setPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", user.id === field.value ? "opacity-100" : "opacity-0")} />
                                                            {user.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                         {form.formState.errors.newAssigneeId && <p className="text-xs text-destructive">{form.formState.errors.newAssigneeId.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="comment">Comment</Label>
                        <Textarea id="comment" {...form.register('comment')} />
                        {form.formState.errors.comment && <p className="text-xs text-destructive">{form.formState.errors.comment.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button type="submit">Reassign Step</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
