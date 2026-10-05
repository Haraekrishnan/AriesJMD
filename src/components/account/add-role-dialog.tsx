
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { ALL_PERMISSIONS, type Permission, Role } from '@/lib/types';
import PermissionPicker from './permission-picker';
import styles from './account.module.css';

const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  permissions: z.array(z.string()).optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface AddRoleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const formatPermissionName = (permission: string) => {
  return permission.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

export default function AddRoleDialog({ isOpen, setIsOpen }: AddRoleDialogProps) {
  const { addRole } = useAppContext();
  const { toast } = useToast();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      permissions: [],
    },
  });

  const onSubmit = (data: RoleFormValues) => {
    addRole({
      name: data.name as Role,
      permissions: (data.permissions as Permission[]) || [],
    });
    toast({
      title: 'Role Added',
      description: `The role "${data.name}" has been added to the system.`,
    });
    setIsOpen(false);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={styles.dialog} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add New Role</DialogTitle>
          <DialogDescription>Create a new role and assign permissions.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Role Name</Label>
            <Input id="name" {...form.register('name')} placeholder="e.g., Quality Inspector" />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <Controller name="permissions" control={form.control} render={({ field }) => (
              <PermissionPicker value={field.value || []} onChange={field.onChange} />
            )} />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Role</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
