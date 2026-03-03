
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
import { PlusCircle } from 'lucide-react';

const achievementSchema = z.object({
  userId: z.string().min(1, 'Please select an employee'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  points: z.coerce.number().min(1, 'Points must be at least 1'),
});

type AchievementFormValues = z.infer<typeof achievementSchema>;

export default function AddAchievementDialog() {
  const { users, awardManualAchievement } = useAppContext();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const awardableUsers = useMemo(() => {
    return users.filter(u => u.role !== 'Manager');
  }, [users]);

  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
    defaultValues: {
      userId: '',
      title: '',
      description: '',
      points: 10,
    },
  });

  const onSubmit = (data: AchievementFormValues) => {
    awardManualAchievement(data);
    toast({
      title: 'Achievement Awarded',
      description: `You have awarded an achievement to ${users.find(u => u.id === data.userId)?.name}.`,
    });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) form.reset();
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Award Achievement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Award Manual Achievement</DialogTitle>
          <DialogDescription>Select a user and define the achievement details. This will be approved and visible immediately.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Controller
              control={form.control}
              name="userId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                  <SelectContent>
                    {awardableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
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
            <Button type="submit">Award Achievement</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
