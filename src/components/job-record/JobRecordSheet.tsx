'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Download, Clock, UserX, PlusCircle } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, getDaySuffix } from 'date-fns';
import { JOB_CODES, JOB_CODE_COLORS } from '@/lib/job-codes';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';


export default function JobRecordSheet() {
    const { user, manpowerProfiles, jobRecords, saveJobRecord, addProject, projects } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const { toast } = useToast();
    
    const monthKey = format(currentMonth, 'yyyy-MM');

    const dayHeaders = useMemo(() => 
        Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1), 
    [currentMonth]);

    const jobRecordForMonth = useMemo(() => {
        return jobRecords[monthKey]?.records || {};
    }, [jobRecords, monthKey]);

    const handleStatusChange = (employeeId: string, day: number, code: string, overtimeHours?: number) => {
        saveJobRecord(monthKey, employeeId, day, code, 'status');
        if (overtimeHours !== undefined) {
             saveJobRecord(monthKey, employeeId, day, overtimeHours, 'dailyOvertime');
        }
    };
    
    const handlePlantChange = (employeeId: string, plant: string) => {
        saveJobRecord(monthKey, employeeId, 0, plant, 'plant');
    }
    
    const handleSundayDutySave = (employeeId: string, value: string) => {
        const days = value === '' ? 0 : parseInt(value, 10);
        if (!isNaN(days) && days >= 0) {
            saveJobRecord(monthKey, employeeId, days, '', 'sundayDuty');
        }
    };

    const plantProjects = useMemo(() => {
      const plants = new Set<string>();
      projects.forEach(p => {
        if (p.isPlant) plants.add(p.name);
      });
      manpowerProfiles.forEach(profile => {
        if (profile.plant) plants.add(profile.plant);
      });
      return Array.from(plants).sort();
    }, [projects, manpowerProfiles]);

    const handleAddPlant = () => {
        const newPlantName = prompt("Enter new plant name:");
        if (newPlantName && newPlantName.trim() !== '') {
            addProject(newPlantName, true);
            toast({ title: "Plant Added", description: `You can now assign employees to ${newPlantName}.`});
        }
    };

    const handleRemoveFromPlant = (employeeId: string) => {
        saveJobRecord(monthKey, employeeId, 0, 'Unassigned', 'plant');
        toast({ title: 'Employee Unassigned', description: 'The employee has been moved to the Unassigned group.' });
    };

    const exportToExcel = (plant: string) => {
        const wb = XLSX.utils.book_new();

        const profiles = groupedProfiles[plant];
        if (!profiles || profiles.length === 0) {
            toast({ variant: 'destructive', title: 'No Data', description: `No employees assigned to ${plant} to export.` });
            return;
        }

        const sheetData: (string|number)[][] = [];
        sheetData.push([`Job Record for ${format(currentMonth, 'MMMM yyyy')} - Plant: ${plant}`]);
        sheetData.push([]); 

        const header = [
            'S.No', 'Name', ...dayHeaders, 'Total OFF', 'Total Leave', 'Total ML', 'Over Time', 'Total Standby/Training',
            'Total working Days', 'Total Rept/Office', 'Salary Days', 'Additional Sunday Duty'
        ];
        sheetData.push(header);

        profiles.forEach((profile, index) => {
            const record = jobRecordForMonth[profile.id] || {};
            const employeeRecord = record.days || {};
            const dailyOvertime = record.dailyOvertime || {};
            
            const offCodes = ['OFF', 'PH', 'OS'];
            const leaveCodes = ['L', 'X', 'NWS'];
            const standbyCodes = ['ST', 'TR', 'EP', 'PD', 'Q'];
            const workCodes = ["MTP","ZPT","ZE","MCT","ZCU","ZRS","ZPB","Z","RGR","ZC","ZP","DC","DRS","SP","DCR","SWS","DD","RRT","DA","ZPS","C2L","DP","SWR","SWP","NT","C2C","DR","2CL","C2M","IIR","PVS","MTM","MTB","MTT","MTF","MTS","KD","ZI","ZS","ZB","DRR","MTJ", "MTC", "CRY", "MTI", "MTL", "SWB"];
            
            const summary = dayHeaders.reduce((acc, day) => {
                const code = employeeRecord[day];
                if (offCodes.includes(code)) acc.offDays++;
                if (leaveCodes.includes(code)) acc.leaveDays++;
                if (code === 'ML') acc.medicalLeave++;
                if (standbyCodes.includes(code)) acc.standbyTraining++;
                if (code === 'R') acc.reptOffice++;
                if (workCodes.includes(code)) acc.workDays++;
                return acc;
            }, { offDays: 0, leaveDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0, workDays: 0 });

            const totalOvertime = Object.values(dailyOvertime).reduce((sum, hours) => sum + (hours || 0), 0);
            const additionalSundays = jobRecords[monthKey]?.additionalSundayDuty?.[profile.id] || 0;
            const salaryDays = additionalSundays + summary.offDays + summary.medicalLeave + summary.standbyTraining + summary.reptOffice + summary.workDays;
            
            const row: (string | number)[] = [index + 1, profile.name];
            dayHeaders.forEach(day => {
                row.push(employeeRecord[day] || '');
            });
            row.push(summary.offDays, summary.leaveDays, summary.medicalLeave, totalOvertime, summary.standbyTraining, summary.workDays, summary.reptOffice, salaryDays, additionalSundays);
            sheetData.push(row);
        });

        // Add legend and man-days count
        sheetData.push([]);
        sheetData.push(['Job Code Legend & Man-Days Count']);
        sheetData.push(['Code', 'Job Details', 'Man-Days']);
        
        const manDaysCount = JOB_CODES.reduce((acc, jc) => {
            acc[jc.code] = 0;
            return acc;
        }, {} as {[key: string]: number});
        
        profiles.forEach(p => {
            const days = jobRecordForMonth[p.id]?.days || {};
            Object.values(days).forEach(code => {
                if (manDaysCount.hasOwnProperty(code)) {
                    manDaysCount[code]++;
                }
            });
        });

        JOB_CODES.forEach(jc => {
            sheetData.push([jc.code, jc.details, manDaysCount[jc.code] || 0]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        ws['!cols'] = [{ wch: 5 }, { wch: 25 }];
        dayHeaders.forEach(() => ws['!cols']?.push({ wch: 5 }));
        header.slice(3 + dayHeaders.length).forEach(() => ws['!cols']?.push({ wch: 10 }));
        
        profiles.forEach((profile, rIndex) => {
            const employeeRecord = jobRecordForMonth[profile.id]?.days || {};
            dayHeaders.forEach((day, cIndex) => {
                const code = employeeRecord[day] || '';
                const colorInfo = JOB_CODE_COLORS[code];
                const cellAddress = XLSX.utils.encode_cell({ r: rIndex + 3, c: cIndex + 2 });
                
                if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: code };
                
                if (colorInfo?.excelFill) {
                     ws[cellAddress].s = {
                        fill: { patternType: "solid", fgColor: colorInfo.excelFill.fgColor },
                        font: colorInfo.excelFill.font || {}
                    };
                }
            });
        });

        XLSX.utils.book_append_sheet(wb, ws, plant);
        XLSX.writeFile(wb, `JobRecord_${plant}_${monthKey}.xlsx`);
    };

    const groupedProfiles = useMemo(() => {
        const groups: { [key: string]: typeof manpowerProfiles } = { 'Unassigned': [] };
        plantProjects.forEach(p => groups[p] = []);

        manpowerProfiles.forEach(profile => {
            const plant = profile.plant || 'Unassigned';
            if (groups[plant]) {
                groups[plant].push(profile);
            } else {
                if (!groups['Unassigned']) groups['Unassigned'] = [];
                groups['Unassigned'].push(profile);
            }
        });
        Object.values(groups).forEach(group => group?.sort((a, b) => a.name.localeCompare(b.name)));
        return groups;
    }, [manpowerProfiles, plantProjects]);
    
    const renderTableForPlant = (plantName: string) => {
         const profiles = groupedProfiles[plantName] || [];
         if (profiles.length === 0) {
            return <div className="text-center p-8 text-muted-foreground">No employees assigned to this plant.</div>
        }
        return (
            <>
            <div className="overflow-x-auto">
                <Table className="min-w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 bg-card z-10 w-[50px]">S.No</TableHead>
                            <TableHead className="sticky left-[50px] bg-card z-10 min-w-[200px]">Name</TableHead>
                            <TableHead className="sticky left-[250px] bg-card z-10 min-w-[150px]">Plant</TableHead>
                            {dayHeaders.map(day => (
                                <TableHead key={day} className="text-center">{day}</TableHead>
                            ))}
                            <TableHead className="text-center min-w-[100px]">Total OFF</TableHead>
                            <TableHead className="text-center min-w-[100px]">Total Leave</TableHead>
                             <TableHead className="text-center min-w-[100px]">Total ML</TableHead>
                             <TableHead className="text-center min-w-[120px]">Over Time</TableHead>
                             <TableHead className="text-center min-w-[150px]">Total Standby/Training</TableHead>
                             <TableHead className="text-center min-w-[120px]">Total Working Days</TableHead>
                             <TableHead className="text-center min-w-[150px]">Total Rept/Office</TableHead>
                             <TableHead className="text-center min-w-[120px]">Salary Days</TableHead>
                             <TableHead className="text-center min-w-[150px]">Additional Sunday Duty</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles.map((profile, index) => {
                            const record = jobRecordForMonth[profile.id] || {};
                            const employeeRecord = record.days || {};
                            const dailyOvertime = record.dailyOvertime || {};
                            
                            const offCodes = ['OFF', 'PH', 'OS'];
                            const leaveCodes = ['L', 'X', 'NWS'];
                            const standbyCodes = ['ST', 'TR', 'EP', 'PD', 'Q'];
                            const workCodes = ["MTP","ZPT","ZE","MCT","ZCU","ZRS","ZPB","Z","RGR","ZC","ZP","DC","DRS","SP","DCR","SWS","DD","RRT","DA","ZPS","C2L","DP","SWR","SWP","NT","C2C","DR","2CL","C2M","IIR","PVS","MTM","MTB","MTT","MTF","MTS","KD","ZI","ZS","ZB","DRR","MTJ", "MTC", "CRY", "MTI", "MTL", "SWB"];
                            
                            const summary = dayHeaders.reduce((acc, day) => {
                                const code = employeeRecord[day];
                                if (offCodes.includes(code)) acc.offDays++;
                                if (leaveCodes.includes(code)) acc.leaveDays++;
                                if (code === 'ML') acc.medicalLeave++;
                                if (standbyCodes.includes(code)) acc.standbyTraining++;
                                if (code === 'R') acc.reptOffice++;
                                if (workCodes.includes(code)) acc.workDays++;
                                return acc;
                            }, { offDays: 0, leaveDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0, workDays: 0 });

                            const totalOvertime = Object.values(dailyOvertime).reduce((sum, hours) => sum + (hours || 0), 0);
                            const additionalSundays = jobRecords[monthKey]?.additionalSundayDuty?.[profile.id] || 0;
                            const salaryDays = additionalSundays + summary.offDays + summary.medicalLeave + summary.standbyTraining + summary.reptOffice + summary.workDays;

                            return (
                                <TableRow key={profile.id}>
                                    <TableCell className="sticky left-0 bg-card z-10">{index + 1}</TableCell>
                                    <TableCell className="sticky left-[50px] bg-card z-10 font-medium whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {profile.name}
                                            {user?.role === 'Admin' && plantName !== 'Unassigned' && (
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10"><UserX className="h-4 w-4"/></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Remove {profile.name} from {plantName}?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will move the employee to the "Unassigned" group for all months.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleRemoveFromPlant(profile.id)}>Confirm</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="sticky left-[250px] bg-card z-10">
                                        <Select value={profile.plant || 'Unassigned'} onValueChange={(value) => handlePlantChange(profile.id, value)}>
                                            <SelectTrigger><SelectValue placeholder="Assign..." /></SelectTrigger>
                                            <SelectContent>
                                                {[...plantProjects, 'Unassigned'].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    {dayHeaders.map(day => {
                                        const code = employeeRecord[day] || '';
                                        const overtimeForDay = dailyOvertime[day];
                                        const colorInfo = JOB_CODE_COLORS[code] || {};
                                        return (
                                          <TableCell key={day} className="p-0 text-center relative">
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <div
                                                  className={cn(
                                                    'w-16 h-10 flex items-center justify-center font-bold cursor-pointer relative',
                                                    code ? colorInfo.bg : 'bg-transparent',
                                                    code ? colorInfo.text : 'text-foreground'
                                                  )}
                                                >
                                                  {code}
                                                  {overtimeForDay && (
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <div className="absolute bottom-0 right-0 h-3 w-3">
                                                            <Clock className="h-full w-full text-blue-500" />
                                                        </div>
                                                      </TooltipTrigger>
                                                      <TooltipContent><p>{overtimeForDay} hours OT</p></TooltipContent>
                                                    </Tooltip>
                                                  )}
                                                </div>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-2">
                                                <DailyRecordEditor
                                                  initialCode={code}
                                                  initialOvertime={overtimeForDay}
                                                  onSave={(newCode, newOvertime) => handleStatusChange(profile.id, day, newCode, newOvertime)}
                                                />
                                              </PopoverContent>
                                            </Popover>
                                          </TableCell>
                                        );
                                      })}
                                    <TableCell className="text-center font-bold">{summary.offDays}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.leaveDays}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.medicalLeave}</TableCell>
                                    <TableCell className="text-center font-bold">{totalOvertime}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.standbyTraining}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.workDays}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.reptOffice}</TableCell>
                                    <TableCell className="text-center font-bold">{salaryDays}</TableCell>
                                    <TableCell className="text-center">
                                        <Input
                                            type="text"
                                            defaultValue={jobRecords[monthKey]?.additionalSundayDuty?.[profile.id] || ''}
                                            onBlur={(e) => handleSundayDutySave(profile.id, e.target.value)}
                                            className="w-16 h-8 text-center"
                                            placeholder="0"
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            </>
        );
    }

    const defaultTabs = ["SEZ", "DTA", "MTF", "JPC", "SOLAR", "Unassigned"];
    const allTabs = Array.from(new Set([...defaultTabs, ...plantProjects])).sort();

    return (
        <TooltipProvider>
            <div>
                <div className="flex justify-between items-center p-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                     {user?.role === 'Admin' && (
                        <Button onClick={handleAddPlant} variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Add New Plant</Button>
                    )}
                </div>

                <Tabs defaultValue={allTabs[0]} className="w-full">
                    <TabsList>
                        {allTabs.map(plant => <TabsTrigger key={plant} value={plant}>{plant}</TabsTrigger>)}
                    </TabsList>
                    {allTabs.map(plant => (
                        <TabsContent key={plant} value={plant}>
                            <Button onClick={() => exportToExcel(plant)} className="m-4"><Download className="mr-2 h-4 w-4"/>Export {plant} Sheet</Button>
                            {renderTableForPlant(plant)}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </TooltipProvider>
    );
}


interface DailyRecordEditorProps {
    initialCode: string;
    initialOvertime?: number;
    onSave: (code: string, overtime?: number) => void;
}

function DailyRecordEditor({ initialCode, initialOvertime, onSave }: DailyRecordEditorProps) {
    const [code, setCode] = useState(initialCode);
    const [overtime, setOvertime] = useState(initialOvertime);

    const handleSave = () => {
        onSave(code.toUpperCase(), overtime);
    };

    return (
        <div className="space-y-4">
            <div>
                <Label>Job Code</Label>
                <div className="grid grid-cols-5 gap-1">
                    {JOB_CODES.map(jc => (
                        <Button
                            key={jc.code}
                            variant={code === jc.code ? "default" : "outline"}
                            size="sm"
                            className="h-8"
                            onClick={() => setCode(jc.code)}
                        >
                            {jc.code}
                        </Button>
                    ))}
                </div>
            </div>
            <div>
                <Label>Overtime Hours (Optional)</Label>
                <Input 
                    type="number" 
                    value={overtime || ''}
                    onChange={(e) => setOvertime(Number(e.target.value))}
                    placeholder="e.g., 2.5"
                />
            </div>
            <Button onClick={handleSave} className="w-full">Set</Button>
        </div>
    );
}

```
  </change>
  <change>
    <file>src/lib/types.ts</file>
    <content><![CDATA[

export type Broadcast = {
  id: string;
  message: string;
  creatorId: string;
  createdAt: string; // ISO String
  expiryDate: string; // ISO String
  recipientUserIds: string[];
  recipientRoles: string[];
  dismissedBy: string[];
};

export type JobRecord = {
  id: string; // YYYY-MM
  records: {
    [employeeId: string]: {
      days: { [day: number]: string }; // day: 1-31, value: code
      dailyOvertime?: { [day: number]: number }; // New field for daily OT
    };
  };
  additionalSundayDuty?: { [employeeId: string]: number };
};

export type PpeInwardRecord = {
  id: string;
  date: string; // ISO string
  ppeType: 'Coverall' | 'Safety Shoes';
  sizes?: { [size: string]: number };
  quantity?: number;
  addedByUserId: string;
};

export type IgpOgpItem = {
  id: string;
  itemName: string;
  quantity: number;
  uom: string;
};

export type IgpOgpRecord = {
  id: string;
  type: 'IGP' | 'OGP';
  mrnNumber: string;
  date: string; // ISO String
  location: string;
  materialInBy?: string;
  materialOutBy?: string;
  items: IgpOgpItem[];
  creatorId: string;
};

export type Vendor = {
  id: string;
  name: string;
  category?: string;
  ownerId?: string;
  totalSpend?: number;
  last30Days?: number;
  nextPaymentAmount?: number;
  nextPaymentDate?: string; // ISO String
  frequency?: 'Monthly' | 'Rolling' | 'Annual';
  ownerDept?: string;
  icon?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  gstNumber?: string;
};

export type PaymentStatus = 'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'Cancelled' | 'Email Sent' | 'Amount Listed Out';

export type Payment = {
    id: string;
    requesterId: string;
    approverId?: string;
    vendorId: string;
    amount: number;
    date: string; // ISO String
    durationFrom?: string; // ISO String
    durationTo?: string; // ISO String
    emailSentDate?: string; // ISO String
    status: PaymentStatus;
    remarks?: string;
    comments: Comment[];
    purchaseRegisterId?: string;
};

export type PurchaseItem = {
    id: string;
    name: string;
    uom: string;
    unitRate: number;
    quantity: number;
    tax: number;
};

export type PurchaseRegister = {
    id: string;
    vendorId: string;
    creatorId: string;
    date: string; // ISO String
    items: PurchaseItem[];
    subTotal: number;
    totalTax: number;
    grandTotal: number;
    durationFrom: string | null;
    durationTo: string | null;
    emailSentDate: string | null;
    poNumber?: string;
};


export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  status?: 'active' | 'locked' | 'deactivated';
  password?: string;
  supervisorId?: string;
  projectId?: string;
  planningScore?: number;
};

export type PasswordResetRequest = {
  id: string;
  userId: string;
  email: string;
  date: string; // ISO String
  status: 'pending' | 'handled';
  resetCode?: string;
};

export type UnlockRequest = {
  id: string;
  userId: string;
  userName: string;
  date: string; // ISO String
  status: 'pending' | 'resolved';
};

export type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Pending Approval' | 'Overdue' | 'Completed';
export type Priority = 'Low' | 'Medium' | 'High';
export type ApprovalState = 'none' | 'pending' | 'approved' | 'returned';

export type Subtask = {
    userId: string;
    status: TaskStatus;
    updatedAt: string; // ISO String
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string; // DEPRECATED in favor of assigneeIds
  assigneeIds: string[];
  subtasks?: { [userId: string]: Subtask };
  creatorId: string;
  dueDate: string; // ISO String
  priority: Priority;
  comments: Comment[];
  participants?: string[];
  lastUpdated?: string;
  viewedBy?: { [key: string]: boolean };
  requiresAttachmentForCompletion?: boolean;
  attachment?: {
    name: string;
    url: string; 
  };
  approvalState: ApprovalState;
  approverId?: string;
  pendingStatus?: TaskStatus | null;
  previousStatus?: TaskStatus | null;
  completionDate?: string;
  pendingAssigneeId?: string | null;
  viewedByApprover?: boolean;
  isViewedByAssignee?: boolean;
  viewedByRequester?: boolean;
};

export type Frequency = 'once' | 'daily' | 'weekly' | 'weekends' | 'monthly' | 'daily-except-sundays';

export type PlannerEvent = {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO String of the start date
  userId: string; // Who the event is for
  creatorId: string; // Who created the event
  frequency: Frequency;
  comments: Comment[];
};


export type AchievementStatus = 'pending' | 'approved' | 'rejected';

export type Achievement = {
  id: string;
  userId: string;
  title: string;
  description:string;
  points: number;
  date: string; // YYYY-MM-DD
  type: 'system' | 'manual';
  status: AchievementStatus;
  awardedById?: string; // Manager's user ID for manual awards
};


export const ALL_PERMISSIONS = [
  'manage_users',
  'manage_roles',
  'manage_projects',
  'manage_branding',
  'manage_tasks',
  'manage_planner',
  'manage_incidents',
  'manage_achievements',
  'manage_vehicles',
  'manage_manpower',
  'manage_manpower_list',
  'approve_store_requests',
  'manage_inventory',
  'manage_equipment_status',
  'manage_announcements',
  'view_performance_reports',
  'view_activity_logs',
  'manage_accommodation',
  'log_manpower',
  'manage_job_schedule',
  'prepare_master_schedule',
  'manage_ppe_stock',
  'view_ppe_requests',
  'manage_ppe_request',
  'view_internal_store_request',
  'manage_store_requests',
  'manage_vendors',
  'manage_payments',
  'manage_purchase_register',
  'manage_password_resets',
  'manage_igp_ogp',
  'manage_feedback',
  'manage_user_lock_status',
  'create_broadcast',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export type Role = string;

export type RoleDefinition = {
  id: string;
  name: string;
  permissions: readonly Permission[] | Permission[];
  isEditable?: boolean;
};

export type Project = {
  id: string;
  name: string;
  isPlant?: boolean; // New field to distinguish job record plants
};

export type ActivityLog = {
  id: string;
  userId: string;
  action: string;
  timestamp: string; // ISO string
  details?: string;
};

export type Vehicle = {
  id:string;
  vehicleNumber: string;
  driverId: string;
  vendorName?: string;
  seatingCapacity: number;
  vapAccess?: string[];
  vapValidity?: string; // YYYY-MM-DD
  insuranceValidity?: string; // YYYY-MM-DD
  fitnessValidity?: string; // YYYY-MM-DD
  taxValidity?: string; // YYYY-MM-DD
  puccValidity?: string; // YYYY-MM-DD
};

export type Driver = {
  id: string;
  name: string;
  photo: string;
  licenseNumber: string;
  epNumber?: string;
  sdpNumber?: string;
  epExpiry?: string;
  medicalExpiry?: string;
  safetyExpiry?: string;
  sdpExpiry?: string;
  woExpiry?: string;
  labourContractExpiry?: string;
  wcPolicyExpiry?: string;
  licenseExpiry?: string;
};

export type IncidentStatus = 'New' | 'Under Investigation' | 'Action Pending' | 'Resolved' | 'Closed';

export type Comment = {
  id: string;
  userId: string;
  text: string;
  date: string; // ISO String
  isRead?: boolean;
};

export type IncidentReport = {
    id: string;
    reporterId: string;
    reportTime: string; // ISO string
    incidentTime: string; // ISO string
    projectId: string;
    unitArea: string;
    incidentDetails: string;
    status: IncidentStatus;
    reportedToUserIds: string[];
    isPublished: boolean;
    comments: Comment[];
    lastUpdated: string; // ISO string
    viewedBy: { [key: string]: boolean }; // Object of user IDs
};


export type ManpowerTrade = {
  id: string;
  name: string;
  trade: string;
  company: string;
};

export type Trade = string;
export const RA_TRADES: Trade[] = ['RA Level 1', 'RA Level 2', 'RA Level 3', 'RA + Supervisor'];
export const MANDATORY_DOCS = ['Aadhar Card', 'CV', 'Pan Card', 'Personal Details', 'Form A', 'Induction', 'Signed Contract', 'Medical Report', 'First Aid Certificate'];

export type MemoRecord = {
    id: string;
    type: 'Memo' | 'Warning Letter';
    date: string; // ISO String
    reason: string;
    issuedBy: string;
};

export type PpeHistoryRecord = {
  id: string;
  ppeType: 'Coverall' | 'Safety Shoes';
  size: string;
  quantity?: number;
  issueDate: string; // ISO String
  requestType: 'New' | 'Replacement';
  remarks?: string;
  storeComment?: string;
  requestId?: string;
  issuedById?: string;
  approverId?: string;
};

export type ManpowerProfile = {
  id: string;
  name: string;
  trade: Trade;
  status: 'Working' | 'On Leave' | 'Resigned' | 'Terminated' | 'Left the Project';
  photo?: string;
  
  // Personal Details
  mobileNumber?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string; // Date of Birth
  aadharNumber?: string;
  uanNumber?: string;
  coverallSize?: string;
  shoeSize?: string;

  // Identifiers
  hardCopyFileNo?: string;
  documentFolderUrl?: string;
  
  // Work Details
  workOrderNumber?: string;
  labourLicenseNo?: string;
  eic?: string; 
  joiningDate?: string; // ISO
  plant?: string; // New field for job record plant assignment

  // Policy & Card Details
  wcPolicyNumber?: string;
  cardCategory?: string;
  cardType?: string;
  epNumber?: string;
  
  // Documents and Skills
  documents: ManpowerDocument[];
  skills?: Skill[];

  // Validity Dates
  passIssueDate?: string; // ISO
  workOrderExpiryDate?: string; // ISO, replaces woValidity
  wcPolicyExpiryDate?: string; // ISO, replaces wcPolicyValidity
  labourLicenseExpiryDate?: string; // ISO, new
  medicalExpiryDate?: string; // ISO
  safetyExpiryDate?: string; // ISO
  irataValidity?: string; // ISO
  firstAidExpiryDate?: string; // ISO
  contractValidity?: string; // ISO
  
  // Leave and Termination
  leaveHistory?: { [key: string]: LeaveRecord };
  memoHistory?: MemoRecord[];
  ppeHistory?: { [key: string]: PpeHistoryRecord };

  terminationDate?: string; // ISO
  resignationDate?: string; // ISO
  feedback?: string;

  // Remarks
  remarks?: string;
};

export type DocumentStatus = 'Pending' | 'Collected' | 'Submitted' | 'Received';

export type ManpowerDocument = {
    name: string;
    details?: string;
    status: DocumentStatus;
};

export type LeaveRecord = {
    id: string;
    leaveType?: 'Emergency' | 'Annual';
    leaveStartDate: string; // ISO String
    plannedEndDate?: string; // ISO String
    leaveEndDate?: string; // ISO String
    rejoinedDate?: string; // ISO String
    remarks?: string;
};

export type Skill = {
    name: string;
    details: string;
    link?: string;
    validity?: string; // ISO String
};

export type ManpowerLog = {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  countIn: number;
  personInName?: string;
  countOut: number;
  personOutName?: string;
  countOnLeave: number;
  personOnLeaveName?: string;
  reason: string;
  updatedBy: string;
  yesterdayCount: number;
  total: number;
};

export type InternalRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Issued' | 'Partially Issued' | 'Disputed' | 'Partially Approved';
export type InternalRequestItem = {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    remarks: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Issued';
};
export type InternalRequest = {
  id: string;
  requesterId: string;
  date: string; // YYYY-MM-DD
  items: InternalRequestItem[];
  status: InternalRequestStatus; // This will now be a summary status
  approverId?: string;
  comments: Comment[];
  viewedByRequester: boolean;
  acknowledgedByRequester?: boolean;
};

export type ManagementRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export type ManagementRequest = {
    id: string;
    requesterId: string;
    recipientId: string;
    approverId?: string;
    date: string;
    subject: string;
    body: string;
    status: ManagementRequestStatus;
    comments: Comment[];
    viewedByRequester: boolean;
}

export type PpeRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Issued' | 'Disputed';

export type PpeRequest = {
  id: string;
  requesterId: string;
  manpowerId: string;
  ppeType: 'Coverall' | 'Safety Shoes';
  size: string;
  quantity?: number;
  requestType: 'New' | 'Replacement';
  remarks?: string;
  date: string; // ISO
  status: PpeRequestStatus;
  approverId?: string;
  issuedById?: string;
  comments: Comment[];
  viewedByRequester: boolean;
  attachmentUrl?: string;
  eligibility?: {
    eligible: boolean;
    reason: string;
  } | null;
  newRequestJustification?: string;
};


export type InventoryItemStatus = 'In Use' | 'In Store' | 'Damaged' | 'Expired';

export type InventoryItem = {
  id: string;
  name: string;
  serialNumber: string;
  ariesId?: string;
  chestCrollNo?: string;
  status: InventoryItemStatus;
  projectId: string;
  inspectionDate?: string; // ISO string
  inspectionDueDate?: string; // ISO string
  tpInspectionDueDate?: string; // ISO string
  lastUpdated: string; // ISO string
  remarks?: string;
};

export type UTMachine = {
  id: string;
  machineName: string;
  serialNumber: string;
  projectId: string;
  unit: string;
  calibrationDueDate: string; // ISO String
  probeDetails: string;
  cableDetails: string;
  status: string;
};

export type DftMachine = {
    id: string;
    machineName: string;
    serialNumber: string;
    projectId: string;
    unit: string;
    calibrationDueDate: string; // ISO String
    probeDetails: string;
    cableDetails: string;
    status: string;
};

export type DigitalCamera = {
  id: string;
  make: string;
  model: string;
  serialNumber: string;
  allottedTo: string; // User ID
  status: string;
  projectId: string;
  remarks?: string;
};

export type Anemometer = {
  id: string;
  make: string;
  model: string;
  serialNumber: string;
  allottedTo: string; // User ID
  status: string;
  projectId: string;
  calibrationDueDate?: string; // ISO String
  remarks?: string;
};

export type MobileSimStatus = 'Active' | 'Inactive' | 'Returned';

export type MobileSim = {
  id: string;
  type: 'Mobile' | 'SIM';
  provider: string;
  number: string;
  allottedToUserId: string;
  allotmentDate: string; // ISO string
  projectId: string;
  status: MobileSimStatus;
  remarks?: string;
};

export type LaptopDesktop = {
    id: string;
    make: string;
    model: string;
    serialNumber: string;
    allottedTo: string; // User ID
    ariesId?: string;
    password?: string;
    remarks?: string;
};

export type OtherEquipment = {
    id: string;
    equipmentName: string;
    serialNumber: string;
    allottedTo: string; // User ID
    remarks?: string;
};

export type MachineLog = {
    id: string;
    machineId: string;
    userName: string;
    loggedByUserId: string;
    date: string; // YYYY-MM-DD
    fromTime: string; // HH:mm
    toTime: string; // HH:mm
    location: string;
    jobDescription: string;
    status: 'Active' | 'Idle';
    reason?: string;
    attachmentUrl?: string;
    startingKm?: number;
    endingKm?: number;
};

export type CertificateRequestType = 'Calibration Certificate' | 'TP Certificate' | 'Inspection Certificate';
export type CertificateRequestStatus = 'Pending' | 'Completed' | 'Rejected';

export type CertificateRequest = {
  id: string;
  requesterId: string;
  requestType: CertificateRequestType;
  itemId?: string; // For InventoryItem
  utMachineId?: string; // For UTMachine
  dftMachineId?: string; // For DftMachine
  status: CertificateRequestStatus;
  requestDate: string; // ISO String
  completionDate?: string; // ISO String
  remarks?: string;
  comments: Comment[];
  viewedByRequester?: boolean;
};

export type AnnouncementStatus = 'pending' | 'approved' | 'rejected' | 'returned';

export type Announcement = {
  id: string;
  title: string;
  content: string;
  creatorId: string;
  approverId: string;
  status: AnnouncementStatus;
  createdAt: string; // ISO String
  comments: {
    userId: string;
    text: string;
    date: string;
  }[];
  dismissedBy?: string[];
  notifyAll?: boolean;
};

export type DailyPlannerComment = {
  id: string; // composite key: `${YYYY-MM-DD}_${plannerUserId}`
  plannerUserId: string; // The user whose planner this comment belongs to
  day: string; // YYYY-MM-DD
  comments: Comment[];
  lastUpdated: string;
  viewedBy: { [key: string]: boolean };
};

export type Bed = {
  id: string;
  bedNumber: string;
  bedType: 'Bunk' | 'Single';
  occupantId?: string; // ManpowerProfile ID
};

export type Room = {
  id: string;
  roomNumber: string;
  beds: Bed[];
};

export type Building = {
  id: string;
  buildingNumber: string;
  rooms: Room[];
};

export type JobScheduleItem = {
  id: string;
  manpowerIds: string[];
  jobType: string;
  jobNo: string;
  projectVesselName: string;
  location: string;
  reportingTime: string; // HH:mm
  clientContact: string;
  vehicleId?: string;
  remarks?: string;
};

export type JobSchedule = {
  id: string; // composite key: `${projectId}_${YYYY-MM-DD}`
  projectId: string;
  date: string; // YYYY-MM-DD
  supervisorId: string;
  items: JobScheduleItem[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
  isLocked?: boolean;
};

export type PpeStock = {
  id: 'coveralls' | 'safetyShoes';
  name: string;
  sizes?: { [size: string]: number }; // For coveralls
  quantity?: number; // For safety shoes
  lastUpdated: string; // ISO
};

export type FeedbackStatus = 'New' | 'In Progress' | 'Resolved';

export type Feedback = {
  id: string;
  userId: string;
  subject: string;
  message: string;
  date: string; // ISO String
  status: FeedbackStatus;
  viewedBy?: { [key: string]: boolean };
};
