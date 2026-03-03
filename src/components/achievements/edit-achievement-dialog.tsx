
'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import type { Achievement } from '@/lib/types';

const achievementSchema = z.object({
  userId: z.string().min(1, 'Please select an employee'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  points: z.coerce.number().min(1, 'Points must be at least 1'),
});

type AchievementFormValues = z.infer<typeof achievementSchema>;

interface EditAchievementDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  achievement: Achievement;
}

export default function EditAchievementDialog({ isOpen, setIsOpen, achievement }: EditAchievementDialogProps) {
  const { users, updateManualAchievement } = useAppContext();
  const { toast } = useToast();

  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
  });
  
  useEffect(() => {
    if (achievement && isOpen) {
      form.reset({
        userId: achievement.userId,
        title: achievement.title,
        description: achievement.description,
        points: achievement.points,
      });
    }
  }, [achievement, isOpen, form]);

  const onSubmit = (data: AchievementFormValues) => {
    updateManualAchievement({
      ...achievement,
      ...data,
    });
    toast({
      title: 'Achievement Updated',
      description: `The achievement for ${users.find(u => u.id === data.userId)?.name} has been updated.`,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Manual Achievement</DialogTitle>
          <DialogDescription>
            Update the details for the award given to {users.find(u => u.id === achievement.userId)?.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Controller
              control={form.control}
              name="userId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled>
                  <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.userId && <p className="text-xs text-destructive">{form.formState.errors.userId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register('title')} placeholder="e.g., Employee of the Month" />
            {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description / Reason</Label>
            <Textarea id="description" {...form.register('description')} placeholder="Reason for the award" />
            {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">Points</Label>
            <Input id="points" type="number" {...form.register('points')} />
            {form.formState.errors.points && <p className="text-xs text-destructive">{form.formState.errors.points.message}</p>}
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
