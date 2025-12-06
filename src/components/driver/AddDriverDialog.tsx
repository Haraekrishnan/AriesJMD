
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Driver } from '@/lib/types';
import { useEffect } from 'react';
import { DatePickerInput } from '../ui/date-picker-input';

const driverSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  licenseNumber: z.string().min(1, 'License Number is required'),
  licenseExpiry: z.date().optional(),
  epNumber: z.string().optional(),
  epExpiry: z.date().optional(),
  medicalExpiry: z.date().optional(),
  safetyExpiry: z.date().optional(),
  sdpExpiry: z.date().optional(),
  woExpiry: z.date().optional(),
  labourContractExpiry: z.date().optional(),
  wcPolicyExpiry: z.date().optional(),
  sdpNumber: z.string().optional(),
});

type DriverFormValues = z.infer<typeof driverSchema>;

interface AddDriverDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  driver?: Driver;
}

const DatePickerController = ({ name, control }: { name: keyof DriverFormValues, control: any }) => (
    <Controller
        name={name}
        control={control}
        render={({ field }) => (
            <DatePickerInput 
                value={field.value ? new Date(field.value) : undefined}
                onChange={field.onChange}
            />
        )}
    />
);

export default function AddDriverDialog({ isOpen, setIsOpen, driver }: AddDriverDialogProps) {
  const { addDriver, updateDriver } = useAppContext();
  const { toast } = useToast();

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
  });

  useEffect(() => {
    if (isOpen) {
        const defaultValues = driver ? {
            ...driver,
            licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry) : undefined,
            epExpiry: driver.epExpiry ? new Date(driver.epExpiry) : undefined,
            medicalExpiry: driver.medicalExpiry ? new Date(driver.medicalExpiry) : undefined,
            safetyExpiry: driver.safetyExpiry ? new Date(driver.safetyExpiry) : undefined,
            sdpExpiry: driver.sdpExpiry ? new Date(driver.sdpExpiry) : undefined,
            woExpiry: driver.woExpiry ? new Date(driver.woExpiry) : undefined,
            labourContractExpiry: driver.labourContractExpiry ? new Date(driver.labourContractExpiry) : undefined,
            wcPolicyExpiry: driver.wcPolicyExpiry ? new Date(driver.wcPolicyExpiry) : undefined,
        } : {};
        form.reset(defaultValues);
    }
  }, [isOpen, driver, form]);

  const onSubmit = (data: DriverFormValues) => {
    const dataToSubmit: { [key: string]: any } = {};
    
    // Ensure only defined values are submitted
    Object.keys(data).forEach(key => {
        const value = data[key as keyof typeof data];
        if (value instanceof Date) {
            dataToSubmit[key] = value.toISOString();
        } else if (value !== undefined && value !== '') {
            dataToSubmit[key] = value;
        }
    });

    if (driver) {
      updateDriver({ ...driver, ...dataToSubmit } as Driver);
      toast({ title: 'Driver Updated' });
    } else {
      addDriver(dataToSubmit as Omit<Driver, 'id' | 'photo'>);
      toast({ title: 'Driver Added' });
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{driver ? `Edit Driver: ${driver.name}` : 'Add New Driver'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] p-1">
            <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>Driver Name</Label><Input {...form.register('name')} />{form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}</div>
                    <div><Label>License Number</Label><Input {...form.register('licenseNumber')} />{form.formState.errors.licenseNumber && <p className="text-xs text-destructive">{form.formState.errors.licenseNumber.message}</p>}</div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><Label>EP Number</Label><Input {...form.register('epNumber')} /></div>
                    <div><Label>SDP Number</Label><Input {...form.register('sdpNumber')} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>License Expiry</Label><DatePickerController name="licenseExpiry" control={form.control} /></div>
                    <div><Label>EP Expiry</Label><DatePickerController name="epExpiry" control={form.control} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>Medical Expiry</Label><DatePickerController name="medicalExpiry" control={form.control} /></div>
                    <div><Label>Safety Expiry</Label><DatePickerController name="safetyExpiry" control={form.control} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>SDP Expiry</Label><DatePickerController name="sdpExpiry" control={form.control} /></div>
                    <div><Label>WO Expiry</Label><DatePickerController name="woExpiry" control={form.control} /></div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><Label>Labour Contract Expiry</Label><DatePickerController name="labourContractExpiry" control={form.control} /></div>
                    <div><Label>WC Policy Expiry</Label><DatePickerController name="wcPolicyExpiry" control={form.control} /></div>
                </div>
            </div>
            </ScrollArea>
            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">{driver ? 'Save Changes' : 'Add Driver'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    