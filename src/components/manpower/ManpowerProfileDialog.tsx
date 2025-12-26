
'use client';
import { useEffect, useMemo, useState, useRef, MouseEvent } from 'react';
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
import type { ManpowerProfile, Trade, LeaveRecord, ManpowerDocument, DocumentStatus, Skill, MemoRecord, Role, PpeHistoryRecord, EpNumberRecord } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Trash2, Edit, PlusCircle, FileWarning, Shirt, AlertCircle, Info, Paperclip, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { Separator } from '../ui/separator';
import { format, parse, isValid, startOfDay, parseISO, isBefore, isPast } from 'date-fns';
import { TRADES, MANDATORY_DOCS, RA_TRADES } from '@/lib/mock-data';
import { DatePickerInput } from '../ui/date-picker-input';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';
import EditMemoDialog from './EditMemoDialog';
import EditPpeHistoryDialog from './EditPpeHistoryDialog';
import AddPpeHistoryDialog from './AddPpeHistoryDialog';
import { rtdb } from '@/lib/rtdb';
import { ref, push, set } from 'firebase/database';
import { Switch } from '../ui/switch';
import { Alert } from '../ui/alert';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';


const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  hardCopyFileNo: z.string().optional(),
  documentFolderUrl: z.string().url().optional().or(z.literal('')),
  trade: z.string().min(1, 'Trade is required'),
  otherTrade: z.string().optional(),
  status: z.enum(['Working', 'On Leave', 'Resigned', 'Terminated', 'Left the Project']),
  mobileNumber: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dob: z.date().optional().nullable(),
  aadharNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  coverallSize: z.string().optional(),
  shoeSize: z.string().optional(),
  workOrderNumber: z.string().optional(),
  labourLicenseNo: z.string().optional(),
  eic: z.string().optional(),
  joiningDate: z.date().optional().nullable(),
  passIssueDate: z.date().optional().nullable(),
  workOrderExpiryDate: z.date().optional().nullable(),
  labourLicenseExpiryDate: z.date().optional().nullable(),
  wcPolicyNumber: z.string().optional(),
  wcPolicyExpiryDate: z.date().optional().nullable(),
  medicalExpiryDate: z.date().optional().nullable(),
  safetyExpiryDate: z.date().optional().nullable(),
  irataValidity: z.date().optional().nullable(),
  firstAidExpiryDate: z.date().optional().nullable(),
  cardCategory: z.string().optional(),
  cardType: z.string().optional(),
  epNumber: z.string().optional(),
  newEpNumber: z.string().optional(),
  documents: z.array(z.object({ name: z.string(), details: z.string().optional(), status: z.enum(['Pending', 'Collected', 'Submitted', 'Received']) })).optional(),
  skills: z.array(z.object({ name: z.string().min(1, "Skill name is required"), details: z.string().optional(), link: z.string().url().optional().or(z.literal('')), validity: z.date().optional().nullable() })).optional(),
  resignationDate: z.date().optional().nullable(),
  terminationDate: z.date().optional().nullable(),
  feedback: z.string().optional(),
  currentLeave: z.object({ id: z.string(), leaveType: z.enum(['Annual', 'Emergency']), leaveStartDate: z.date(), plannedEndDate: z.date().optional(), rejoinedDate: z.date().optional(), remarks: z.string().optional() }).optional(),
  leaveHistory: z.any().optional(),
  memoHistory: z.array(z.any()).optional(),
  ppeHistory: z.array(z.any()).optional(),
  epNumberHistory: z.array(z.any()).optional(),
  logbook: z.any().optional(),
}).superRefine((data, ctx) => {
    if (data.trade === 'Others' && !data.otherTrade) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please specify the trade',
            path: ['otherTrade'],
        });
    }

    // This validation should only run when the user is trying to set the status to 'On Leave' for the first time for this profile.
    const history = data.leaveHistory || {};
    const historyArray = Array.isArray(history) ? history : Object.values(history);
    const hasActiveLeave = historyArray.some((l: any) => l && !l.rejoinedDate && !l.leaveEndDate);

    if (data.status === 'On Leave' && !hasActiveLeave && !data.currentLeave?.leaveStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date is required when setting status to 'On Leave'.",
        path: ['currentLeave.leaveStartDate'],
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
    const baseDocs = [...MANDATORY_DOCS].filter(doc => doc !== 'First Aid Certificate');
    if (profileData?.trade === 'RA Level 3') {
        baseDocs.push('First Aid Certificate');
    }

    const profileDocsMap = new Map((Array.isArray(profileData?.documents) ? profileData?.documents : []).map(doc => [doc.name, doc]));
    const initialDocs: ManpowerDocument[] = baseDocs.map(docName => 
      profileDocsMap.get(docName) || { name: docName, status: 'Pending', details: '' }
    );
    (Array.isArray(profileData?.documents) ? profileData?.documents : []).forEach(doc => {
      if (!initialDocs.some(d => d.name === doc.name)) {
        initialDocs.push(doc);
      }
    });
    return initialDocs;
};

