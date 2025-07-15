'use client';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import type { Vehicle } from '@/lib/types';

const vehicleSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  driverId: z.string().min(1, 'Please select a driver'),
  vapValidity: z.string().optional(),
  insuranceValidity: z.string().optional(),
  fitnessValidity: z.string().optional(),
  taxValidity: z.string().optional(),
  puccValidity: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface EditVehicleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  vehicle: Vehicle;
}

export default function EditVehicleDialog({ isOpen, setIsOpen, vehicle }: EditVehicleDialogProps) {
  const { updateVehicle, users } = useAppContext();
  const { toast } = useToast();
  
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
  });

  useEffect(() => {
    if (vehicle && isOpen) {
        form.reset({
            vehicleNumber: vehicle.vehicleNumber,
            driverId: vehicle.driverId,
            vapValidity: vehicle.vapValidity,
            insuranceValidity: vehicle.insuranceValidity,
            fitnessValidity: vehicle.fitnessValidity,
            taxValidity: vehicle.taxValidity,
            puccValidity: vehicle.puccValidity,
        });
    }
  }, [vehicle, isOpen, form]);

  const onSubmit = (data: VehicleFormValues) => {
    updateVehicle({ ...vehicle, ...data });
    toast({
      title: 'Vehicle Updated',
      description: `Vehicle ${data.vehicleNumber} has been updated.`,
    });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
      if (!open) {
          form.reset();
      }
      setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
          <DialogDescription>Update the details for vehicle {vehicle.vehicleNumber}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleNumber">Vehicle Number</Label>
            <Input id="vehicleNumber" {...form.register('vehicleNumber')} />
            {form.formState.errors.vehicleNumber && <p className="text-xs text-destructive">{form.formState.errors.vehicleNumber.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Driver</Label>
            <Controller
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select a driver" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.driverId && <p className="text-xs text-destructive">{form.formState.errors.driverId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vapValidity">VAP Validity</Label>
            <Input id="vapValidity" type="date" {...form.register('vapValidity')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insuranceValidity">Insurance Validity</Label>
            <Input id="insuranceValidity" type="date" {...form.register('insuranceValidity')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fitnessValidity">Fitness Validity</Label>
            <Input id="fitnessValidity" type="date" {...form.register('fitnessValidity')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxValidity">Tax Validity</Label>
            <Input id="taxValidity" type="date" {...form.register('taxValidity')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="puccValidity">PUCC Validity</Label>
            <Input id="puccValidity" type="date" {...form.register('puccValidity')} />
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
