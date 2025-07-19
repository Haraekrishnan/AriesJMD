

'use client';
import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import type { ManpowerProfile, Trade, LeaveRecord } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CalendarIcon } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  hardCopyFileNo: z.string().optional(),
  mobileNumber: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dob: z.date().optional(),
  aadharNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  workOrderNumber: z.string().optional(),
  labourLicenseNo: z.string().optional(),
  eic: z.string().optional(),
  joiningDate: z.date().optional(),
  workOrderExpiryDate: z.date().optional(),
  labourLicenseExpiryDate: z.date().optional(),
  wcPolicyNumber: z.string().optional(),
  wcPolicyExpiryDate: z.date().optional(),
  cardCategory: z.string().optional(),
  cardType: z.string().optional(),
  epNumber: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ManpowerProfileDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  profile: ManpowerProfile | null;
}

const DatePickerController = ({ name, control, disabled = false }: { name: any, control: any, disabled?: boolean }) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const [inputValue, setInputValue] = useState(field.value ? format(new Date(field.value), 'dd-MM-yyyy') : '');

        useEffect(() => {
          if (field.value && field.value instanceof Date) {
            setInputValue(format(field.value, 'dd-MM-yyyy'));
          } else if (!field.value) {
            setInputValue('');
          }
        }, [field.value]);

        const handleDateChange = (dateStr: string) => {
          setInputValue(dateStr);
          const parsedDate = parse(dateStr, 'dd-MM-yyyy', new Date());
          if (!isNaN(parsedDate.getTime())) {
            field.onChange(parsedDate);
          } else if(dateStr === '') {
            field.onChange(undefined);
          }
        };

        const handleCalendarSelect = (date: Date | undefined) => {
            field.onChange(date);
            if(date) {
                setInputValue(format(date, 'dd-MM-yyyy'));
            }
        };

        return (
          <div className="relative">
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => handleDateChange(e.target.value)}
              placeholder="DD-MM-YYYY"
              disabled={disabled}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" disabled={disabled}>
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={handleCalendarSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      }}
    />
  );
};


export default function ManpowerProfileDialog({ isOpen, setIsOpen, profile }: ManpowerProfileDialogProps) {
  const { user, addManpowerProfile, updateManpowerProfile } = useAppContext();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });
  
  const parseDate = (dateString?: string) => {
    return dateString ? new Date(dateString) : undefined;
  };

  useEffect(() => {
    if (isOpen) {
        if (profile) {
            form.reset({
                ...profile,
                dob: parseDate(profile.dob),
                joiningDate: parseDate(profile.joiningDate),
                workOrderExpiryDate: parseDate(profile.workOrderExpiryDate),
                labourLicenseExpiryDate: parseDate(profile.labourLicenseExpiryDate),
                wcPolicyExpiryDate: parseDate(profile.wcPolicyExpiryDate),
            });
        } else {
            form.reset({});
        }
    }
  }, [profile, isOpen, form]);
  
  const onSubmit = (data: ProfileFormValues) => {
    const cleanDataForFirebase = (obj: any) => {
      const newObj: any = {};
      for (const key in obj) {
        if (obj[key] instanceof Date) {
          newObj[key] = obj[key].toISOString();
        } else if(obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
          newObj[key] = obj[key];
        }
      }
      return newObj;
    };
    
    const dataToSubmit = cleanDataForFirebase(data);

    if (profile) {
      updateManpowerProfile({ ...profile, ...dataToSubmit } as ManpowerProfile);
      toast({ title: 'Profile Updated' });
    } else {
      const newProfileData = {
        trade: 'Others', // Default trade
        status: 'Working',
        documents: [],
        skills: [],
        leaveHistory: [],
        ...dataToSubmit
      } as Omit<ManpowerProfile, 'id'>
      addManpowerProfile(newProfileData);
      toast({ title: 'Profile Added' });
    }
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>{profile ? `Edit Profile: ${profile.name}` : 'Add New Manpower Profile'}</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[70vh] p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 pr-4">
                    
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Personal Details</h3>
                        <div><Label>Full Name</Label><Input {...form.register('name')} />{form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}</div>
                        <div><Label>Hard Copy File No.</Label><Input {...form.register('hardCopyFileNo')} />{form.formState.errors.hardCopyFileNo && <p className="text-xs text-destructive">{form.formState.errors.hardCopyFileNo.message}</p>}</div>
                        <div><Label>Mobile Number</Label><Input {...form.register('mobileNumber')} /></div>
                        <div><Label>Gender</Label>
                            <Controller control={form.control} name="gender" render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}/>
                        </div>
                        <div><Label>Date of Birth</Label><DatePickerController name="dob" control={form.control} /></div>
                        <div><Label>Aadhar Number</Label><Input {...form.register('aadharNumber')} /></div>
                        <div><Label>UAN Number</Label><Input {...form.register('uanNumber')} /></div>
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Work & Contract Details</h3>
                        <div><Label>Work Order Number</Label><Input {...form.register('workOrderNumber')} /></div>
                        <div><Label>Labour License No</Label><Input {...form.register('labourLicenseNo')} /></div>
                        <div><Label>EIC</Label><Input {...form.register('eic')} /></div>
                        <div><Label>EP Number</Label><Input {...form.register('epNumber')} /></div>
                        <Separator className="my-4" />
                        <div><Label>Joining Date</Label><DatePickerController name="joiningDate" control={form.control} /></div>
                        <div><Label>Work Order Expiry Date</Label><DatePickerController name="workOrderExpiryDate" control={form.control} /></div>
                        <div><Label>Labour License Expiry Date</Label><DatePickerController name="labourLicenseExpiryDate" control={form.control} /></div>
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Policy & Card Details</h3>
                        <div><Label>WC Policy Number</Label><Input {...form.register('wcPolicyNumber')} /></div>
                        <div><Label>WC Policy Expiry Date</Label><DatePickerController name="wcPolicyExpiryDate" control={form.control} /></div>
                        <Separator className="my-4" />
                        <div><Label>Card Category</Label><Input {...form.register('cardCategory')} /></div>
                        <div><Label>Card Type</Label><Input {...form.register('cardType')} /></div>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">{profile ? 'Save Changes' : 'Add Profile'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