export default function ManpowerProfileDialog({ isOpen, setIsOpen, profile }: ManpowerProfileDialogProps) {
  const { user, users, addManpowerProfile, updateManpowerProfile, deleteLeaveRecord, manpowerProfiles, deleteMemoRecord, updateMemoRecord, deletePpeHistoryRecord, deleteLogbookRecord } = useAppContext();
  const { toast } = useToast();
  const [editingMemo, setEditingMemo] = useState<MemoRecord | null>(null);
  const [editingPpeRecord, setEditingPpeRecord] = useState<PpeHistoryRecord | null>(null);
  const [isAddPpeOpen, setIsAddPpeOpen] = useState(false);
  const [isChangingEp, setIsChangingEp] = useState(false);
  const [similarProfile, setSimilarProfile] = useState<ManpowerProfile | null>(null);
  const [viewingAttachmentUrl, setViewingAttachmentUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const canAddPpe = useMemo(() => {
    if (!user) return false;
    const allowedRoles: Role[] = ['Admin', 'Document Controller', 'Store in Charge', 'Assistant Store Incharge'];
    return allowedRoles.includes(user.role);
  }, [user]);

  const canDeleteLogbook = useMemo(() => {
    if (!user) return false;
    return ['Admin', 'Project Coordinator', 'Document Controller'].includes(user.role);
  }, [user]);

  const parseDate = (dateString?: string | null): Date | undefined => {
    if (!dateString) return undefined;
    const date = parseISO(dateString);
    if (isValid(date)) return date;
    return undefined;
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
  const watchName = form.watch('name');

  useEffect(() => {
    if (!profile && watchName && watchName.length > 2) {
      const found = manpowerProfiles.find(p => p.name.toLowerCase().includes(watchName.toLowerCase()));
      setSimilarProfile(found || null);
    } else {
      setSimilarProfile(null);
    }
  }, [watchName, profile, manpowerProfiles]);

  const liveProfile = useMemo(() => {
    return profile ? manpowerProfiles.find(p => p.id === profile.id) || profile : null;
  }, [manpowerProfiles, profile]);

  const ppeHistoryArray = useMemo(() => {
    if (!liveProfile?.ppeHistory) return [];
    const history = Array.isArray(liveProfile.ppeHistory) ? liveProfile.ppeHistory : Object.values(liveProfile.ppeHistory);
    return history.sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [liveProfile]);

  useEffect(() => {
    if (isOpen) {
        setIsChangingEp(false);
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
            skills: (Array.isArray(liveProfile.skills) ? liveProfile.skills : []).map(skill => ({...skill, validity: parseDate(skill.validity)})),
            trade: TRADES.includes(liveProfile.trade) ? liveProfile.trade : 'Others',
            otherTrade: TRADES.includes(liveProfile.trade) ? '' : liveProfile.trade,
            leaveHistory: liveProfile.leaveHistory || {},
            memoHistory: Array.isArray(liveProfile.memoHistory) ? liveProfile.memoHistory : [],
            ppeHistory: Array.isArray(liveProfile.ppeHistory) ? liveProfile.ppeHistory : [],
            epNumberHistory: Array.isArray(liveProfile.epNumberHistory) ? liveProfile.epNumberHistory : [],
        } : {
            documents: getInitialDocs(), 
            skills: [], 
            status: 'Working' as const, 
            documentFolderUrl: '',
            leaveHistory: {},
            memoHistory: [],
            ppeHistory: [],
            epNumberHistory: [],
        };
        form.reset(defaultValues as any);
        if (defaultValues.otherTrade) {
            form.setValue('otherTrade', defaultValues.otherTrade);
        }
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
  
    const onSubmit = async (data: ProfileFormValues) => {
        if (!user) return;
        try {
            const dataToSubmit: { [key: string]: any } = { ...data };

            if (data.trade === 'Others' && data.otherTrade) {
                dataToSubmit.trade = data.otherTrade.trim();
            }
            delete dataToSubmit.otherTrade;

            let epHistory = liveProfile?.epNumberHistory ? (Array.isArray(liveProfile.epNumberHistory) ? [...liveProfile.epNumberHistory] : [...Object.values(liveProfile.epNumberHistory)]) : [];
            
            if (isChangingEp && data.newEpNumber && data.newEpNumber.trim() !== '') {
                const oldEpNumber = liveProfile?.epNumber;
                if (oldEpNumber) {
                    epHistory.push({ epNumber: oldEpNumber, date: new Date().toISOString() });
                }
                dataToSubmit.epNumber = data.newEpNumber;
            } else if (!profile && data.epNumber && data.epNumber.trim() !== '') { // Adding for the first time on a new profile
                dataToSubmit.epNumber = data.epNumber;
            }
            dataToSubmit.epNumberHistory = epHistory;
            delete dataToSubmit.newEpNumber;

            // Preserve existing leave history
            dataToSubmit.leaveHistory = liveProfile?.leaveHistory || {};

            const hasActiveLeave = liveProfile?.leaveHistory ? Object.values(liveProfile.leaveHistory).some((l: any) => l && !l.rejoinedDate && !l.leaveEndDate) : false;

            if (data.status === 'On Leave' && !hasActiveLeave && data.currentLeave?.leaveStartDate) {
                const newLeaveRef = push(ref(rtdb, `manpowerProfiles/${profile!.id}/leaveHistory`));
                const leaveRecord: Omit<LeaveRecord, 'id'> = {
                    leaveType: data.currentLeave.leaveType,
                    leaveStartDate: data.currentLeave.leaveStartDate.toISOString(),
                    plannedEndDate: data.currentLeave.plannedEndDate?.toISOString(),
                    remarks: data.currentLeave.remarks,
                };
                if (!dataToSubmit.leaveHistory) dataToSubmit.leaveHistory = {};
                dataToSubmit.leaveHistory[newLeaveRef.key!] = { ...leaveRecord, id: newLeaveRef.key };
            }
            
            delete dataToSubmit.currentLeave;

            const dateFields: (keyof ProfileFormValues)[] = [
                'dob', 'joiningDate', 'passIssueDate', 'workOrderExpiryDate', 'labourLicenseExpiryDate',
                'wcPolicyExpiryDate', 'medicalExpiryDate', 'safetyExpiryDate', 'irataValidity',
                'firstAidExpiryDate', 'resignationDate', 'terminationDate'
            ];

            dateFields.forEach(field => {
                const dateValue = data[field as keyof typeof data];
                dataToSubmit[field] = dateValue instanceof Date ? dateValue.toISOString() : null;
            });

            if (data.skills) {
                dataToSubmit.skills = data.skills.map(skill => ({
                    ...skill,
                    validity: skill.validity instanceof Date ? skill.validity.toISOString() : null,
                }));
            }

            const sanitizedData = JSON.parse(JSON.stringify(dataToSubmit, (key, value) => {
                return value === undefined ? null : value;
            }));

            if (profile) {
                await updateManpowerProfile({ ...profile, ...sanitizedData } as ManpowerProfile);
                toast({ title: 'Profile Updated' });
            } else {
                await addManpowerProfile(sanitizedData as Omit<ManpowerProfile, 'id'>);
                toast({ title: 'Profile Added' });
            }
            setIsOpen(false);
        } catch (err) {
            console.error("Save failed:", err);
            toast({ variant: 'destructive', title: 'Failed to save profile', description: (err as Error).message });
        }
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

  const handleEditMemo = (memo: MemoRecord) => {
      setEditingMemo(memo);
  };
  
  const handleEditPpe = (record: PpeHistoryRecord) => {
      setEditingPpeRecord(record);
  };

  const handleDeletePpe = (recordId: string) => {
    if(profile) {
      deletePpeHistoryRecord(profile.id, recordId);
      toast({ variant: 'destructive', title: 'PPE Record Deleted' });
    }
  };

  const handleDeleteLogbook = (profileId: string) => {
    deleteLogbookRecord(profileId, () => {
        form.reset({
            ...form.getValues(),
            logbook: undefined
        });
        toast({ title: 'Logbook record cleared.' });
    });
  };

    const epNumberTimeline = useMemo(() => {
        if (!liveProfile) return [];

        const history: EpNumberRecord[] = liveProfile.epNumberHistory ? (Array.isArray(liveProfile.epNumberHistory) ? liveProfile.epNumberHistory : Object.values(liveProfile.epNumberHistory)) : [];
        const sortedHistory = [...history].sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

        const timeline: { epNumber: string, since: string, till: string | null }[] = [];

        // Add current EP number
        const lastChangeDate = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1].date : liveProfile.joiningDate;
        if (liveProfile.epNumber) {
            timeline.push({
                epNumber: liveProfile.epNumber,
                since: lastChangeDate || liveProfile.joiningDate || new Date().toISOString(),
                till: null // Current number has no 'till' date
            });
        }
        
        // Add historical EP numbers
        for (let i = sortedHistory.length - 1; i >= 0; i--) {
            const currentRecord = sortedHistory[i];
            const previousRecord = sortedHistory[i-1];
            timeline.push({
                epNumber: currentRecord.epNumber,
                since: previousRecord ? previousRecord.date : (liveProfile.joiningDate || currentRecord.date),
                till: currentRecord.date
            });
        }

        return timeline;
    }, [liveProfile]);
    
    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsPanning(true);
        setStartPosition({
            x: e.clientX - translate.x,
            y: e.clientY - translate.y,
        });
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isPanning || !imageContainerRef.current) return;
        e.preventDefault();
        const x = e.clientX - startPosition.x;
        const y = e.clientY - startPosition.y;
        setTranslate({ x, y });
    };
    
    const handleMouseUpOrLeave = () => {
        setIsPanning(false);
    };

    const isPdf = viewingAttachmentUrl && viewingAttachmentUrl.toLowerCase().endsWith('.pdf');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-full max-h-[95vh] flex flex-col">
          <DialogHeader><DialogTitle>{profile ? `Edit Profile: ${profile.name}` : 'Add New Manpower Profile'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.log("Form validation errors:", errors))} className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4 -mr-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 py-4">
                  
                  <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b pb-2">Personal & Work Details</h3>
                      <div><Label>Full Name</Label><Input {...form.register('name')} />{form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}</div>
                      {similarProfile && (
                          <Alert variant="destructive">
                              <Info className="h-4 w-4" />
                              <p className="text-xs">A profile with a similar name already exists: <strong>{similarProfile.name}</strong> (EP No: {similarProfile.epNumber || 'N/A'}). Please review before creating a duplicate.</p>
                          </Alert>
                      )}
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
                      <div><Label>Emergency Contact Number</Label><Input {...form.register('emergencyContactNumber')} /></div>
                      <div><Label>Relationship</Label><Input {...form.register('emergencyContactRelation')} /></div>
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
                      <div className="space-y-2">
                          <Label>EP Number</Label>
                           <Input {...form.register('epNumber')} disabled={!!profile && !isChangingEp} />
                            {profile && (
                                <div className="flex items-center space-x-2">
                                    <Switch id="change-ep" checked={isChangingEp} onCheckedChange={setIsChangingEp} />
                                    <Label htmlFor="change-ep" className="text-xs">Change EP Number</Label>
                                </div>
                            )}
                            {isChangingEp && (
                                <div>
                                    <Label>New EP Number</Label>
                                    <Input {...form.register('newEpNumber')} />
                                </div>
                            )}
                      </div>
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
                      {epNumberTimeline.length > 0 && (
                        <div className="space-y-2 pt-4">
                            <h4 className="text-sm font-semibold">EP Number History</h4>
                            <div className="space-y-1 text-xs text-muted-foreground p-2 border rounded-md max-h-24 overflow-y-auto">
                            {epNumberTimeline.map((record, index) => (
                                <p key={index}>
                                <strong>{record.epNumber}</strong> (since {format(parseISO(record.since), 'dd MMM yyyy')}
                                {record.till ? ` till ${format(parseISO(record.till), 'dd MMM yyyy')}` : ''})
                                </p>
                            ))}
                            </div>
                        </div>
                        )}
                  </div>
                  
                  {profile && (
                    <div className="space-y-4">
                        <Separator />
                        <h3 className="text-lg font-semibold border-b pb-2">Logbook Status</h3>
                        {liveProfile?.logbook ? (
                            <div className="text-sm space-y-2 p-2 border rounded-md bg-muted/20 relative">
                                {canDeleteLogbook && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Clear Logbook Record?</AlertDialogTitle><AlertDialogDescription>This will permanently clear the current logbook status, out date, and remarks for this employee. Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteLogbook(profile.id)}>Clear Record</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                                <div><strong>Status:</strong> <Badge variant={profile.logbook?.status === 'Received' ? 'success' : (profile.logbook?.status === 'Not Received' || profile.logbook?.status === 'Sent back as requested' ? 'destructive' : 'secondary')}>{profile.logbook?.status || 'Pending'}</Badge></div>
                                {profile.logbook?.outDate && <div><strong>Out Date:</strong> {format(parseISO(profile.logbook.outDate), 'dd MMM, yyyy')}</div>}
                                {profile.logbook?.inDate && <div><strong>In Date:</strong> {format(parseISO(profile.logbook.inDate), 'dd MMM, yyyy')}</div>}
                                {profile.logbook?.remarks && <p className="whitespace-pre-wrap"><strong>Remarks:</strong> {profile.logbook.remarks}</p>}
                            </div>
                        ) : (
                             <p className="text-sm text-muted-foreground p-2">No logbook activity recorded.</p>
                        )}
                    </div>
                  )}

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
                             <div><Label>Leave Period</Label><Controller name="currentLeave.leaveStartDate" control={form.control} render={({ field }) => (<DatePickerInput value={field.value} onChange={field.onChange}/>)}/></div>
                             <div><Label>Actual Rejoining Date</Label><DatePickerController name="currentLeave.rejoinedDate" control={form.control}/></div>
                             <div className="col-span-3"><Label>Remarks</Label><Textarea {...form.register('currentLeave.remarks')}/></div>
                          </div>
                          {form.formState.errors.currentLeave?.leaveStartDate && <p className="text-xs text-destructive">{form.formState.errors.currentLeave.leaveStartDate.message}</p>}
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
                        {canAddPpe && <Button type="button" onClick={() => setIsAddPpeOpen(true)} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" /> Add PPE History</Button>}
                      </div>
                    )}
                   {(Array.isArray(liveProfile?.leaveHistory) ? liveProfile.leaveHistory : (liveProfile?.leaveHistory ? Object.values(liveProfile.leaveHistory) : [])).length > 0 && (
                      <div className="space-y-4 md:col-span-3">
                          <Separator />
                          <h3 className="text-lg font-semibold border-b pb-2">Leave History</h3>
                          <Table>
                              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Rejoined</TableHead>{user?.role === 'Admin' && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
                              <TableBody>
                                  {(Array.isArray(liveProfile?.leaveHistory) ? liveProfile.leaveHistory : (liveProfile?.leaveHistory ? Object.values(liveProfile.leaveHistory) : [])).map((leave, index) => (
                                      <TableRow key={`${leave.id}-${index}`}>
                                          <TableCell>{leave.leaveType || 'N/A'}</TableCell>
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
                  {(Array.isArray(liveProfile?.memoHistory) ? liveProfile.memoHistory : (liveProfile?.memoHistory ? Object.values(liveProfile.memoHistory) : [])).length > 0 && (
                      <div className="space-y-4 md:col-span-3">
                          <Separator />
                          <h3 className="text-lg font-semibold border-b pb-2">Memo & Warning History</h3>
                           <Table>
                              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead>Issued By</TableHead>{user?.role === 'Admin' && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
                              <TableBody>
                                  {(Array.isArray(liveProfile?.memoHistory) ? liveProfile.memoHistory : (liveProfile?.memoHistory ? Object.values(liveProfile.memoHistory) : [])).map((memo, index) => (
                                      <TableRow key={`${memo.id}-${index}`}>
                                          <TableCell><Badge variant={memo.type === 'Warning Letter' ? 'destructive' : 'secondary'}>{memo.type}</Badge></TableCell>
                                          <TableCell>{format(new Date(memo.date), 'dd-MM-yyyy')}</TableCell>
                                          <TableCell className="max-w-xs truncate">{memo.reason}</TableCell>
                                          <TableCell>
                                            <div className='flex flex-col'>
                                                <span>{memo.issuedBy || 'N/A'}</span>
                                                {memo.attachmentUrl && (
                                                    <Button type="button" variant="link" size="sm" className="p-0 h-auto text-xs justify-start" onClick={() => setViewingAttachmentUrl(memo.attachmentUrl!)}>
                                                        <Paperclip className="h-3 w-3 mr-1"/>View Attachment
                                                    </Button>
                                                )}
                                            </div>
                                          </TableCell>
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
      {isAddPpeOpen && profile && (
          <AddPpeHistoryDialog
              isOpen={isAddPpeOpen}
              setIsOpen={setIsAddPpeOpen}
              profile={profile}
          />
      )}
      {viewingAttachmentUrl && (
        <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => { setViewingAttachmentUrl(null); setZoom(1); setTranslate({x: 0, y: 0}); }}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Attachment Viewer</DialogTitle>
                    <div className="flex items-center gap-2">
                        {!isPdf && (
                            <>
                                <Button variant="outline" size="icon" onClick={() => setZoom(z => z + 0.2)}><ZoomIn className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut className="h-4 w-4" /></Button>
                            </>
                        )}
                        <a href={viewingAttachmentUrl} download target="_blank" rel="noopener noreferrer">
                            <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Download</Button>
                        </a>
                    </div>
                </DialogHeader>
                 <div 
                  ref={imageContainerRef}
                  className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/50 rounded-md"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                >
                    {isPdf ? (
                        <object data={viewingAttachmentUrl} type="application/pdf" width="100%" height="100%">
                            <p>It appears you don\'t have a PDF plugin for this browser. You can <a href={viewingAttachmentUrl} className="text-blue-600 hover:underline">click here to download the PDF file.</a></p>
                        </object>
                    ) : (
                        <img 
                            src={viewingAttachmentUrl} 
                            alt="Attachment" 
                            className={cn("transition-transform duration-200", isPanning ? 'cursor-grabbing' : 'cursor-grab')}
                            style={{ 
                                transform: `scale(${zoom}) translate(${translate.x}px, ${translate.y}px)`, 
                                maxWidth: 'none', 
                                maxHeight: 'none' 
                            }}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
