

'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Download, Clock, UserX, PlusCircle, ChevronsUpDown, ChevronDown, ChevronUp, MoreHorizontal, Info, Edit, Trash2, Lock, Unlock } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, isAfter, isBefore, startOfToday } from 'date-fns';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import AddJobRecordPlantDialog from './AddJobCodeDialog';
import AddJobCodeDialog from './AddJobCodeDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { JobCode } from '@/lib/types';
import EditJobCodeDialog from './EditJobCodeDialog';

const implementationStartDate = new Date(2024, 9, 1); // October 2024 (Month is 0-indexed)

export default function JobRecordSheet() {
    const { user, manpowerProfiles, jobRecords, saveJobRecord, jobRecordPlants, projects, jobCodes, JOB_CODE_COLORS, deleteJobCode, can, lockJobRecordSheet, unlockJobRecordSheet } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(startOfToday() < implementationStartDate ? implementationStartDate : startOfToday());
    const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);
    const [isAddJobCodeOpen, setIsAddJobCodeOpen] = useState(false);
    const [editingJobCode, setEditingJobCode] = useState<JobCode | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState('Unassigned');
    const { toast } = useToast();
    
    const monthKey = format(currentMonth, 'yyyy-MM');
    const prevMonthKey = format(subMonths(currentMonth, 1), 'yyyy-MM');
    
    const canGoToPreviousMonth = useMemo(() => {
      const firstDayOfCurrentMonth = startOfMonth(currentMonth);
      return isAfter(firstDayOfCurrentMonth, implementationStartDate);
    }, [currentMonth]);


    const isCurrentSheetLocked = useMemo(() => {
        return jobRecords[monthKey]?.isLocked || false;
    }, [jobRecords, monthKey]);

    const canEditSheet = useMemo(() => {
        if (!user) return false;
        if (user.role === 'Admin') return true;
        return can.manage_job_record && !isCurrentSheetLocked;
    }, [user, can.manage_job_record, isCurrentSheetLocked]);

    const dayHeaders = useMemo(() => 
        Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1), 
    [currentMonth]);

    const jobRecordForMonth = useMemo(() => {
        return jobRecords[monthKey]?.records || {};
    }, [jobRecords, monthKey]);

    const handleStatusChange = useCallback((employeeId: string, day: number, code: string) => {
        const upperCaseCode = code.toUpperCase();
        saveJobRecord(monthKey, employeeId, day, upperCaseCode, 'status');
    }, [monthKey, saveJobRecord, jobCodes, toast]);
    
    const handleOvertimeChange = (employeeId: string, day: number, hours: number | string) => {
        const numericHours = Number(hours);
        const finalHours = isNaN(numericHours) || numericHours <= 0 ? null : numericHours;
        saveJobRecord(monthKey, employeeId, day, finalHours, 'dailyOvertime');
    };
    
    const handlePlantChange = (employeeId: string, plant: string) => {
       saveJobRecord(monthKey, employeeId, 0, plant, 'plant');
    }
    
    const handleSundayDutySave = (employeeId: string, value: string) => {
        const days = value === '' ? null : parseInt(value, 10);
        if (days !== null && !isNaN(days) && days >= 0) {
            saveJobRecord(monthKey, employeeId, days, 'sundayDuty', 'sundayDuty');
        } else if (value === '') {
             saveJobRecord(monthKey, employeeId, null, 'sundayDuty', 'sundayDuty');
        }
    };
    
    const plantProjects = useMemo(() => {
        const plantsFromJobRecords = (jobRecordPlants || []).map(p => p.name);
        return Array.from(new Set([...plantsFromJobRecords])).sort();
    }, [jobRecordPlants]);

    useEffect(() => {
        if (plantProjects.length > 0 && !plantProjects.includes(activeTab) && activeTab !== 'Unassigned') {
            setActiveTab(plantProjects[0]);
        }
    }, [plantProjects, activeTab]);

    const handleRemoveFromPlant = (employeeId: string) => {
        saveJobRecord(monthKey, employeeId, 0, 'Unassigned', 'plant');
        toast({ title: 'Employee Unassigned', description: 'The employee has been moved to the Unassigned group.' });
    };

    const toggleRow = (profileId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(profileId)) {
                newSet.delete(profileId);
            } else {
                newSet.add(profileId);
            }
            return newSet;
        });
    };
    
    const groupedProfiles = useMemo(() => {
        const groups: { [key: string]: typeof manpowerProfiles } = {};
        const availablePlants = new Set(plantProjects);
        availablePlants.add('Unassigned');

        availablePlants.forEach(p => groups[p] = []);

        const prevMonthRecord = jobRecords[prevMonthKey]?.records || {};

        manpowerProfiles.forEach(profile => {
            const plantForCurrentMonth = jobRecordForMonth[profile.id]?.plant;
            const plantForPrevMonth = prevMonthRecord[profile.id]?.plant;
            const defaultPlant = profile.plant;
            
            const plantAssignment = plantForCurrentMonth ?? plantForPrevMonth ?? defaultPlant ?? 'Unassigned';

            if (groups[plantAssignment]) {
                groups[plantAssignment].push(profile);
            } else {
                groups['Unassigned'].push(profile);
            }
        });
        Object.values(groups).forEach(group => group?.sort((a, b) => a.name.localeCompare(b.name)));
        return groups;
    }, [manpowerProfiles, plantProjects, jobRecordForMonth, prevMonthKey, jobRecords]);
    
    const allTabs = Array.from(new Set(['Unassigned', ...plantProjects])).sort();
    
    const manDaysCountByCodeForCurrentTab = useMemo(() => {
        if (!jobCodes) return {};
        const counts: { [key: string]: number } = {};
        jobCodes.forEach(jc => counts[jc.code] = 0);

        const profilesInTab = groupedProfiles[activeTab] || [];
        profilesInTab.forEach(p => {
            const days = jobRecordForMonth[p.id]?.days || {};
            Object.values(days).forEach(code => {
                if (counts.hasOwnProperty(code as string)) {
                    counts[code as string]++;
                }
            });
        });
        return counts;
    }, [jobRecordForMonth, activeTab, jobCodes, groupedProfiles]);
    
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        allTabs.forEach(plant => {
            const profiles = groupedProfiles[plant];
            if (!profiles || profiles.length === 0) {
                return; // Skip empty sheets
            }

            const sheetData: (string|number)[][] = [];
            sheetData.push([`Job Record for ${format(currentMonth, 'MMMM yyyy')} - Plant: ${plant}`]);
            sheetData.push([]); 

            const header = [
                'S.No', 'Name', ...dayHeaders, 'Total OFF', 'Total Leave', 'Total ML', 'Over Time', 'Total Standby/Training',
                'Total working Days', 'Total Rept/Office', 'Salary Days', 'Additional Sunday Duty'
            ];
            sheetData.push(header);

            profiles.forEach((profile, rIndex) => {
                const record = jobRecordForMonth[profile.id] || {};
                const employeeRecord = record.days || {};
                const dailyOvertime = record.dailyOvertime || {};
                
                const offCodes = ['OFF', 'PH', 'OS'];
                const leaveCodes = ['L', 'X', 'NWS'];
                const standbyCodes = ['ST', 'TR', 'EP', 'PD', 'Q'];
                const workCodes = jobCodes ? jobCodes.filter(jc => !['X', 'KD', 'Q', 'ST', 'NWS', 'R', 'OS', 'ML', 'L', 'TR', 'PD', 'EP', 'OFF', 'PH', 'S', 'CQ', 'RST'].includes(jc.code)).map(jc => jc.code) : [];
                
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
                const additionalSundays = record.additionalSundayDuty || 0;
                const salaryDays = additionalSundays + summary.offDays + summary.medicalLeave + summary.standbyTraining + summary.reptOffice + summary.workDays;
                
                const row: (string | number)[] = [rIndex + 1, profile.name];
                dayHeaders.forEach(day => {
                    row.push(employeeRecord[day] || '');
                });
                row.push(summary.offDays, summary.leaveDays, summary.medicalLeave, totalOvertime, summary.standbyTraining, summary.workDays, summary.reptOffice, salaryDays, additionalSundays);
                sheetData.push(row);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            ws['!cols'] = [{ wch: 5 }, { wch: 25 }, ...dayHeaders.map(() => ({ wch: 7 })), { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 20 }];
            
            profiles.forEach((profile, rIndex) => {
                const dailyOvertime = jobRecordForMonth[profile.id]?.dailyOvertime || {};
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

                    const overtimeForDay = dailyOvertime[day];
                    if (overtimeForDay && overtimeForDay > 0) {
                        const comment = { t: `Overtime Hours: ${overtimeForDay}` };
                        if (!ws[cellAddress].c) ws[cellAddress].c = [];
                        ws[cellAddress].c.push(comment);
                    }
                });
            });

            // Add legend and man-days count after all data rows
            const legendStartRow = sheetData.length + 2;
            XLSX.utils.sheet_add_aoa(ws, [[]], { origin: -1 }); // Spacer row
            XLSX.utils.sheet_add_aoa(ws, [['Job Code Legend & Man-Days Count']], { origin: -1 });
            XLSX.utils.sheet_add_aoa(ws, [['Code', 'Job Details', 'Man-Days']], { origin: -1 });
            
            if (jobCodes) {
              const manDaysCount = jobCodes.reduce((acc, jc) => {
                  acc[jc.code] = 0;
                  return acc;
              }, {} as {[key: string]: number});
              
              profiles.forEach(p => {
                  const days = jobRecordForMonth[p.id]?.days || {};
                  Object.values(days).forEach(code => {
                      if (manDaysCount.hasOwnProperty(code as string)) {
                          manDaysCount[code as string]++;
                      }
                  });
              });

              jobCodes.forEach(jc => {
                 XLSX.utils.sheet_add_aoa(ws, [[jc.code, jc.details, manDaysCount[jc.code] || 0]], { origin: -1 });
              });
            }

            XLSX.utils.book_append_sheet(wb, ws, plant);
        });

        if(wb.SheetNames.length > 0) {
            XLSX.writeFile(wb, `JobRecord_${monthKey}.xlsx`);
        } else {
            toast({ variant: 'destructive', title: 'No Data', description: `No employees assigned to any plant to export.` });
        }
    };
    
    const renderTableForPlant = (plantName: string) => {
         const profiles = groupedProfiles[plantName] || [];
         if (profiles.length === 0) {
            return <div className="text-center p-8 text-muted-foreground">No employees assigned to this plant.</div>
        }
        return (
            <div className="overflow-x-auto">
                <Table className="min-w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 bg-card z-10 w-[50px]"></TableHead>
                            <TableHead className="sticky left-[50px] bg-card z-10 min-w-[200px]">Name</TableHead>
                            <TableHead className="sticky left-[250px] bg-card z-10 min-w-[150px]">Plant</TableHead>
                            {dayHeaders.map(day => (
                                <TableHead key={day} className="text-center min-w-[100px]">
                                    {day}
                                </TableHead>
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
                            
                            const workCodes = jobCodes ? jobCodes.filter(jc => !['X', 'KD', 'Q', 'ST', 'NWS', 'R', 'OS', 'ML', 'L', 'TR', 'PD', 'EP', 'OFF', 'PH', 'S', 'CQ', 'RST'].includes(jc.code)).map(jc => jc.code) : [];
                            const offCodes = ['OFF', 'PH', 'OS'];
                            const leaveCodes = ['L', 'X', 'NWS'];
                            const standbyCodes = ['ST', 'TR', 'EP', 'PD', 'Q'];

                            const summary = dayHeaders.reduce((acc, day) => {
                                const code = employeeRecord[day];
                                if (offCodes.includes(code)) acc.offDays++;
                                else if (leaveCodes.includes(code)) acc.leaveDays++;
                                else if (code === 'ML') acc.medicalLeave++;
                                else if (standbyCodes.includes(code)) acc.standbyTraining++;
                                else if (code === 'R') acc.reptOffice++;
                                else if (workCodes.includes(code)) acc.workDays++;
                                return acc;
                            }, { offDays: 0, leaveDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0, workDays: 0 });

                            const totalOvertime = Object.values(dailyOvertime).reduce((sum, hours) => sum + (hours || 0), 0);
                            const additionalSundays = record.additionalSundayDuty || 0;
                            const salaryDays = additionalSundays + summary.offDays + summary.medicalLeave + summary.standbyTraining + summary.reptOffice + summary.workDays;
                            const isExpanded = expandedRows.has(profile.id);

                            return (
                                <React.Fragment key={profile.id}>
                                <TableRow>
                                    <TableCell className="sticky left-0 bg-card z-10">
                                         <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => toggleRow(profile.id)}>
                                            {index + 1}
                                            {isExpanded ? <ChevronUp className="h-4 w-4 ml-2"/> : <ChevronDown className="h-4 w-4 ml-2"/>}
                                        </Button>
                                    </TableCell>
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
                                                            <AlertDialogDescription>This will move the employee to the "Unassigned" group for this month only.</AlertDialogDescription>
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
                                        <Select value={jobRecordForMonth[profile.id]?.plant || 'Unassigned'} onValueChange={(value) => handlePlantChange(profile.id, value)} disabled={!canEditSheet}>
                                            <SelectTrigger><SelectValue placeholder="Assign..." /></SelectTrigger>
                                            <SelectContent>
                                                {allTabs.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    {dayHeaders.map(day => {
                                        const code = employeeRecord[day] || '';
                                        const overtimeForDay = dailyOvertime[day] || 0;
                                        const colorInfo = JOB_CODE_COLORS[code] || {};

                                        return (
                                            <TableCell key={day} className="p-0 text-center relative min-w-[100px]">
                                                <div className="relative h-10 flex items-center justify-center">
                                                    <Input
                                                        type="text"
                                                        list="jobcodes-datalist"
                                                        defaultValue={code}
                                                        onBlur={(e) => handleStatusChange(profile.id, day, e.target.value)}
                                                        className={cn(
                                                            "w-full h-full text-center font-bold rounded-none border-0 focus:ring-1 focus:ring-offset-0 focus:ring-ring",
                                                            code ? colorInfo.bg : 'bg-transparent',
                                                            code ? colorInfo.text : 'text-foreground'
                                                        )}
                                                        style={{ boxShadow: 'none' }}
                                                        disabled={!canEditSheet}
                                                    />
                                                     {overtimeForDay > 0 && (
                                                        <Tooltip>
                                                        <TooltipTrigger className="absolute right-1 top-1 h-3 w-3">
                                                            <Clock className="h-full w-full text-blue-500" />
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>{overtimeForDay} hours OT</p></TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
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
                                            type="number"
                                            defaultValue={record.additionalSundayDuty || ''}
                                            onBlur={(e) => handleSundayDutySave(profile.id, e.target.value)}
                                            className="w-16 h-8 text-center"
                                            placeholder="0"
                                            disabled={!canEditSheet}
                                        />
                                    </TableCell>
                                </TableRow>
                                {isExpanded && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="bg-muted/50 text-right font-semibold text-xs pr-4">Overtime Hours</TableCell>
                                        {dayHeaders.map(day => (
                                            <TableCell key={`ot-${day}`} className="p-0 bg-muted/50">
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    defaultValue={dailyOvertime[day] || ''}
                                                    onBlur={(e) => handleOvertimeChange(profile.id, day, e.target.value)}
                                                    className="w-full h-8 text-center border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-ring"
                                                    disabled={!canEditSheet}
                                                />
                                            </TableCell>
                                        ))}
                                        <TableCell colSpan={9} className="bg-muted/50"></TableCell>
                                    </TableRow>
                                )}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    }
    
    const handleDeleteJobCode = (id: string) => {
        deleteJobCode(id);
        toast({ title: 'Job Code Deleted', variant: 'destructive' });
    }

    return (
        <TooltipProvider>
             <datalist id="jobcodes-datalist">
                {jobCodes && jobCodes.map(jc => (
                    <option key={jc.id} value={jc.code} />
                ))}
            </datalist>
            <div>
                <div className="flex flex-wrap justify-between items-center p-4 gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} disabled={!canGoToPreviousMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-semibold flex items-center gap-2">
                            {format(currentMonth, 'MMMM yyyy')}
                            {isCurrentSheetLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                        </span>
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button onClick={exportToExcel}><Download className="mr-2 h-4 w-4"/>Export All to Excel</Button>
                        {user?.role === 'Admin' && (
                            <>
                                <Button onClick={() => setIsAddJobCodeOpen(true)} variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Add Job Code</Button>
                                <Button onClick={() => setIsAddPlantOpen(true)} variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Add New Plant</Button>
                            </>
                        )}
                        {can.manage_job_record && !isCurrentSheetLocked && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive"><Lock className="mr-2 h-4 w-4" /> Lock Sheet</Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Lock Job Record Sheet?</AlertDialogTitle><AlertDialogDescription>Locking this sheet will prevent further edits by non-admin users. This should only be done when the month's record is final.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => lockJobRecordSheet(monthKey)}>Confirm Lock</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                         {user?.role === 'Admin' && isCurrentSheetLocked && (
                            <Button variant="secondary" onClick={() => unlockJobRecordSheet(monthKey)}>
                                <Unlock className="mr-2 h-4 w-4" /> Unlock Sheet
                            </Button>
                        )}
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList>
                        {allTabs.map(plant => <TabsTrigger key={plant} value={plant}>{plant}</TabsTrigger>)}
                    </TabsList>
                    {allTabs.map(plant => (
                        <TabsContent key={plant} value={plant}>
                            {renderTableForPlant(plant)}
                        </TabsContent>
                    ))}
                </Tabs>
                <Accordion type="single" collapsible className="w-full mt-4">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="p-3 bg-muted/50 rounded-md text-sm font-semibold">
                            <div className="flex items-center gap-2"><Info className="h-4 w-4"/>Job Code Legend & Man-Days Count for {activeTab}</div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                            {jobCodes && jobCodes.map(jc => (
                                <div key={jc.id} className="flex items-start gap-4 text-xs">
                                    <div className="font-bold w-12">{jc.code}</div>
                                    <div className="flex-1">
                                        <p>{jc.details}</p>
                                        {jc.jobNo && <p className="text-muted-foreground">Job No: {jc.jobNo}</p>}
                                    </div>
                                    <div className="font-semibold">{manDaysCountByCodeForCurrentTab[jc.code] || 0}</div>
                                    {user?.role === 'Admin' && (
                                        <div className="flex">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingJobCode(jc)}><Edit className="h-3 w-3"/></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80"><Trash2 className="h-3 w-3"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Job Code {jc.code}?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteJobCode(jc.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    )}
                                </div>
                            ))}
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
            <AddJobRecordPlantDialog isOpen={isAddPlantOpen} setIsOpen={setIsAddPlantOpen} />
            <AddJobCodeDialog isOpen={isAddJobCodeOpen} setIsOpen={setIsAddJobCodeOpen} />
            {editingJobCode && <EditJobCodeDialog isOpen={!!editingJobCode} setIsOpen={() => setEditingJobCode(null)} jobCode={editingJobCode} />}
        </TooltipProvider>
    );
}



