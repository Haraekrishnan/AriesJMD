'use client';
import { useEffect } from 'react';
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
import { ALL_PERMISSIONS, type Permission, type Role } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  permissions: z.array(z.string()).optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface EditRoleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  role: Role;
}

const formatPermissionName = (permission: string) => {
  return permission.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

export default function EditRoleDialog({ isOpen, setIsOpen, role }: EditRoleDialogProps) {
  const { updateRole } = useAppContext();
  const { toast } = useToast();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
  });

  useEffect(() => {
    if (role && isOpen) {
      form.reset({
        name: role.name,
        permissions: role.permissions,
      });
    }
  }, [role, isOpen, form]);

  const onSubmit = (data: RoleFormValues) => {
    updateRole({
        ...role,
        name: data.name,
        permissions: (data.permissions as Permission[]) || [],
    });
    toast({
      title: 'Role Updated',
      description: `The role "${data.name}" has been updated.`,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Role: {role.name}</DialogTitle>
          <DialogDescription>Modify the role's name and permissions.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Role Name</Label>
            <Input id="name" {...form.register('name')} placeholder="e.g., Quality Inspector" />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <ScrollArea className="h-64 rounded-md border p-4">
                <div className="space-y-2">
                {ALL_PERMISSIONS.map(permission => (
                    <Controller
                        key={permission}
                        name="permissions"
                        control={form.control}
                        render={({ field }) => (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`edit-${permission}`}
                                    checked={field.value?.includes(permission)}
                                    onCheckedChange={checked => {
                                        const value = field.value || [];
                                        return checked
                                        ? field.onChange([...value, permission])
                                        : field.onChange(value.filter(v => v !== permission));
                                    }}
                                />
                                <Label htmlFor={`edit-${permission}`} className="font-normal">{formatPermissionName(permission)}</Label>
                            </div>
                        )}
                    />
                ))}
                </div>
            </ScrollArea>
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
