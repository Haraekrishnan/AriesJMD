
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
import type { ManpowerProfile, Trade, LeaveRecord, ManpowerDocument, DocumentStatus } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CalendarIcon, Trash2, Edit } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format, parse, isValid, startOfDay } from 'date-fns';
import { TRADES, MANDATORY_DOCS, RA_TRADES } from '@/lib/mock-data';
import { DateRangePicker } from '../ui/date-range-picker';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const documentSchema = z.object({
  name: z.string(),
  details: z.string().optional(),
  status: z.enum(['Pending', 'Collected', 'Submitted', 'Received']),
});

const leaveSchema = z.object({
  leaveType: z.enum(['Annual', 'Emergency']),
  dateRange: z.object({
      from: z.date(),
      to: z.date().optional(),
  }),
  rejoinedDate: z.date().optional(),
  remarks: z.string().optional(),
});

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  hardCopyFileNo: z.string().optional(),
  documentFolderUrl: z.string().url().optional().or(z.literal('')),
  trade: z.string(),
  otherTrade: z.string().optional(),
  status: z.enum(['Working', 'On Leave', 'Resigned', 'Terminated', 'Left the Project']),
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
  documents: z.array(documentSchema).optional(),
  resignationDate: z.date().optional(),
  terminationDate: z.date().optional(),
  feedback: z.string().optional(),
  currentLeave: leaveSchema.optional(),
  leaveHistory: z.array(z.any()).optional(), // Use `any` for display, not form validation
}).refine(data => {
    if (data.trade === 'Others') {
        return !!data.otherTrade && data.otherTrade.length > 0;
    }
    return true;
}, {
    message: 'Please specify the trade',
    path: ['otherTrade'],
}).refine(data => {
    // This validation only applies if you are *setting* the status to "On Leave"
    if (data.status === 'On Leave' && !data.currentLeave?.dateRange.from) {
        return false;
    }
    return true;
}, {
    message: "Leave period is required when status is 'On Leave'",
    path: ['currentLeave.dateRange'],
});


type ProfileFormValues = z.infer<typeof profileSchema>;

interface ManpowerProfileDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  profile: ManpowerProfile | null;
}

const statusOptions: ManpowerProfile['status'][] = ['Working', 'On Leave', 'Resigned', 'Terminated', 'Left the Project'];
const documentStatusOptions: DocumentStatus[] = ['Pending', 'Collected', 'Submitted', 'Received'];


