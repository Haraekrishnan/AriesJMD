
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, startOfDay } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { PlannerEvent } from '@/lib/types';
import { Label } from '../ui/label';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.date({ required_error: 'Date is required' }).refine(date => startOfDay(date) >= startOfDay(new Date()), {
    message: "Cannot edit an event to a past date."
  }),
  frequency: z.enum(['once', 'daily', 'weekly', 'weekends', 'monthly', 'daily-except-sundays']),
  userId: z.string().min(1, 'Please select an employee for this event'),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EditEventDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    event: PlannerEvent;
}

export default function EditEventDialog({ isOpen, setIsOpen, event }: EditEventDialogProps) {
  const { getVisibleUsers } = useAuth();
  const { updatePlannerEvent } = usePlanner();
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const assignableUsers = useMemo(() => {
    return getVisibleUsers().filter(u => u.role !== 'Manager');
  }, [getVisibleUsers]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
  });
  
  useEffect(() => {
    if (event) {
        form.reset({
            ...event,
            description: event.description || '',
            date: event.date ? new Date(event.date) : new Date(),
        });
    }
  }, [event, form]);

  const onSubmit = (data: EventFormValues) => {
    updatePlannerEvent({
      ...event,
      ...data,
      date: data.date.toISOString(),
    });
    toast({
      title: 'Event Updated',
      description: `"${data.title}" has been updated.`,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div>
            <Label>Event For</Label>
            <Controller
              control={form.control}
              name="userId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.userId && <p className="text-xs text-destructive">{form.formState.errors.userId.message}</p>}
          </div>

          <div>
            <Label>Title</Label>
            <Input {...form.register('title')} placeholder="Event title" />
            {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
          </div>
          
          <div>
            <Label>Description</Label>
            <Textarea {...form.register('description')} placeholder="Event description (optional)" />
          </div>

          <div>
            <Label>Date</Label>
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={field.value} 
                      onSelect={(date) => {
                        field.onChange(date);
                        setIsCalendarOpen(false);
                      }} 
                      initialFocus 
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
          </div>

          <div>
            <Label>Frequency</Label>
            <Controller
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Set frequency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="daily-except-sundays">Daily (Except Sundays)</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="weekends">Weekends</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
