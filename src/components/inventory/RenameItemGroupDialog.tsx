
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

const renameSchema = z.object({
  newName: z.string().min(1, 'New name is required'),
});

type RenameFormValues = z.infer<typeof renameSchema>;

interface RenameItemGroupDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentItemName: string;
}

export default function RenameItemGroupDialog({ isOpen, setIsOpen, currentItemName }: RenameItemGroupDialogProps) {
  const { renameInventoryItemGroup } = useAppContext();
  const { toast } = useToast();

  const form = useForm<RenameFormValues>({
    resolver: zodResolver(renameSchema),
    defaultValues: { newName: currentItemName },
  });

  const onSubmit = (data: RenameFormValues) => {
    renameInventoryItemGroup(currentItemName, data.newName);
    toast({ title: 'Item Group Renamed', description: `All items named "${currentItemName}" have been renamed to "${data.newName}".` });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ newName: currentItemName });
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Item Group</DialogTitle>
          <DialogDescription>This will rename all items currently named "{currentItemName}".</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newName">New Item Name</Label>
            <Input id="newName" {...form.register('newName')} />
            {form.formState.errors.newName && <p className="text-xs text-destructive">{form.formState.errors.newName.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Rename</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