const DatePickerController = ({ name, control, disabled = false }: { name: any, control: any, disabled?: boolean }) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const [inputValue, setInputValue] = useState(field.value ? format(new Date(field.value), 'dd-MM-yyyy') : '');

        useEffect(() => {
          if (field.value && isValid(new Date(field.value))) {
            setInputValue(format(new Date(field.value), 'dd-MM-yyyy'));
          } else if (!field.value) {
            setInputValue('');
          }
        }, [field.value]);

        const handleDateChange = (dateStr: string) => {
          setInputValue(dateStr);
          if (dateStr.length === 10) {
            const parsedDate = parse(dateStr, 'dd-MM-yyyy', new Date());
            if (isValid(parsedDate)) {
              field.onChange(parsedDate);
            } else {
              field.onChange(undefined);
            }
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
  const { user, addManpowerProfile, updateManpowerProfile, deleteLeaveRecord, updateLeaveRecord, manpowerProfiles } = useAppContext();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });
  
  const { fields: documentFields, append: appendDocument, remove: removeDocument, replace: replaceDocuments } = useFieldArray({
    control: form.control,
    name: "documents"
  });
  
  const watchTrade = form.watch('trade');
  const watchStatus = form.watch('status');

  const liveProfile = useMemo(() => manpowerProfiles.find(p => p.id === profile?.id), [manpowerProfiles, profile]);

  const parseDate = (dateString?: string) => {
    return dateString && isValid(new Date(dateString)) ? new Date(dateString) : undefined;
  };
    
  useEffect(() => {
    if (isOpen && profile) {
        const liveProfile = manpowerProfiles.find(p => p.id === profile.id);
        if (!liveProfile) return;

        const baseDocs = MANDATORY_DOCS;
        const profileDocsMap = new Map((liveProfile.documents || []).map(doc => [doc.name, doc]));
        let initialDocs: ManpowerDocument[] = baseDocs.map(docName => 
            profileDocsMap.get(docName) || { name: docName, status: 'Pending', details: '' }
        );
        
        // Add any non-standard docs that might exist on the profile (like IRATA)
        (liveProfile.documents || []).forEach(doc => {
            if (!initialDocs.some(d => d.name === doc.name)) {
                initialDocs.push(doc);
            }
        });
        
        form.reset({
            ...liveProfile,
            dob: parseDate(liveProfile.dob),
            joiningDate: parseDate(liveProfile.joiningDate),
            workOrderExpiryDate: parseDate(liveProfile.workOrderExpiryDate),
            labourLicenseExpiryDate: parseDate(liveProfile.labourLicenseExpiryDate),
            wcPolicyExpiryDate: parseDate(liveProfile.wcPolicyExpiryDate),
            resignationDate: parseDate(liveProfile.resignationDate),
            terminationDate: parseDate(liveProfile.terminationDate),
            documents: initialDocs,
            trade: TRADES.includes(liveProfile.trade) ? liveProfile.trade : 'Others',
            otherTrade: TRADES.includes(liveProfile.trade) ? '' : liveProfile.trade,
        });
    } else if (isOpen && !profile) {
        let initialDocs: ManpowerDocument[] = MANDATORY_DOCS.map(name => ({ name, status: 'Pending', details: '' }));
        form.reset({ documents: initialDocs, status: 'Working', documentFolderUrl: '' });
    }
}, [profile, isOpen, form, manpowerProfiles]);

  useEffect(() => {
    const documents = form.getValues('documents') || [];
    const hasIrata = documents.some(doc => doc.name === 'IRATA Certificate');
    const isRaTrade = RA_TRADES.includes(watchTrade);

    if (isRaTrade && !hasIrata) {
      appendDocument({ name: 'IRATA Certificate', status: 'Pending', details: '' });
    } else if (!isRaTrade && hasIrata) {
      const irataIndex = documents.findIndex(doc => doc.name === 'IRATA Certificate');
      if (irataIndex > -1) {
        removeDocument(irataIndex);
      }
    }
  }, [watchTrade, form, appendDocument, removeDocument]);
  
  const onSubmit = (data: ProfileFormValues) => {
    const finalTrade = data.trade === 'Others' ? data.otherTrade : data.trade;

    let finalLeaveHistory = liveProfile?.leaveHistory || [];

    // Handle new leave record
    if (data.status === 'On Leave' && data.currentLeave?.dateRange.from) {
        const leaveRecord: LeaveRecord = {
            id: `leave-${Date.now()}`,
            leaveType: data.currentLeave.leaveType,
            leaveStartDate: data.currentLeave.dateRange.from.toISOString(),
            plannedEndDate: data.currentLeave.dateRange.to?.toISOString(),
            rejoinedDate: data.currentLeave.rejoinedDate?.toISOString(),
            remarks: data.currentLeave.remarks,
        };
        finalLeaveHistory.push(leaveRecord);
    }
    
    // Handle changing status *from* "On Leave" to something else
    if (liveProfile?.status === 'On Leave' && data.status !== 'On Leave') {
        const activeLeaveIndex = finalLeaveHistory.findIndex(l => !l.rejoinedDate && !l.leaveEndDate);
        if (activeLeaveIndex > -1) {
            const terminationDate = data.terminationDate || data.resignationDate || new Date();
            finalLeaveHistory[activeLeaveIndex].leaveEndDate = terminationDate.toISOString();
        }
    }

    const cleanDataForFirebase = (obj: any) => {
      if (!obj) return null;
      const newObj: any = {};
      for (const key in obj) {
        if (obj[key] instanceof Date) {
          newObj[key] = obj[key].toISOString();
        } else if(obj[key] !== undefined) { 
          newObj[key] = obj[key];
        }
      }
      return newObj;
    };
    
    const dataToSubmit = cleanDataForFirebase({...data, trade: finalTrade, leaveHistory: finalLeaveHistory });
    delete dataToSubmit.otherTrade;
    delete dataToSubmit.currentLeave;

    if (profile) {
      updateManpowerProfile({ ...profile, ...dataToSubmit } as ManpowerProfile);
      toast({ title: 'Profile Updated' });
    } else {
      const newProfileData = {
        skills: [],
        ...dataToSubmit
      } as Omit<ManpowerProfile, 'id'>
      addManpowerProfile(newProfileData);
      toast({ title: 'Profile Added' });
    }
    setIsOpen(false);
  };
  
  const handleDeleteLeave = (leaveId: string) => {
    if (profile) {
        deleteLeaveRecord(profile.id, leaveId);
        toast({ variant: 'destructive', title: 'Leave Record Deleted' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>{profile ? `Edit Profile: ${profile.name}` : 'Add New Manpower Profile'}</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[70vh] p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 pr-4">
                    
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Personal & Work Details</h3>
                        <div><Label>Full Name</Label><Input {...form.register('name')} />{form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}</div>
                        <div><Label>Hard Copy File No.</Label><Input {...form.register('hardCopyFileNo')} />{form.formState.errors.hardCopyFileNo && <p className="text-xs text-destructive">{form.formState.errors.hardCopyFileNo.message}</p>}</div>
                        <div>
                            <Label>Trade</Label>
                            <Controller control={form.control} name="trade" render={({field}) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select trade..."/></SelectTrigger>
                                <SelectContent>
                                    {TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                                </Select>
                            )}/>
                        </div>
                        {watchTrade === 'Others' && (
                             <div><Label>Specify Trade</Label><Input {...form.register('otherTrade')} />{form.formState.errors.otherTrade && <p className="text-xs text-destructive">{form.formState.errors.otherTrade.message}</p>}</div>
                        )}
                         <div><Label>Status</Label>
                            <Controller control={form.control} name="status" render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select status..."/></SelectTrigger>
                                <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                </Select>
                            )}/>
                        </div>
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
                        <h3 className="text-lg font-semibold border-b pb-2">Contract & Policy Details</h3>
                        <div><Label>Work Order Number</Label><Input {...form.register('workOrderNumber')} /></div>
                        <div><Label>Labour License No</Label><Input {...form.register('labourLicenseNo')} /></div>
                        <div><Label>EIC</Label><Input {...form.register('eic')} /></div>
                        <div><Label>EP Number</Label><Input {...form.register('epNumber')} /></div>
                        <Separator className="my-4" />
                        <div><Label>Joining Date</Label><DatePickerController name="joiningDate" control={form.control} /></div>
                        <div><Label>Work Order Expiry Date</Label><DatePickerController name="workOrderExpiryDate" control={form.control} /></div>
                        <div><Label>Labour License Expiry Date</Label><DatePickerController name="labourLicenseExpiryDate" control={form.control} /></div>
                        <Separator className="my-4" />
                        <div><Label>WC Policy Number</Label><Input {...form.register('wcPolicyNumber')} /></div>
                        <div><Label>WC Policy Expiry Date</Label><DatePickerController name="wcPolicyExpiryDate" control={form.control} /></div>
                        <div><Label>Card Category</Label><Input {...form.register('cardCategory')} /></div>
                        <div><Label>Card Type</Label><Input {...form.register('cardType')} /></div>
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Document Status</h3>
                        <div><Label>Document Folder URL</Label><Input {...form.register('documentFolderUrl')} placeholder="https://..." />{form.formState.errors.documentFolderUrl && <p className="text-xs text-destructive">{form.formState.errors.documentFolderUrl.message}</p>}</div>
                        <Separator />
                         {documentFields.map((field, index) => (
                          <div key={field.id}>
                            <Label>{field.name}</Label>
                            <div className="flex gap-2">
                                <Controller
                                    name={`documents.${index}.status`}
                                    control={form.control}
                                    render={({ field: selectField }) => (
                                        <Select onValueChange={selectField.onChange} value={selectField.value}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {documentStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                        </Select>
                                    )}
                                />
                                <Input placeholder="Doc No. / Details" {...form.register(`documents.${index}.details`)} />
                            </div>
                          </div>
                        ))}
                    </div>

                    {(watchStatus === 'Resigned' || watchStatus === 'Terminated') && (
                        <div className="space-y-4 md:col-span-2 lg:col-span-3">
                           <Separator />
                           <h3 className="text-lg font-semibold border-b pb-2">{watchStatus} Details</h3>
                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <Label>{watchStatus} Date</Label>
                                  <DatePickerController name={watchStatus === 'Resigned' ? 'resignationDate' : 'terminationDate'} control={form.control} />
                               </div>
                               <div className='col-span-2'>
                                  <Label>Reason / Feedback</Label>
                                  <Textarea {...form.register('feedback')} />
                               </div>
                           </div>
                        </div>
                    )}
                    {watchStatus === 'On Leave' && (
                        <div className="space-y-4 md:col-span-2 lg:col-span-3">
                           <Separator />
                           <h3 className="text-lg font-semibold border-b pb-2">Current Leave Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <div><Label>Leave Type</Label><Controller name="currentLeave.leaveType" control={form.control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Annual">Annual</SelectItem><SelectItem value="Emergency">Emergency</SelectItem></SelectContent></Select>)}/></div>
                               <div><Label>Leave Period</Label><Controller name="currentLeave.dateRange" control={form.control} render={({ field }) => (<DateRangePicker date={field.value} onDateChange={field.onChange}/>)}/></div>
                               <div><Label>Actual Rejoining Date</Label><DatePickerController name="currentLeave.rejoinedDate" control={form.control}/></div>
                               <div className="col-span-3"><Label>Remarks</Label><Textarea {...form.register('currentLeave.remarks')}/></div>
                            </div>
                        </div>
                    )}
                     {(liveProfile?.leaveHistory || []).length > 0 && (
                        <div className="space-y-4 md:col-span-3">
                            <Separator />
                            <h3 className="text-lg font-semibold border-b pb-2">Leave History</h3>
                            <Table>
                                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Rejoined</TableHead>{user?.role === 'Admin' && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
                                <TableBody>
                                    {liveProfile?.leaveHistory?.map(leave => (
                                        <TableRow key={leave.id}>
                                            <TableCell>{leave.leaveType}</TableCell>
                                            <TableCell>{leave.leaveStartDate ? format(new Date(leave.leaveStartDate), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                                            <TableCell>{leave.plannedEndDate ? format(new Date(leave.plannedEndDate), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                                            <TableCell>{leave.rejoinedDate ? format(new Date(leave.rejoinedDate), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                                            {user?.role === 'Admin' && (
                                                <TableCell className="text-right">
                                                    <AlertDialog>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-4 w-4"/></Button>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Leave Record?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete this leave entry. This cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteLeave(leave.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                     )}

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
