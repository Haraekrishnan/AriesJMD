
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Textarea } from '../ui/textarea';
import type { LaptopDesktop, Role } from '@/lib/types';
import { Eye, EyeOff } from 'lucide-react';

const itemSchema = z.object({
  allottedTo: z.string().min(1, 'Please select a user'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  ariesId: z.string().optional(),
  password: z.string().optional(),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof itemSchema>;

interface EditLaptopDesktopDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: LaptopDesktop;
}

export default function EditLaptopDesktopDialog({ isOpen, setIsOpen, item }: EditLaptopDesktopDialogProps) {
  const { user, users, updateLaptopDesktop } = useAppContext();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
  });

  const canEditPassword = useMemo(() => {
    if (!user) return false;
    const privilegedRoles: Role[] = ['Admin', 'Store in Charge', 'Assistant Store Incharge'];
    return privilegedRoles.includes(user.role);
  }, [user]);

  useEffect(() => {
    if (item && isOpen) {
        form.reset(item);
    }
  }, [item, isOpen, form]);

  const onSubmit = (data: FormValues) => {
    updateLaptopDesktop({ ...item, ...data });
    toast({
      title: 'Equipment Updated',
      description: 'Equipment details have been updated.',
    });
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Laptop/Desktop</DialogTitle>
          <DialogDescription>Update the details for this item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Allotted To</Label>
              <Controller name="allottedTo" control={form.control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select user"/></SelectTrigger>
                      <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
              )}/>
               {form.formState.errors.allottedTo && <p className="text-xs text-destructive">{form.formState.errors.allottedTo.message}</p>}
            </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input id="make" {...form.register('make')} />
              {form.formState.errors.make && <p className="text-xs text-destructive">{form.formState.errors.make.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" {...form.register('model')} />
              {form.formState.errors.model && <p className="text-xs text-destructive">{form.formState.errors.model.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input id="serialNumber" {...form.register('serialNumber')} />
              {form.formState.errors.serialNumber && <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="ariesId">Aries ID</Label>
                <Input id="ariesId" {...form.register('ariesId')} />
            </div>
          </div>
           <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} {...form.register('password')} disabled={!canEditPassword} />
                 {canEditPassword && (
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                 )}
              </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" {...form.register('remarks')} />
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
