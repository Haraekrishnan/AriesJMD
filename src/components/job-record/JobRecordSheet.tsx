
'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Download, Clock, UserX, PlusCircle, ChevronsUpDown, ChevronDown, ChevronUp, MoreHorizontal, Info, Edit, Trash2, Lock, Unlock, ArrowUp, ArrowDown, Settings, Search } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, isAfter, isBefore, startOfToday, parseISO, isSameMonth, isValid, parse, isSameYear } from 'date-fns';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import AddJobCodeDialog from './AddJobCodeDialog';
import type { JobCode, ManpowerProfile, JobRecordPlant, EpNumberRecord } from '@/lib/types';
import EditJobCodeDialog from './EditJobCodeDialog';
import AddJobRecordPlantDialog from './AddJobRecordPlantDialog';
import { ScrollArea } from '../ui/scroll-area';
import { Alert } from '../ui/alert';

const implementationStartDate = new Date(2025, 9, 1); // October 2025 (Month is 0-indexed)

const OT_RESTRICTED_CODES = ['PH', 'L', 'ML', 'KD', 'OS', 'EP', 'PD', 'TR', 'ST', 'NWS', 'Q', 'X', 'OFF', 'S', 'RST', 'CQ'];


export default function JobRecordSheet() {
    const { user, manpowerProfiles, jobRecords, saveJobRecord, savePlantOrder, jobRecordPlants, projects, jobCodes, JOB_CODE_COLORS, deleteJobCode, can, lockJobRecordSheet, unlockJobRecordSheet, deleteJobRecordPlant } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(startOfToday());
    const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);
    const [isAddJobCodeOpen, setIsAddJobCodeOpen] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [editingJobCode, setEditingJobCode] = useState<JobCode | null>(null);
    const [activeTab, setActiveTab] = useState('Unassigned');
    const [searchTerm, setSearchTerm] = useState('');
    const [jobCodeSearchTerm, setJobCodeSearchTerm] = useState('');
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    const monthKey = format(currentMonth, 'yyyy-MM');
    const prevMonthKey = format(subMonths(currentMonth, 1), 'yyyy-MM');
    
    const [cellStates, setCellStates] = useState<Record<string, string>>({});
    
    useEffect(() => {
        const newStates: Record<string, string> = {};
        if (jobRecords[monthKey]?.records) {
            for (const profileId in jobRecords[monthKey].records) {
                const record = jobRecords[monthKey].records[profileId];
                if (record.days) {
                    for (const day in record.days) {
                        newStates[`${profileId}-${day}`] = record.days[day] || '';
                    }
                }
            }
        }
        setCellStates(newStates);
    }, [jobRecords, monthKey]);


    const handlePlantChange = (profileId: string, plantName: string) => {
        saveJobRecord(monthKey, profileId, null, plantName, 'plant');
        toast({
            title: 'Plant Changed',
            description: `${manpowerProfiles.find(p => p.id === profileId)?.name} moved to ${plantName}.`,
        });
    };
    
    const handleStatusChange = useCallback((employeeId: string, day: number, value: string) => {
      const parts = value.split('/');
      const code = (parts[0] || '').toUpperCase();
      const overtime = parts[1] ? parseFloat(parts[1]) : null;

      const isValidCode = jobCodes.some(jc => jc.code === code) || code === '';
  
      if (!isValidCode) {
          toast({
              title: "Invalid Job Code",
              description: `The code "${code}" is not a valid job code.`,
              variant: "destructive"
          });
          const previousRecord = jobRecords[monthKey]?.records?.[employeeId];
          const previousCode = previousRecord?.days?.[day] || '';
          const previousOvertime = previousRecord?.dailyOvertime?.[day];
          const previousValue = previousOvertime ? `${previousCode}/${previousOvertime}` : previousCode;
          setCellStates(prev => ({ ...prev, [`${employeeId}-${day}`]: previousValue }));
          return;
      }

      if (overtime !== null && (isNaN(overtime) || overtime < 0)) {
        toast({ title: "Invalid Overtime", description: "Overtime must be a positive number.", variant: "destructive" });
        return;
      }
  
      const isOtRestricted = OT_RESTRICTED_CODES.includes(code);

      if (isOtRestricted && overtime) {
        toast({ title: "Overtime Restricted", description: `Overtime cannot be added for job code "${code}".`, variant: "destructive" });
        saveJobRecord(monthKey, employeeId, day, code, 'status');
        saveJobRecord(monthKey, employeeId, day, null, 'dailyOvertime');
        return;
      }

      saveJobRecord(monthKey, employeeId, day, code, 'status');
      saveJobRecord(monthKey, employeeId, day, overtime, 'dailyOvertime');

    }, [monthKey, saveJobRecord, jobCodes, toast, jobRecords]);
    
    const handleSundayDutySave = (employeeId: string, value: string) => {
        const days = value === '' ? null : parseInt(value, 10);
        if (days !== null && !isNaN(days) && days >= 0) {
            saveJobRecord(monthKey, employeeId, days, 'sundayDuty', 'sundayDuty');
        } else if (value === '') {
             saveJobRecord(monthKey, employeeId, null, 'sundayDuty', 'sundayDuty');
        }
    };
    
    const plantProjects = useMemo(() => {
        return (jobRecordPlants || []).sort((a,b) => a.name.localeCompare(b.name));
    }, [jobRecordPlants]);

    useEffect(() => {
        if (plantProjects.length > 0 && !plantProjects.some(p => p.name === activeTab) && activeTab !== 'Unassigned') {
            setActiveTab('Unassigned');
        }
    }, [plantProjects, activeTab]);
    
    const allTabs = useMemo(() => ['Unassigned', ...plantProjects.map(p => p.name)], [plantProjects]);
    
    const isCurrentSheetLocked = jobRecords[monthKey]?.isLocked;

    const canEditSheet = useMemo(() => {
        if (!user) return false;
        if (user.role === 'Admin') return true;
        if (!can.manage_job_record) return false;
        return !isCurrentSheetLocked;
    }, [user, can.manage_job_record, isCurrentSheetLocked]);

    
    const filteredAndGroupedProfiles = useMemo(() => {
        const filtered = searchTerm
            ? manpowerProfiles.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            : manpowerProfiles;
        
        const groups: { [key: string]: ManpowerProfile[] } = {};
        const plantProjects = (jobRecordPlants || []).map(p => p.name);
        const availablePlants = new Set(plantProjects);
        availablePlants.add('Unassigned');

        availablePlants.forEach(p => groups[p] = []);

        filtered.forEach(profile => {
            const plantForCurrentMonth = jobRecords[monthKey]?.records?.[profile.id]?.plant;
            const plantForPrevMonth = jobRecords[prevMonthKey]?.records?.[profile.id]?.plant;
            const plantAssignment = plantForCurrentMonth ?? plantForPrevMonth ?? 'Unassigned';

            if (groups[plantAssignment]) {
                groups[plantAssignment].push(profile);
            } else {
                groups['Unassigned'].push(profile);
            }
        });

        if (!searchTerm) {
            Object.keys(groups).forEach(plantName => {
                const currentOrder = jobRecords[monthKey]?.plantsOrder?.[plantName];
                const prevOrder = jobRecords[prevMonthKey]?.plantsOrder?.[plantName];
                const order = currentOrder || prevOrder;

                groups[plantName].sort((a, b) => {
                    const plantForA_current = jobRecords[monthKey]?.records?.[a.id]?.plant;
                    const plantForA_prev = jobRecords[prevMonthKey]?.records?.[a.id]?.plant;
                    const a_isNew = plantForA_current && plantForA_current !== plantForA_prev && plantForA_prev !== undefined;

                    const plantForB_current = jobRecords[monthKey]?.records?.[b.id]?.plant;
                    const plantForB_prev = jobRecords[prevMonthKey]?.records?.[b.id]?.plant;
                    const b_isNew = plantForB_current && plantForB_current !== plantForB_prev && plantForB_prev !== undefined;
                    
                    if (a_isNew && !b_isNew) return 1;
                    if (!a_isNew && b_isNew) return -1;
                    
                    if (order && Array.isArray(order)) {
                        const indexA = order.indexOf(a.id);
                        const indexB = order.indexOf(b.id);
                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                        if (indexA !== -1) return -1;
                        if (indexB !== -1) return 1;
                    }
                    const originalAIndex = manpowerProfiles.findIndex(p => p.id === a.id);
                    const originalBIndex = manpowerProfiles.findIndex(p => p.id === b.id);
                    return originalAIndex - originalBIndex;
                });
            });
        }
        
        return groups;

    }, [manpowerProfiles, jobRecords, monthKey, prevMonthKey, searchTerm, jobRecordPlants]);

    
    const manDaysCountByCodeForCurrentTab = useMemo(() => {
        if (!jobCodes) return {};
        const counts: { [key: string]: number } = {};
        jobCodes.forEach(jc => counts[jc.code] = 0);

        const profilesInTab = searchTerm ? Object.values(filteredAndGroupedProfiles).flat() : (filteredAndGroupedProfiles[activeTab] || []);
        profilesInTab.forEach(p => {
            const record = jobRecords[monthKey]?.records?.[p.id];
            const days = record?.days || {};
            Object.values(days).forEach(code => {
                if (counts.hasOwnProperty(code as string)) {
                    counts[code as string]++;
                }
            });
        });
        return counts;
    }, [jobRecords, monthKey, activeTab, jobCodes, filteredAndGroupedProfiles, searchTerm]);

    const filteredJobCodes = useMemo(() => {
        if (!jobCodeSearchTerm) {
          return jobCodes;
        }
        const lowercasedFilter = jobCodeSearchTerm.toLowerCase();
        return jobCodes.filter(
          (jc) =>
            jc.code.toLowerCase().includes(lowercasedFilter) ||
            jc.details.toLowerCase().includes(lowercasedFilter) ||
            jc.jobNo?.toLowerCase().includes(lowercasedFilter)
        );
      }, [jobCodes, jobCodeSearchTerm]);

    
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
    
        allTabs.forEach(plant => {
            const profiles = filteredAndGroupedProfiles[plant];
            if (!profiles || profiles.length === 0) return;
    
            const ws_data: any[][] = [];
            ws_data.push([`Job Record for ${format(currentMonth, 'MMMM yyyy')} - Plant: ${plant}`]);
            ws_data.push([]);
            const dayHeadersExcel = Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1);
            const header = ['S.No', 'Name', ...dayHeadersExcel.map(String), 'Total OFF', 'Total Leave', 'Total ML', 'Over Time', 'Total Standby/Training', 'Total working Days', 'Total Rept/Office', 'Salary Days', 'Additional Sunday Duty'];
            ws_data.push(header);
    
            profiles.forEach((profile, rIndex) => {
                const record = jobRecords[monthKey]?.records?.[profile.id] || {};
                const employeeRecord = record.days || {};
                const dailyOvertime = record.dailyOvertime || {};
                const offCodes = ['OFF', 'PH', 'OS'];
                const leaveCodes = ['L', 'X', 'NWS'];
                const standbyCodes = ['ST', 'TR', 'EP', 'PD', 'Q'];
                const workCodes = jobCodes ? jobCodes.filter(jc => !['X', 'KD', 'Q', 'ST', 'NWS', 'R', 'OS', 'ML', 'L', 'TR', 'PD', 'EP', 'OFF', 'PH', 'S', 'CQ', 'RST'].includes(jc.code)).map(jc => jc.code) : [];
                const summary = dayHeadersExcel.reduce((acc, day) => {
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
    
                const rowData: any[] = [rIndex + 1, profile.name];
                dayHeadersExcel.forEach(day => {
                    const code = employeeRecord[day] || '';
                    const overtimeForDay = dailyOvertime[day];
                    const cell: { v: string; c?: any[] } = { v: code };
                
                    if (overtimeForDay && overtimeForDay > 0) {
                      cell.c = [{ a: "Overtime", t: `${overtimeForDay}hr`, hidden: true }];
                    }
                    rowData.push(cell);
                });
                rowData.push(summary.offDays, summary.leaveDays, summary.medicalLeave, totalOvertime, summary.standbyTraining, summary.workDays, summary.reptOffice, salaryDays, additionalSundays);
                ws_data.push(rowData);
            });
    
            const ws = XLSX.utils.aoa_to_sheet(ws_data, { cellStyles: true });
            
            ws_data.forEach((row, r) => {
              if (r < 3) return;
              row.forEach((cellData, c) => {
                  if (c >= 2 && c < dayHeadersExcel.length + 2) {
                      const code = (typeof cellData === 'object' && cellData !== null && 'v' in cellData) ? cellData.v : cellData;
                      const cellAddress = XLSX.utils.encode_cell({ r, c });
                      if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: code };

                      const colorInfo = JOB_CODE_COLORS[code as string];
                      if (colorInfo?.excelFill) {
                          ws[cellAddress].s = {
                             fill: { patternType: "solid", fgColor: colorInfo.excelFill.fgColor },
                             font: colorInfo.excelFill.font || {}
                         };
                      }
                  }
              });
            });
            
            ws['!cols'] = [{ wch: 5 }, { wch: 25 }, ...dayHeadersExcel.map(() => ({ wch: 7 })), { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 20 }];
    
            const legendStartRow = ws_data.length + 2;
            XLSX.utils.sheet_add_aoa(ws, [[]], { origin: -1 }); 
            XLSX.utils.sheet_add_aoa(ws, [['Job Code Legend & Man-Days Count']], { origin: -1 });
            XLSX.utils.sheet_add_aoa(ws, [['Code', 'Job Details', 'Man-Days']], { origin: -1 });
            
            if (jobCodes) {
              const manDaysCount = jobCodes.reduce((acc, jc) => {
                  acc[jc.code] = 0;
                  return acc;
              }, {} as {[key: string]: number});
              
              profiles.forEach(p => {
                  const record = jobRecords[monthKey]?.records?.[p.id];
                  const days = record?.days || {};
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
    
    const handleMoveRow = (profileId: string, direction: 'up' | 'down') => {
        const currentProfiles = filteredAndGroupedProfiles[activeTab];
        if (!currentProfiles) return;

        const index = currentProfiles.findIndex(p => p.id === profileId);
        if (index === -1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= currentProfiles.length) return;

        const newOrder = [...currentProfiles];
        const [movedItem] = newOrder.splice(index, 1);
        newOrder.splice(targetIndex, 0, movedItem);

        const newOrderIds = newOrder.map(p => p.id);
        savePlantOrder(monthKey, activeTab, newOrderIds);
    };

    const dayHeaders = Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1);

    const handleDeleteJobCode = (id: string) => {
        deleteJobCode(id);
        toast({ title: 'Job Code Deleted', variant: 'destructive' });
    }

    const handleDeletePlant = (plant: JobRecordPlant) => {
        deleteJobRecordPlant(plant.id);
        setActiveTab('Unassigned');
        toast({title: 'Plant Deleted', variant: 'destructive'});
    }

    const searchResults = searchTerm ? Object.values(filteredAndGroupedProfiles).flat() : [];

    const toggleRow = (id: string) => {
      setExpandedRows(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
              newSet.delete(id);
          } else {
              newSet.add(id);
          }
          return newSet;
      });
  };

    return (
        <TooltipProvider>
            <datalist id="jobcodes-datalist">
                {jobCodes && jobCodes.map(jc => (
                    <option key={jc.id} value={jc.code} />
                ))}
            </datalist>
            <div className="grid grid-rows-[auto,1fr,auto] h-full overflow-hidden bg-card border rounded-lg">
                {/* --- FROZEN HEADER --- */}
                <div className="p-4 border-b bg-card shrink-0 space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-lg font-semibold flex items-center gap-2">
                                {format(currentMonth, 'MMMM yyyy')}
                                {isCurrentSheetLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                            </span>
                            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <div className="relative ml-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name..."
                                    className="pl-9 w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={exportToExcel}><Download className="mr-2 h-4 w-4"/>Export All to Excel</Button>
                            {user?.role === 'Admin' && (
                                <>
                                    <Button onClick={() => setIsAddJobCodeOpen(true)} variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Add Job Code</Button>
                                    <Button onClick={() => setIsAddPlantOpen(true)} variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Add New Plant</Button>
                                </>
                            )}
                            {can.manage_job_record && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => setIsReorderMode(!isReorderMode)}><Settings className="h-4 w-4" /></Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Toggle Reorder Mode</p></TooltipContent>
                            </Tooltip>
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
                     <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="w-full justify-start h-auto">
                            {allTabs.map(plantName => {
                                const plant = plantProjects.find(p => p.name === plantName);
                                return (
                                <div key={plantName} className="relative group">
                                    <TabsTrigger value={plantName}>{plantName}</TabsTrigger>
                                    {user?.role === 'Admin' && plant && plantName !== 'Unassigned' && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive/80 text-destructive-foreground hover:bg-destructive hidden group-hover:flex">
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Plant "{plant.name}"?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will move all assigned employees to "Unassigned". This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeletePlant(plant)}>Delete Plant</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            )})}
                        </TabsList>
                     </Tabs>
                </div>

                {/* --- SCROLLABLE TABLE --- */}
                 <div className="flex-1 overflow-auto relative">
                    <Table className="min-w-full border-collapse">
                         <thead className="sticky top-0 bg-card z-30">
                            <TableRow>
                                <TableHead className="sticky left-0 bg-card z-50 border-r" style={{ minWidth: '120px', width: '120px' }}>S.No</TableHead>
                                <TableHead className="sticky bg-card z-50 border-r" style={{ left: '120px', minWidth: '200px', width: '200px' }}>Name / EP No.</TableHead>
                                <TableHead className="sticky bg-card z-50 border-r" style={{ left: '320px', minWidth: '150px', width: '150px' }}>Plant</TableHead>
                                {dayHeaders.map(day => (
                                    <TableHead key={day} className="text-center min-w-[70px] border-r">
                                        {day}
                                    </TableHead>
                                ))}
                                <TableHead className="text-center min-w-[150px] border-r">Total OFF</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Total Leave</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Total ML</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Total OT</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Total Standby/Training</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Total Working Days</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Total Rept/Office</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Salary Days</TableHead>
                                <TableHead className="text-center min-w-[150px]">Additional Sunday Duty</TableHead>
                            </TableRow>
                        </thead>
                        <TableBody>
                            {(searchTerm ? searchResults : (filteredAndGroupedProfiles[activeTab] || [])).map((profile, index) => {
                                const isExpanded = expandedRows.has(profile.id);
                                const record = jobRecords[monthKey]?.records?.[profile.id] || {};
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
                                }, { offDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0, workDays: 0, leaveDays: 0 });

                                const totalOvertime = Object.values(dailyOvertime).reduce((sum, hours) => sum + (hours || 0), 0);
                                const additionalSundays = record.additionalSundayDuty || 0;
                                const salaryDays = additionalSundays + summary.offDays + summary.medicalLeave + summary.standbyTraining + summary.reptOffice + summary.workDays;

                                return (
                                    <React.Fragment key={profile.id}>
                                        <TableRow>
                                            <TableCell className="sticky left-0 bg-card z-20 flex items-center border-r" style={{width: '120px'}}>
                                                <div className="flex items-center">
                                                    <Button variant="ghost" size="icon" className="w-8 p-0 h-8 hover:bg-transparent" onClick={() => toggleRow(profile.id)}>
                                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </Button>
                                                    <span className="w-6 text-center">{index + 1}</span>
                                                    {isReorderMode && (
                                                        <div className="flex flex-col">
                                                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleMoveRow(profile.id, 'up')} disabled={index === 0}><ArrowUp className="h-3 w-3"/></Button>
                                                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleMoveRow(profile.id, 'down')} disabled={index === (filteredAndGroupedProfiles[activeTab]?.length || 0) - 1}><ArrowDown className="h-3 w-3"/></Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="sticky bg-card z-20 font-medium whitespace-nowrap border-r" style={{ left: '120px', width: '200px' }}>
                                                <p>{profile.name}</p>
                                                <p className="text-xs text-muted-foreground">{profile.epNumber || 'No EP No.'}</p>
                                            </TableCell>
                                            <TableCell className="sticky bg-card z-20 font-medium whitespace-nowrap border-r" style={{ left: '320px', width: '150px' }}>
                                            <Select defaultValue={record.plant || 'Unassigned'} onValueChange={(value) => handlePlantChange(profile.id, value)} disabled={!canEditSheet}>
                                                    <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Unassigned">Unassigned</SelectItem>
                                                        {plantProjects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            {dayHeaders.map(day => {
                                                const cellId = `${profile.id}-${day}`;
                                                const cellValue = employeeRecord[day] || '';
                                                const overtimeValue = dailyOvertime[day];
                                                const fullValue = overtimeValue ? `${cellValue}/${overtimeValue}` : cellValue;

                                                const colorInfo = JOB_CODE_COLORS[cellValue.toUpperCase() as string] || {};

                                                return (
                                                    <TableCell 
                                                        key={day} 
                                                        className={cn(
                                                            "p-0 text-center relative min-w-[70px] border-r h-10",
                                                            cellValue ? colorInfo.bg : 'bg-transparent',
                                                            cellValue ? colorInfo.text : 'text-foreground'
                                                        )}
                                                    >
                                                        <div className="relative w-full h-full flex items-center justify-center">
                                                            {editingCell === cellId ? (
                                                              <Input
                                                                  id={cellId}
                                                                  type="text"
                                                                  list="jobcodes-datalist"
                                                                  defaultValue={fullValue}
                                                                  onBlur={(e) => {
                                                                      handleStatusChange(profile.id, day, e.target.value);
                                                                      setEditingCell(null);
                                                                  }}
                                                                  onKeyDown={(e) => { if(e.key === 'Enter') e.currentTarget.blur()}}
                                                                  autoFocus
                                                                  className="w-full h-full text-center font-bold rounded-none border-0 focus:ring-1 focus:ring-offset-0 focus:ring-ring bg-background text-foreground"
                                                                  style={{ boxShadow: 'none' }}
                                                                  disabled={!canEditSheet}
                                                              />
                                                            ) : (
                                                              <button
                                                                onClick={() => canEditSheet && setEditingCell(cellId)}
                                                                disabled={!canEditSheet}
                                                                className="w-full h-full flex items-center justify-center font-bold relative"
                                                              >
                                                                  {cellValue}
                                                                  {overtimeValue > 0 && <Clock className="absolute right-0.5 top-0.5 h-3 w-3 text-white mix-blend-difference" />}
                                                              </button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="text-center font-bold border-r min-w-[150px]">{summary.offDays}</TableCell>
                                            <TableCell className="text-center font-bold border-r min-w-[150px]">{summary.leaveDays}</TableCell>
                                            <TableCell className="text-center font-bold border-r min-w-[150px]">{summary.medicalLeave}</TableCell>
                                            <TableCell className="text-center min-w-[150px] border-r font-bold">{totalOvertime}</TableCell>
                                            <TableCell className="text-center font-bold border-r min-w-[150px]">{summary.standbyTraining}</TableCell>
                                            <TableCell className="text-center font-bold border-r min-w-[150px]">{summary.workDays}</TableCell>
                                            <TableCell className="text-center font-bold border-r min-w-[150px]">{summary.reptOffice}</TableCell>
                                            <TableCell className="text-center font-bold border-r min-w-[150px]">{salaryDays}</TableCell>
                                            <TableCell className="text-center min-w-[150px]">
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
                                                <TableCell colSpan={3}></TableCell>
                                                {dayHeaders.map(day => {
                                                    const cellId = `${profile.id}-${day}-ot`;
                                                    const jobCode = employeeRecord[day] || '';
                                                    const isOtDisabled = !canEditSheet || !jobCode || OT_RESTRICTED_CODES.includes(jobCode.toUpperCase());
                                                    return (
                                                        <TableCell key={cellId} className="p-0 min-w-[70px] border-r h-10">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className='w-full h-full'>
                                                                      <Input 
                                                                          type="number" 
                                                                          defaultValue={dailyOvertime[day] || ''}
                                                                          onBlur={(e) => handleOvertimeChange(profile.id, day, e.target.value)}
                                                                          className="w-full h-full text-center rounded-none border-0 bg-muted/50 focus:ring-1 focus:ring-offset-0 focus:ring-ring"
                                                                          placeholder="OT"
                                                                          min="0"
                                                                          disabled={isOtDisabled}
                                                                      />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                {isOtDisabled && (
                                                                    <TooltipContent>
                                                                        <p>Enter a valid job code to add overtime.</p>
                                                                    </TooltipContent>
                                                                )}
                                                            </Tooltip>
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell colSpan={9}></TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                    </div>
                <div className="shrink-0 z-20 border-t bg-card">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="p-3 text-sm font-semibold hover:no-underline">
                                <div className="flex items-center gap-2"><Info className="h-4 w-4"/>Job Code Legend & Man-Days Count for {searchTerm ? "All Plants" : activeTab}</div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="p-4 pt-0">
                                    <div className="relative mb-4 max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search code, description, or job no..."
                                            className="pl-9"
                                            value={jobCodeSearchTerm}
                                            onChange={(e) => setJobCodeSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <ScrollArea className="h-48">
                                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-4">
                                        {filteredJobCodes.map(jc => (
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
                                                                <AlertDialogHeader><AlertDialogTitle>Delete Job Code {jc.code}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteJobCode(jc.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                       </div>
                                    </ScrollArea>
                               </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
            <AddJobRecordPlantDialog isOpen={isAddPlantOpen} setIsOpen={setIsAddPlantOpen} />
            <AddJobCodeDialog isOpen={isAddJobCodeOpen} setIsOpen={setIsAddJobCodeOpen} />
            {editingJobCode && <EditJobCodeDialog isOpen={!!editingJobCode} setIsOpen={() => setEditingJobCode(null)} jobCode={editingJobCode} />}
        </TooltipProvider>
    );
}

    
