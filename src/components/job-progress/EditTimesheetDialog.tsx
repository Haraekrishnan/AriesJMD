
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DatePickerInput } from '../ui/date-picker-input';
import { Timesheet } from '@/lib/types';
import { useEffect } from 'react';
import { parseISO } from 'date-fns';

const timesheetSchema = z.object({
    submittedToId: z.string().min(1, 'Please select a recipient'),
    projectId: z.string().min(1, 'Project is required'),
    plantUnit: z.string().min(1, 'Plant/Unit name is required'),
    numberOfTimesheets: z.coerce.number().min(1, "Number of timesheets must be at least 1."),
    startDate: z.date({ required_error: 'Start date is required.' }),
    endDate: z.date({ required_error: 'End date is required.' }),
}).refine(data => !data.endDate || !data.startDate || data.endDate >= data.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
});

type TimesheetFormValues = z.infer<typeof timesheetSchema>;

interface EditTimesheetDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  timesheet: Timesheet;
}

export default function EditTimesheetDialog({ isOpen, setIsOpen, timesheet }: EditTimesheetDialogProps) {
  const { user, users, projects, updateTimesheet, addTimesheetComment } = useAppContext();
  const { toast } = useToast();

  const form = useForm<TimesheetFormValues>({
    resolver: zodResolver(timesheetSchema),
  });
  
  useEffect(() => {
    if (timesheet) {
      form.reset({
        ...timesheet,
        startDate: parseISO(timesheet.startDate),
        endDate: parseISO(timesheet.endDate),
      });
    }
  }, [timesheet, form]);

  const onSubmit = (data: TimesheetFormValues) => {
    const updatedTimesheet: Timesheet = {
        ...timesheet,
        ...data,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
    };
    
    if (data.submittedToId !== timesheet.submittedToId) {
        const oldRecipient = users.find(u => u.id === timesheet.submittedToId)?.name || 'Previous recipient';
        const newRecipient = users.find(u => u.id === data.submittedToId)?.name || 'New recipient';
        const comment = `${user?.name} reassigned the acknowledgment from ${oldRecipient} to ${newRecipient}.`;
        addTimesheetComment(timesheet.id, comment);
    }
    
    updateTimesheet(updatedTimesheet);
    toast({ title: 'Timesheet Updated' });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
      if (!open) {
          form.reset();
      }
      setIsOpen(open);
  };

  const assignableUsers = users.filter(u => u.role !== 'Manager' && u.id !== user?.id);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Timesheet</DialogTitle>
          <DialogDescription>Modify the details and resubmit your timesheet.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
           <div className="space-y-2">
                <Label>Submit To</Label>
                <Controller
                  control={form.control}
                  name="submittedToId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select a recipient" /></SelectTrigger>
                      <SelectContent>
                        {assignableUsers.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.submittedToId && <p className="text-xs text-destructive">{form.formState.errors.submittedToId.message}</p>}
            </div>

            <div className="space-y-2">
                <Label>Project</Label>
                <Controller
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="plant-unit">Plant/Unit</Label>
                <Input id="plant-unit" {...form.register('plantUnit')} />
                {form.formState.errors.plantUnit && <p className="text-xs text-destructive">{form.formState.errors.plantUnit.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="number-of-timesheets">No. of Timesheets</Label>
                <Input id="number-of-timesheets" type="number" {...form.register('numberOfTimesheets')} />
                {form.formState.errors.numberOfTimesheets && <p className="text-xs text-destructive">{form.formState.errors.numberOfTimesheets.message}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Controller
                        name="startDate"
                        control={form.control}
                        render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />}
                    />
                    {form.formState.errors.startDate && <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label>End Date</Label>
                    <Controller
                        name="endDate"
                        control={form.control}
                        render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />}
                    />
                    {form.formState.errors.endDate && <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>}
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Save & Resubmit</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
