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
import type { ManpowerProfile, Trade, LeaveRecord, ManpowerDocument, DocumentStatus, Skill, MemoRecord, Role, PpeHistoryRecord } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Trash2, Edit, PlusCircle, FileWarning, Shirt } from 'lucide-react';
import { Separator } from '../ui/separator';
import { format, parse, isValid, startOfDay, parseISO } from 'date-fns';
import { TRADES, MANDATORY_DOCS, RA_TRADES } from '@/lib/mock-data';
import { DateRangePicker } from '../ui/date-range-picker';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DatePickerInput } from '../ui/date-picker-input';
import { Badge } from '../ui/badge';
import EditMemoDialog from './EditMemoDialog';
import EditPpeHistoryDialog from './EditPpeHistoryDialog';

const ppeHistorySchema = z.object({
  ppeType: z.enum(['Coverall', 'Safety Shoes'], { required_error: "PPE Type is required."}),
  size: z.string().min(1, 'Size is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1').default(1),
  issueDate: z.date({ required_error: 'Issue date is required' }),
  requestType: z.enum(['New', 'Replacement']),
  remarks: z.string().optional(),
});

type PpeHistoryFormValues = z.infer<typeof ppeHistorySchema>;

const PpeHistoryForm = ({ profile }: { profile: ManpowerProfile }) => {
    const { user, addPpeHistoryRecord } = useAppContext();
    const { toast } = useToast();
    const form = useForm<PpeHistoryFormValues>({
        resolver: zodResolver(ppeHistorySchema),
        defaultValues: { requestType: 'New', quantity: 1, issueDate: undefined },
    });
    
    const ppeType = form.watch('ppeType');

    useEffect(() => {
        if (ppeType) {
            const size = ppeType === 'Coverall' ? profile.coverallSize : profile.shoeSize;
            form.setValue('size', size || '');
        }
    }, [ppeType, profile, form]);

    const handleAddRecord = (data: PpeHistoryFormValues) => {
        if (!user) return;
        addPpeHistoryRecord(profile.id, {
            ...data,
            issueDate: data.issueDate.toISOString(),
            issuedById: user.id,
        });
        toast({ title: 'PPE Record Added', description: 'The PPE issue history has been updated.' });
        form.reset({ requestType: 'New', issueDate: undefined, quantity: 1 });
    };

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-semibold text-sm">Add New PPE Issue</h4>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>PPE Type</Label>
                    <Controller name="ppeType" control={form.control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger><SelectContent><SelectItem value="Coverall">Coverall</SelectItem><SelectItem value="Safety Shoes">Safety Shoes</SelectItem></SelectContent></Select> )}/>
                    {form.formState.errors.ppeType && <p className="text-xs text-destructive">{form.formState.errors.ppeType.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label>Size</Label>
                    <Input {...form.register('size')} />
                    {form.formState.errors.size && <p className="text-xs text-destructive">{form.formState.errors.size.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" {...form.register('quantity')} />
                    {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
                </div>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="space-y-2">
                    <Label>Request Type</Label>
                    <Controller name="requestType" control={form.control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="Replacement">Replacement</SelectItem></SelectContent></Select> )}/>
                </div>
                <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <Controller name="issueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                    {form.formState.errors.issueDate && <p className="text-xs text-destructive">{form.formState.errors.issueDate.message}</p>}
                </div>
            </div>
             <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea {...form.register('remarks')} rows={2} />
            </div>
            <div className="flex justify-end">
                <Button type="button" onClick={form.handleSubmit(handleAddRecord)}>Add Record</Button>
            </div>
        </div>
    );
};


const documentSchema = z.object({
  name: z.string(),
  details: z.string().optional(),
  status: z.enum(['Pending', 'Collected', 'Submitted', 'Received']),
});

const skillSchema = z.object({
    name: z.string().min(1, "Skill name is required"),
    details: z.string().optional(),
    link: z.string().url().optional().or(z.literal('')),
    validity: z.date().optional(),
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
  trade: z.string().min(1, 'Trade is required'),
  otherTrade: z.string().optional(),
  status: z.enum(['Working', 'On Leave', 'Resigned', 'Terminated', 'Left the Project']),
  mobileNumber: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dob: z.date().optional(),
  aadharNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  coverallSize: z.string().optional(),
  shoeSize: z.string().optional(),
  workOrderNumber: z.string().optional(),
  labourLicenseNo: z.string().optional(),
  eic: z.string().optional(),
  joiningDate: z.date().optional(),
  passIssueDate: z.date().optional(),
  workOrderExpiryDate: z.date().optional(),
  labourLicenseExpiryDate: z.date().optional(),
  wcPolicyNumber: z.string().optional(),
  wcPolicyExpiryDate: z.date().optional(),
  medicalExpiryDate: z.date().optional(),
  safetyExpiryDate: z.date().optional(),
  irataValidity: z.date().optional(),
  firstAidExpiryDate: z.date().optional(),
  cardCategory: z.string().optional(),
  cardType: z.string().optional(),
  epNumber: z.string().optional(),
  documents: z.array(documentSchema).optional(),
  skills: z.array(skillSchema).optional(),
  resignationDate: z.date().optional(),
  terminationDate: z.date().optional(),
  feedback: z.string().optional(),
  currentLeave: leaveSchema.optional(),
  leaveHistory: z.array(z.any()).optional(), // Use `any` for display, not form validation
  ppeHistory: z.array(z.any()).optional(),
}).superRefine((data, ctx) => {
    if (data.trade === 'Others' && !data.otherTrade) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please specify the trade',
            path: ['otherTrade'],
        });
    }
    const isTerminalStatus = ['Terminated', 'Resigned', 'Left the Project'].includes(data.status);
    if (data.status === 'On Leave' && !isTerminalStatus) {
        const hasActiveLeave = data.leaveHistory?.some(l => !l.rejoinedDate && !l.leaveEndDate);
        if (!hasActiveLeave && !data.currentLeave?.dateRange.from) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Leave dates are required when setting status to On Leave.',
                path: ['currentLeave.dateRange'],
            });
        }
    }
    if (data.trade === 'RA Level 3' && !data.firstAidExpiryDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'First Aid Expiry Date is mandatory for RA Level 3.',
            path: ['firstAidExpiryDate'],
        });
    }
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
        render={({ field }) => (
            <DatePickerInput
                value={field.value ? new Date(field.value) : undefined}
                onChange={field.onChange}
                disabled={disabled}
            />
        )}
      />
    );
};

const getInitialDocs = (profileData?: ManpowerProfile) => {
    const baseDocs = [...MANDATORY_DOCS, 'Skill Certificate', 'First Aid Certificate'];
    if (!profileData) {
      return baseDocs.map(name => ({ name, status: 'Pending' as DocumentStatus, details: '' }));
    }
    const profileDocsMap = new Map((profileData.documents || []).map(doc => [doc.name, doc]));
    const initialDocs: ManpowerDocument[] = baseDocs.map(docName => 
      profileDocsMap.get(docName) || { name: docName, status: 'Pending', details: '' }
    );
    (profileData.documents || []).forEach(doc => {
      if (!initialDocs.some(d => d.name === doc.name)) {
        initialDocs.push(doc);
      }
    });
    return initialDocs;
};

export default function ManpowerProfileDialog({ isOpen, setIsOpen, profile }: ManpowerProfileDialogProps) {
  const { user, users, addManpowerProfile, updateManpowerProfile, deleteLeaveRecord, manpowerProfiles, deleteMemoRecord, updateMemoRecord, deletePpeHistoryRecord, updatePpeHistoryRecord } = useAppContext();
  const { toast } = useToast();
  const [editingMemo, setEditingMemo] = useState<MemoRecord | null>(null);
  const [editingPpeRecord, setEditingPpeRecord] = useState<PpeHistoryRecord | null>(null);

  const canAddPpe = useMemo(() => {
    if (!user) return false;
    const allowedRoles: Role[] = ['Admin', 'Document Controller', 'Store in Charge', 'Assistant Store Incharge'];
    return allowedRoles.includes(user.role);
  }, [user]);

  const parseDate = (dateString?: string): Date | undefined => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    return isValid(date) ? date : undefined;
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });
  
  const { fields: documentFields, append: appendDocument, remove: removeDocument } = useFieldArray({
    control: form.control,
    name: "documents"
  });

  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({
    control: form.control,
    name: "skills"
  });
  
  const watchTrade = form.watch('trade');
  const watchStatus = form.watch('status');

  const liveProfile = useMemo(() => {
    return profile ? manpowerProfiles.find(p => p.id === profile.id) || profile : null;
  }, [manpowerProfiles, profile]);

  const ppeHistoryArray = useMemo(() => {
    if (!liveProfile?.ppeHistory) return [];
    return Array.isArray(liveProfile.ppeHistory) ? liveProfile.ppeHistory : Object.values(liveProfile.ppeHistory);
  }, [liveProfile]);

  useEffect(() => {
    if (isOpen) {
        const defaultValues = liveProfile ? {
            ...liveProfile,
            dob: parseDate(liveProfile.dob),
            joiningDate: parseDate(liveProfile.joiningDate),
            passIssueDate: parseDate(liveProfile.passIssueDate),
            workOrderExpiryDate: parseDate(liveProfile.workOrderExpiryDate),
            labourLicenseExpiryDate: parseDate(liveProfile.labourLicenseExpiryDate),
            wcPolicyExpiryDate: parseDate(liveProfile.wcPolicyExpiryDate),
            medicalExpiryDate: parseDate(liveProfile.medicalExpiryDate),
            safetyExpiryDate: parseDate(liveProfile.safetyExpiryDate),
            irataValidity: parseDate(liveProfile.irataValidity),
            firstAidExpiryDate: parseDate(liveProfile.firstAidExpiryDate),
            resignationDate: parseDate(liveProfile.resignationDate),
            terminationDate: parseDate(liveProfile.terminationDate),
            documents: getInitialDocs(liveProfile),
            skills: (liveProfile.skills || []).map(skill => ({...skill, validity: parseDate(skill.validity)})),
            trade: TRADES.includes(liveProfile.trade) ? liveProfile.trade : 'Others',
            otherTrade: TRADES.includes(liveProfile.trade) ? '' : liveProfile.trade,
            leaveHistory: liveProfile.leaveHistory || [],
        } : {
            documents: getInitialDocs(), 
            skills: [], 
            status: 'Working' as const, 
            documentFolderUrl: '',
            leaveHistory: [],
            memoHistory: [],
            ppeHistory: {},
        };
        form.reset(defaultValues as any);
    }
  }, [isOpen, liveProfile, form]);

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
    const currentProfile = liveProfile;
    let finalLeaveHistory = currentProfile?.leaveHistory ? [...currentProfile.leaveHistory] : [];
    
    const originalStatus = currentProfile?.status;
    const newStatus = data.status;

    if (originalStatus === 'On Leave' && ['Terminated', 'Resigned', 'Left the Project'].includes(newStatus)) {
        const activeLeaveIndex = finalLeaveHistory.findIndex(l => !l.rejoinedDate && !l.leaveEndDate);
        if (activeLeaveIndex > -1) {
            const endDate = data.terminationDate || data.resignationDate;
            if (endDate) {
                finalLeaveHistory[activeLeaveIndex].leaveEndDate = endDate.toISOString();
            }
        }
    } else if (newStatus === 'On Leave') {
        const hasActiveLeave = finalLeaveHistory.some(l => !l.rejoinedDate && !l.leaveEndDate);
        if (!hasActiveLeave && data.currentLeave?.dateRange.from) {
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
    }
  
    const dataToSubmit: any = { ...data, trade: finalTrade, leaveHistory: finalLeaveHistory };
    delete dataToSubmit.otherTrade;
    delete dataToSubmit.currentLeave;

    // Clean up undefined values and convert dates before submitting
    const cleanedData = Object.fromEntries(
        Object.entries(dataToSubmit).map(([key, value]) => {
            if (value instanceof Date) {
                return [key, value.toISOString()];
            }
            if (value === undefined) {
                return [key, null]; // Convert undefined to null for Firebase
            }
            if (key === 'skills' && Array.isArray(value)) {
                return [key, value.map(skill => ({
                    ...skill,
                    validity: skill.validity instanceof Date ? skill.validity.toISOString() : skill.validity,
                }))];
            }
            return [key, value];
        })
    );
  
    if (profile) {
      updateManpowerProfile({ ...profile, ...cleanedData } as ManpowerProfile);
      toast({ title: 'Profile Updated' });
    } else {
      addManpowerProfile(cleanedData as Omit<ManpowerProfile, 'id'>);
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

  const handleDeleteMemo = (memoId: string) => {
    if (profile) {
        deleteMemoRecord(profile.id, memoId);
        toast({ variant: 'destructive', title: 'Record Deleted' });
    }
  };

  const handleDeletePpe = (recordId: string) => {
    if(profile) {
      deletePpeHistoryRecord(profile.id, recordId);
      toast({ variant: 'destructive', title: 'PPE Record Deleted' });
    }
  };

  const handleEditMemo = (memo: MemoRecord) => {
      setEditingMemo(memo);
  };
  
  const handleEditPpe = (record: PpeHistoryRecord) => {
      setEditingPpeRecord(record);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-full max-h-[95vh] flex flex-col">
          <DialogHeader><DialogTitle>{profile ? `Edit Profile: ${profile.name}` : 'Add New Manpower Profile'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 py-4">
                    
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
                             {form.formState.errors.trade && <p className="text-xs text-destructive">{form.formState.errors.trade.message}</p>}
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
                        <div className="grid grid-cols-2 gap-2">
                           <div><Label>Coverall Size</Label><Input {...form.register('coverallSize')} /></div>
                           <div><Label>Safety Shoe Size</Label><Input {...form.register('shoeSize')} /></div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Contract & Policy Details</h3>
                        <div><Label>Work Order Number</Label><Input {...form.register('workOrderNumber')} /></div>
                        <div><Label>Labour License No</Label><Input {...form.register('labourLicenseNo')} /></div>
                        <div><Label>EIC</Label><Input {...form.register('eic')} /></div>
                        <div><Label>EP Number</Label><Input {...form.register('epNumber')} /></div>
                        <Separator className="my-4" />
                        <div><Label>Joining Date</Label><DatePickerController name="joiningDate" control={form.control} /></div>
                        <div><Label>Pass Issue Date</Label><DatePickerController name="passIssueDate" control={form.control} /></div>
                        <div><Label>Work Order Expiry Date</Label><DatePickerController name="workOrderExpiryDate" control={form.control} /></div>
                        <div><Label>Labour License Expiry Date</Label><DatePickerController name="labourLicenseExpiryDate" control={form.control} /></div>
                        <Separator className="my-4" />
                        <div><Label>WC Policy Number</Label><Input {...form.register('wcPolicyNumber')} /></div>
                        <div><Label>WC Policy Expiry Date</Label><DatePickerController name="wcPolicyExpiryDate" control={form.control} /></div>
                        <div><Label>Medical Expiry Date</Label><DatePickerController name="medicalExpiryDate" control={form.control} /></div>
                        <div><Label>Safety Expiry Date</Label><DatePickerController name="safetyExpiryDate" control={form.control} /></div>

                        {RA_TRADES.includes(watchTrade) && (
                            <>
                                <div><Label>IRATA Expiry Date</Label><DatePickerController name="irataValidity" control={form.control} /></div>
                                <div><Label>First Aid Certificate Expiry Date</Label><DatePickerController name="firstAidExpiryDate" control={form.control} />{form.formState.errors.firstAidExpiryDate && <p className="text-xs text-destructive">{form.formState.errors.firstAidExpiryDate.message}</p>}</div>
                            </>
                        )}
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

                    <div className="space-y-4 md:col-span-3">
                       <Separator />
                       <h3 className="text-lg font-semibold border-b pb-2">Skills</h3>
                       {skillFields.map((field, index) => (
                           <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-2 border rounded-md">
                               <div className="md:col-span-3"><Label>Skill Name</Label><Input {...form.register(`skills.${index}.name`)} /></div>
                               <div className="md:col-span-3"><Label>Details (Cert No.)</Label><Input {...form.register(`skills.${index}.details`)} /></div>
                               <div className="md:col-span-3"><Label>Link (Optional)</Label><Input {...form.register(`skills.${index}.link`)} /></div>
                               <div className="md:col-span-2"><Label>Validity</Label><DatePickerController name={`skills.${index}.validity`} control={form.control} /></div>
                               <div className="md:col-span-1 flex items-end"><Button type="button" variant="ghost" size="icon" onClick={() => removeSkill(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>
                           </div>
                       ))}
                       <Button type="button" variant="outline" size="sm" onClick={() => appendSkill({ name: '', details: '', link: ''})}><PlusCircle className="mr-2 h-4 w-4"/>Add Skill</Button>
                    </div>

                    {(watchStatus === 'Resigned' || watchStatus === 'Terminated' || watchStatus === 'Left the Project') && (
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
                            {form.formState.errors.currentLeave?.dateRange && <p className="text-xs text-destructive">{form.formState.errors.currentLeave.dateRange.message}</p>}
                        </div>
                    )}
                    {profile && (
                        <div className="space-y-4 md:col-span-3">
                          <Separator />
                          <h3 className="text-lg font-semibold border-b pb-2">PPE Issue History</h3>
                          {ppeHistoryArray.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Size</TableHead>
                                  <TableHead>Qty</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Req Type</TableHead>
                                  {user?.role === 'Admin' && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {ppeHistoryArray.map((item, index) => (
                                  <TableRow key={`${item.id}-${index}`}>
                                    <TableCell>{item.ppeType}</TableCell>
                                    <TableCell>{item.size}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{format(new Date(item.issueDate), 'dd-MM-yyyy')}</TableCell>
                                    <TableCell>{item.requestType}</TableCell>
                                    {user?.role === 'Admin' && (
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditPpe(item)}><Edit className="h-4 w-4"/></Button>
                                                <AlertDialogTrigger asChild>
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Delete PPE Record?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this issue record. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeletePpe(item.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : <p className="text-sm text-muted-foreground">No PPE history.</p>}
                          {canAddPpe && <PpeHistoryForm profile={profile} />}
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
                                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-4 w-4"/></Button>
                                                        <AlertDialogTrigger asChild>
                                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4"/></Button>
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
                    {(liveProfile?.memoHistory || []).length > 0 && (
                        <div className="space-y-4 md:col-span-3">
                            <Separator />
                            <h3 className="text-lg font-semibold border-b pb-2">Memo & Warning History</h3>
                             <Table>
                                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead>Issued By</TableHead>{user?.role === 'Admin' && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
                                <TableBody>
                                    {liveProfile?.memoHistory?.map(memo => (
                                        <TableRow key={memo.id}>
                                            <TableCell><Badge variant={memo.type === 'Warning Letter' ? 'destructive' : 'secondary'}>{memo.type}</Badge></TableCell>
                                            <TableCell>{format(new Date(memo.date), 'dd-MM-yyyy')}</TableCell>
                                            <TableCell className="max-w-xs whitespace-pre-wrap">{memo.reason}</TableCell>
                                            <TableCell>{memo.issuedBy || 'N/A'}</TableCell>
                                             {user?.role === 'Admin' && (
                                                <TableCell className="text-right">
                                                    <AlertDialog>
                                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditMemo(memo)}><Edit className="h-4 w-4"/></Button>
                                                        <AlertDialogTrigger asChild>
                                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete this record. This cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteMemo(memo.id)}>Delete</AlertDialogAction>
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
            <DialogFooter className="mt-auto pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">{profile ? 'Save Changes' : 'Add Profile'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {editingMemo && profile && (
        <EditMemoDialog 
            isOpen={!!editingMemo} 
            setIsOpen={() => setEditingMemo(null)} 
            memo={editingMemo}
            profile={profile}
        />
    )}
    {editingPpeRecord && profile && (
        <EditPpeHistoryDialog
            isOpen={!!editingPpeRecord}
            setIsOpen={() => setEditingPpeRecord(null)}
            record={editingPpeRecord}
            profile={profile}
        />
    )}
    </>
  );
}
